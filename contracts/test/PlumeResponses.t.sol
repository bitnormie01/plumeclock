// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {PlumeResponses} from "../src/PlumeResponses.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Attestation,
    DisputeClaim,
    Ticket,
    BadStatus,
    NotBonded,
    NotArbiter,
    DeadlinePassed,
    TicketMismatch,
    BadSignature
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

contract ResponsesHarness is PlumeResponses {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}
}

/// @dev A contract-wallet operator (ERC-1271) whose owner key signs on its behalf.
contract ERC1271Wallet {
    address internal immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function pledgeTo(ResponsesHarness clock, bytes32 sourceId) external payable {
        clock.pledge{value: msg.value}(sourceId);
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        return ECDSA.recover(hash, signature) == owner ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}

contract PlumeResponsesTest is Test {
    event Responded(bytes32 indexed ticketId, address indexed operator, string cause, string action, bytes32 evidenceHash);
    event Disputed(
        bytes32 indexed ticketId, address indexed operator, string reason, bytes32 evidenceHash, uint64 pausedRemaining
    );
    event DisputeSettled(bytes32 indexed ticketId, bool upheld, uint64 newDeadline);

    ResponsesHarness internal clock;
    address internal feeder = makeAddr("feeder");
    address internal arbiter = makeAddr("arbiter");
    address internal operator;
    uint256 internal operatorKey;
    bytes32 internal bondedId;
    bytes32 internal unbondedId;
    bytes32 internal constant SRC_A = bytes32("IRQ_S_067");
    bytes32 internal constant SRC_B = bytes32("KAZ_S_003");
    bytes32 internal constant EVIDENCE = keccak256("valve replaced; work order 4711");

    function setUp() public {
        vm.warp(1_800_000_000);
        (operator, operatorKey) = makeAddrAndKey("operatorA");
        clock = new ResponsesHarness(feeder, arbiter, payable(makeAddr("fund")), 180, 0.0005 ether);
        SourceRecord memory a = Fixtures.record(SRC_A, 1_761_905_340, 123_491);
        SourceRecord memory b = Fixtures.record(SRC_B, 1_780_217_349, 7_847);
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = clock.hashSourceRecord(a);
        leaves[1] = clock.hashSourceRecord(b);
        bytes32 root = MerkleHelper.root(leaves);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Snapshot, "test");
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        clock.pledge{value: 0.001 ether}(SRC_A);
        bondedId = clock.openTicket(root, a, MerkleHelper.proof(leaves, leaves[0]));
        unbondedId = clock.openTicket(root, b, MerkleHelper.proof(leaves, leaves[1]));
    }

    function _attestation(bytes32 ticketId) internal pure returns (Attestation memory) {
        return Attestation({
            ticketId: ticketId,
            cause: "Stuck pressure-relief valve",
            action: "Valve replaced and line re-pressurised",
            evidenceHash: EVIDENCE
        });
    }

    function _sign(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_attestationDigestIsEip712() public view {
        Attestation memory att = _attestation(bondedId);
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Attestation(bytes32 ticketId,string cause,string action,bytes32 evidenceHash)"),
                att.ticketId,
                keccak256(bytes(att.cause)),
                keccak256(bytes(att.action)),
                att.evidenceHash
            )
        );
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("PlumeClock"),
                keccak256("1"),
                block.chainid,
                address(clock)
            )
        );
        assertEq(clock.attestationDigest(att), keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash)));
    }

    function test_respondWithOperatorSignature() public {
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.warp(1_800_000_060);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Responded(bondedId, operator, att.cause, att.action, EVIDENCE);
        vm.prank(makeAddr("relayer"));
        clock.respond(bondedId, att, sig);
        Ticket memory t = clock.getTicket(bondedId);
        assertEq(uint8(t.status), uint8(Status.Responded));
        assertEq(t.respondedAt, 1_800_000_060);
        assertEq(clock.getTransitionBlocks(bondedId).length, 2);
    }

    function test_respondRejectsWrongSigner() public {
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(strangerKey, clock.attestationDigest(att));
        vm.expectRevert(BadSignature.selector);
        clock.respond(bondedId, att, sig);
    }

    function test_respondRejectsMismatchedTicket() public {
        Attestation memory att = _attestation(keccak256("other"));
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.expectRevert(TicketMismatch.selector);
        clock.respond(bondedId, att, sig);
    }

    function test_respondRejectsAfterDeadline() public {
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.warp(1_800_000_181);
        vm.expectRevert(DeadlinePassed.selector);
        clock.respond(bondedId, att, sig);
    }

    function test_respondAcceptedExactlyAtDeadline() public {
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.warp(1_800_000_180);
        clock.respond(bondedId, att, sig);
        assertEq(uint8(clock.getTicket(bondedId).status), uint8(Status.Responded));
    }

    function test_respondRejectsUnbondedTicket() public {
        Attestation memory att = _attestation(unbondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        vm.expectRevert(NotBonded.selector);
        clock.respond(unbondedId, att, sig);
    }

    function test_respondAcceptsAnErc1271ContractWalletOperator() public {
        (address owner, uint256 ownerKey) = makeAddrAndKey("walletOwner");
        ERC1271Wallet wallet = new ERC1271Wallet(owner);
        SourceRecord memory c = Fixtures.record(bytes32("TKM_S_022"), 1_786_000_000, 12_080);
        bytes32 root = clock.hashSourceRecord(c);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Snapshot, "single-record root");
        wallet.pledgeTo{value: 0.001 ether}(clock, c.sourceId);
        bytes32 id = clock.openTicket(root, c, new bytes32[](0));
        Attestation memory att = _attestation(id);
        clock.respond(id, att, _sign(ownerKey, clock.attestationDigest(att)));
        assertEq(uint8(clock.getTicket(id).status), uint8(Status.Responded));
        assertEq(clock.getTicket(id).operator, address(wallet));
    }

    function test_disputeRejectsUnbondedAndLateClaims() public {
        DisputeClaim memory unbonded = DisputeClaim({ticketId: unbondedId, reason: "not ours", evidenceHash: bytes32(0)});
        bytes memory unbondedSig = _sign(operatorKey, clock.disputeDigest(unbonded));
        vm.expectRevert(NotBonded.selector);
        clock.dispute(unbondedId, unbonded, unbondedSig);
        DisputeClaim memory late = DisputeClaim({ticketId: bondedId, reason: "not ours", evidenceHash: bytes32(0)});
        bytes memory lateSig = _sign(operatorKey, clock.disputeDigest(late));
        vm.warp(1_800_000_181);
        vm.expectRevert(DeadlinePassed.selector);
        clock.dispute(bondedId, late, lateSig);
    }

    function test_respondRejectsSecondResponse() public {
        Attestation memory att = _attestation(bondedId);
        bytes memory sig = _sign(operatorKey, clock.attestationDigest(att));
        clock.respond(bondedId, att, sig);
        vm.expectRevert(BadStatus.selector);
        clock.respond(bondedId, att, sig);
    }

    function _dispute() internal returns (DisputeClaim memory claim) {
        claim = DisputeClaim({
            ticketId: bondedId,
            reason: "Plume attributed to neighbouring facility",
            evidenceHash: keccak256("site map + flare logs")
        });
        bytes memory sig = _sign(operatorKey, clock.disputeDigest(claim));
        vm.warp(1_800_000_050);
        clock.dispute(bondedId, claim, sig);
    }

    function test_disputePausesClock() public {
        DisputeClaim memory claim = DisputeClaim({
            ticketId: bondedId,
            reason: "Plume attributed to neighbouring facility",
            evidenceHash: keccak256("site map + flare logs")
        });
        bytes memory sig = _sign(operatorKey, clock.disputeDigest(claim));
        vm.warp(1_800_000_050);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Disputed(bondedId, operator, claim.reason, claim.evidenceHash, 130);
        clock.dispute(bondedId, claim, sig);
        Ticket memory t = clock.getTicket(bondedId);
        assertEq(uint8(t.status), uint8(Status.Disputed));
        assertEq(t.pausedRemaining, 130);
    }

    function test_disputeRejectsWrongSigner() public {
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        DisputeClaim memory claim = DisputeClaim({ticketId: bondedId, reason: "not ours", evidenceHash: bytes32(0)});
        bytes memory sig = _sign(strangerKey, clock.disputeDigest(claim));
        vm.expectRevert(BadSignature.selector);
        clock.dispute(bondedId, claim, sig);
    }

    function test_settleDisputeUpheldDismissesAndFreesSlot() public {
        _dispute();
        vm.expectEmit(true, false, false, true, address(clock));
        emit DisputeSettled(bondedId, true, 0);
        vm.prank(arbiter);
        clock.settleDispute(bondedId, true);
        Ticket memory t = clock.getTicket(bondedId);
        assertEq(uint8(t.status), uint8(Status.Dismissed));
        assertEq(t.closedAt, 1_800_000_050);
        assertEq(clock.activeBondedTicket(SRC_A), bytes32(0));
    }

    function test_settleDisputeRejectedResumesRemainingClock() public {
        _dispute();
        vm.warp(1_800_001_000);
        vm.prank(arbiter);
        clock.settleDispute(bondedId, false);
        Ticket memory t = clock.getTicket(bondedId);
        assertEq(uint8(t.status), uint8(Status.Open));
        assertEq(t.deadline, 1_800_001_130);
        assertEq(t.pausedRemaining, 0);
        assertEq(clock.activeBondedTicket(SRC_A), bondedId);
    }

    function test_settleDisputeOnlyArbiterAndOnlyDisputed() public {
        vm.prank(arbiter);
        vm.expectRevert(BadStatus.selector);
        clock.settleDispute(bondedId, true);
        _dispute();
        vm.expectRevert(NotArbiter.selector);
        clock.settleDispute(bondedId, true);
    }
}
