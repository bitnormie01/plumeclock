// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeClock} from "../src/PlumeClock.sol";
import {MitigationFund} from "../src/MitigationFund.sol";
import {
    Status, RootKind, SourceRecord, Reobservation, Attestation, DisputeClaim, Ticket, Bond
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

/// @notice Drives random pledge / withdraw / open / respond / resolve / dispute / slash / warp
///         sequences, keeps ghost balances, and snapshots every ticket the moment it closes.
contract PlumeHandler is Test {
    PlumeClock public immutable clock;
    address internal immutable feeder;
    address internal immutable arbiter;
    uint256 public ghostBondSum;
    uint256 public ghostSlashed;
    bytes32[] public closedIds;
    mapping(bytes32 ticketId => bytes32 snapshotHash) public closedHash;

    SourceRecord[] internal recs;
    bytes32[] internal leaves;
    bytes32 public root;
    bytes32[4] public sources = [bytes32("SRC_0"), bytes32("SRC_1"), bytes32("SRC_2"), bytes32("SRC_3")];
    address[3] internal operators;
    uint256[3] internal keys;

    constructor(PlumeClock clock_, address feeder_, address arbiter_) {
        clock = clock_;
        feeder = feeder_;
        arbiter = arbiter_;
        for (uint256 i = 0; i < 3; i++) {
            (operators[i], keys[i]) = makeAddrAndKey(string(abi.encodePacked("op", vm.toString(i))));
        }
        for (uint256 s = 0; s < 4; s++) {
            for (uint64 d = 0; d < 2; d++) {
                SourceRecord memory rec = Fixtures.record(sources[s], 1_700_000_000 + d * 1000, uint32(1000 + s));
                recs.push(rec);
                leaves.push(clock.hashSourceRecord(rec));
            }
        }
        root = MerkleHelper.root(leaves);
    }

    function sourceCount() external pure returns (uint256) {
        return 4;
    }

    function closedCount() external view returns (uint256) {
        return closedIds.length;
    }

    function _idFor(uint256 seed) internal view returns (bytes32) {
        uint256 i = seed % recs.length;
        return clock.ticketIdFor(recs[i].sourceId, recs[i].lastPlumeAt);
    }

    function _find(bytes32 id) internal view returns (bool found, Ticket memory t) {
        Ticket[] memory page = clock.getTickets(0, 64);
        for (uint256 k = 0; k < page.length; k++) {
            if (page[k].id == id) return (true, page[k]);
        }
    }

    function _keyOf(address operator) internal view returns (uint256 key) {
        for (uint256 o = 0; o < 3; o++) {
            if (operators[o] == operator) key = keys[o];
        }
    }

    function _recordClosed(bytes32 id) internal {
        if (closedHash[id] != bytes32(0)) return;
        closedIds.push(id);
        closedHash[id] = keccak256(abi.encode(clock.getTicket(id)));
    }

    function pledge(uint256 opSeed, uint256 srcSeed, uint256 amount) external {
        address op = operators[opSeed % 3];
        bytes32 src = sources[srcSeed % 4];
        amount = bound(amount, clock.minBond(), 0.01 ether);
        Bond memory b = clock.getBond(src);
        if (b.operator != address(0) && b.operator != op) return;
        vm.deal(op, op.balance + amount);
        vm.prank(op);
        clock.pledge{value: amount}(src);
        ghostBondSum += amount;
    }

    function withdraw(uint256 srcSeed) external {
        bytes32 src = sources[srcSeed % 4];
        Bond memory b = clock.getBond(src);
        if (b.operator == address(0) || clock.activeBondedTicket(src) != bytes32(0)) return;
        vm.prank(b.operator);
        clock.withdrawBond(src);
        ghostBondSum -= b.amount;
    }

    function open(uint256 recSeed) external {
        uint256 i = recSeed % recs.length;
        try clock.openTicket(root, recs[i], MerkleHelper.proof(leaves, leaves[i])) {} catch {}
    }

    function respond(uint256 recSeed) external {
        bytes32 id = _idFor(recSeed);
        (bool found, Ticket memory t) = _find(id);
        if (!found || t.status != Status.Open || t.operator == address(0) || block.timestamp > t.deadline) return;
        if (t.reopenCount >= clock.MAX_REOPENS()) return;
        Attestation memory att = Attestation({ticketId: id, cause: "c", action: "a", evidenceHash: bytes32(0)});
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_keyOf(t.operator), clock.attestationDigest(att));
        clock.respond(id, att, abi.encodePacked(r, s, v));
    }

    function resolve(uint256 recSeed) external {
        bytes32 id = _idFor(recSeed);
        (bool found, Ticket memory t) = _find(id);
        if (!found || t.status != Status.Responded) return;
        if (block.timestamp <= t.respondedAt) vm.warp(t.respondedAt + 1);
        Reobservation memory obs =
            Reobservation({sourceId: t.sourceId, observedAt: uint64(block.timestamp), plumeDetected: false, basis: "inv"});
        bytes32 obsRoot = clock.hashReobservation(obs);
        if (clock.rootInfo(obsRoot).kind == RootKind.None) {
            vm.prank(feeder);
            clock.postRoot(obsRoot, RootKind.Reobservation, "invariant replay");
        }
        clock.resolve(id, obsRoot, obs, new bytes32[](0));
        _recordClosed(id);
    }

    function disputeAndSettle(uint256 recSeed, bool upheld) external {
        bytes32 id = _idFor(recSeed);
        (bool found, Ticket memory t) = _find(id);
        if (!found || t.status != Status.Open || t.operator == address(0) || block.timestamp > t.deadline) return;
        DisputeClaim memory claim = DisputeClaim({ticketId: id, reason: "misattributed", evidenceHash: bytes32(0)});
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_keyOf(t.operator), clock.disputeDigest(claim));
        clock.dispute(id, claim, abi.encodePacked(r, s, v));
        vm.prank(arbiter);
        clock.settleDispute(id, upheld);
        if (upheld) _recordClosed(id);
    }

    function slash(uint256 recSeed) external {
        uint256 i = recSeed % recs.length;
        bytes32 id = clock.ticketIdFor(recs[i].sourceId, recs[i].lastPlumeAt);
        uint256 amount = clock.getBond(recs[i].sourceId).amount;
        try clock.slash(id) {
            ghostBondSum -= amount;
            ghostSlashed += amount;
            _recordClosed(id);
        } catch {}
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1, 400));
    }
}

contract PlumeClockInvariantTest is Test {
    PlumeClock internal clock;
    MitigationFund internal fund;
    PlumeHandler internal handler;

    function setUp() public {
        vm.warp(1_800_000_000);
        address feeder = makeAddr("feeder");
        address arbiter = makeAddr("arbiter");
        fund = new MitigationFund(makeAddr("steward"));
        clock = new PlumeClock(feeder, arbiter, payable(address(fund)), 180, 0.0005 ether);
        handler = new PlumeHandler(clock, feeder, arbiter);
        bytes32 snapshotRoot = handler.root();
        vm.prank(feeder);
        clock.postRoot(snapshotRoot, RootKind.Snapshot, "invariant snapshot");
        targetContract(address(handler));
    }

    function invariant_contractBalanceEqualsSumOfBonds() public view {
        assertEq(address(clock).balance, handler.ghostBondSum());
    }

    function invariant_fundHoldsExactlyTheSlashedBonds() public view {
        assertEq(address(fund).balance, handler.ghostSlashed());
        assertEq(fund.totalReceived(), handler.ghostSlashed());
    }

    function invariant_activeSlotsPointToLiveBondedTickets() public view {
        for (uint256 s = 0; s < handler.sourceCount(); s++) {
            bytes32 src = handler.sources(s);
            bytes32 id = clock.activeBondedTicket(src);
            if (id == bytes32(0)) continue;
            Ticket memory t = clock.getTicket(id);
            assertEq(t.sourceId, src);
            assertTrue(t.operator != address(0));
            assertTrue(t.status == Status.Open || t.status == Status.Responded || t.status == Status.Disputed);
        }
    }

    function invariant_closedTicketsNeverChange() public view {
        for (uint256 k = 0; k < handler.closedCount(); k++) {
            bytes32 id = handler.closedIds(k);
            assertEq(keccak256(abi.encode(clock.getTicket(id))), handler.closedHash(id));
        }
    }
}
