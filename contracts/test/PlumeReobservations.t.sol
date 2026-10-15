// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {PlumeReobservations} from "../src/PlumeReobservations.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Reobservation,
    Attestation,
    Ticket,
    BadStatus,
    WrongRootKind,
    InvalidProof,
    SourceMismatch,
    StaleObservation,
    PlumeStillDetected,
    PlumeNotDetected,
    TooManyReopens
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

contract ReobservationsHarness is PlumeReobservations {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}
}

contract PlumeReobservationsTest is Test {
    event Resolved(bytes32 indexed ticketId, bytes32 indexed root, uint64 observedAt, string basis);
    event Reopened(bytes32 indexed ticketId, bytes32 indexed root, uint64 observedAt, uint64 newDeadline);

    ReobservationsHarness internal clock;
    address internal feeder = makeAddr("feeder");
    address internal operator;
    uint256 internal operatorKey;
    bytes32 internal ticketId;
    bytes32 internal snapshotRoot;
    bytes32 internal constant SRC_A = bytes32("IRQ_S_067");
    uint256 internal rootNonce;

    function setUp() public {
        vm.warp(1_800_000_000);
        (operator, operatorKey) = makeAddrAndKey("operatorA");
        clock = new ReobservationsHarness(feeder, makeAddr("arbiter"), payable(makeAddr("fund")), 180, 0.0005 ether);
        SourceRecord memory a = Fixtures.record(SRC_A, 1_761_905_340, 123_491);
        bytes32[] memory leaves = new bytes32[](1);
        leaves[0] = clock.hashSourceRecord(a);
        snapshotRoot = MerkleHelper.root(leaves);
        vm.prank(feeder);
        clock.postRoot(snapshotRoot, RootKind.Snapshot, "test");
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        clock.pledge{value: 0.001 ether}(SRC_A);
        ticketId = clock.openTicket(snapshotRoot, a, new bytes32[](0));
        _respond();
    }

    function _respond() internal {
        Attestation memory att = Attestation({
            ticketId: ticketId,
            cause: "Stuck pressure-relief valve",
            action: "Valve replaced",
            evidenceHash: keccak256("work order")
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(operatorKey, clock.attestationDigest(att));
        clock.respond(ticketId, att, abi.encodePacked(r, s, v));
    }

    /// @dev Posts a fresh two-leaf re-observation root: `obs` plus a unique padding leaf.
    function _postObservation(Reobservation memory obs) internal returns (bytes32 root) {
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = clock.hashReobservation(obs);
        leaves[1] = keccak256(abi.encode("padding", rootNonce++));
        root = MerkleHelper.root(leaves);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Reobservation, "replayed pass");
    }

    function _proofFor(Reobservation memory obs, bytes32 root) internal view returns (bytes32[] memory) {
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = clock.hashReobservation(obs);
        leaves[1] = keccak256(abi.encode("padding", rootNonce - 1));
        assertEq(MerkleHelper.root(leaves), root);
        return MerkleHelper.proof(leaves, leaves[0]);
    }

    function _obs(bool plume, uint64 at) internal pure returns (Reobservation memory) {
        return Reobservation({
            sourceId: SRC_A,
            observedAt: at,
            plumeDetected: plume,
            basis: plume ? "IMEO persistency_category=persistent" : "IMEO persistency_category=absent"
        });
    }

    function test_resolveWithCleanReobservation() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        vm.warp(1_800_000_090);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Resolved(ticketId, root, 1_800_000_001, obs.basis);
        vm.prank(makeAddr("anyone"));
        clock.resolve(ticketId, root, obs, _proofFor(obs, root));
        Ticket memory t = clock.getTicket(ticketId);
        assertEq(uint8(t.status), uint8(Status.Resolved));
        assertEq(t.closedAt, 1_800_000_090);
        assertEq(clock.activeBondedTicket(SRC_A), bytes32(0));
        assertEq(clock.getBond(SRC_A).amount, 0.001 ether);
    }

    function test_resolveRejectsPlumeStillDetected() public {
        Reobservation memory obs = _obs(true, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        vm.expectRevert(PlumeStillDetected.selector);
        clock.resolve(ticketId, root, obs, proof);
    }

    function test_resolveRejectsStaleObservation() public {
        Reobservation memory obs = _obs(false, 1_800_000_000);
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        vm.expectRevert(StaleObservation.selector);
        clock.resolve(ticketId, root, obs, proof);
    }

    function test_resolveRejectsOtherSource() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        obs.sourceId = bytes32("KAZ_S_003");
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        vm.expectRevert(SourceMismatch.selector);
        clock.resolve(ticketId, root, obs, proof);
    }

    function test_resolveRejectsSnapshotRootAndBadProof() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        vm.expectRevert(WrongRootKind.selector);
        clock.resolve(ticketId, snapshotRoot, obs, new bytes32[](0));
        bytes32 root = _postObservation(obs);
        vm.expectRevert(InvalidProof.selector);
        clock.resolve(ticketId, root, obs, new bytes32[](0));
    }

    function test_resolveRejectsWhenNotResponded() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        clock.resolve(ticketId, root, obs, proof);
        vm.expectRevert(BadStatus.selector);
        clock.resolve(ticketId, root, obs, proof);
    }

    function test_reopenWhenPlumePersists() public {
        Reobservation memory obs = _obs(true, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        vm.warp(1_800_000_100);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Reopened(ticketId, root, 1_800_000_001, 1_800_000_280);
        clock.reopen(ticketId, root, obs, _proofFor(obs, root));
        Ticket memory t = clock.getTicket(ticketId);
        assertEq(uint8(t.status), uint8(Status.Open));
        assertEq(t.deadline, 1_800_000_280);
        assertEq(t.reopenCount, 1);
        assertEq(clock.activeBondedTicket(SRC_A), ticketId);
    }

    function test_reopenRejectsCleanObservation() public {
        Reobservation memory obs = _obs(false, 1_800_000_001);
        bytes32 root = _postObservation(obs);
        bytes32[] memory proof = _proofFor(obs, root);
        vm.expectRevert(PlumeNotDetected.selector);
        clock.reopen(ticketId, root, obs, proof);
    }

    function test_respondBlockedAfterMaxReopens() public {
        for (uint64 i = 1; i <= 2; i++) {
            vm.warp(1_800_000_000 + i * 10);
            Reobservation memory obs = _obs(true, uint64(block.timestamp));
            bytes32 root = _postObservation(obs);
            vm.warp(block.timestamp + 1);
            clock.reopen(ticketId, root, obs, _proofFor(obs, root));
            if (i < 2) _respond();
        }
        Attestation memory att =
            Attestation({ticketId: ticketId, cause: "again", action: "again", evidenceHash: bytes32(0)});
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(operatorKey, clock.attestationDigest(att));
        vm.expectRevert(TooManyReopens.selector);
        clock.respond(ticketId, att, abi.encodePacked(r, s, v));
    }
}
