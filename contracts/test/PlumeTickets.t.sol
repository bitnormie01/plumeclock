// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {PlumeTickets} from "../src/PlumeTickets.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Ticket,
    WrongRootKind,
    InvalidProof,
    TicketExists,
    SourceBusy,
    LengthMismatch
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

contract TicketsHarness is PlumeTickets {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}
}

contract PlumeTicketsTest is Test {
    event TicketOpened(
        bytes32 indexed ticketId,
        bytes32 indexed sourceId,
        address indexed operator,
        bytes32 root,
        uint64 deadline,
        uint32 rateKgPerHour,
        uint256 co2eTonnesPerYear
    );

    TicketsHarness internal clock;
    address internal feeder = makeAddr("feeder");
    address internal operatorA = makeAddr("operatorA");
    bytes32 internal constant SRC_A = bytes32("IRQ_S_067");
    bytes32 internal constant SRC_B = bytes32("KAZ_S_003");
    bytes32 internal constant SRC_C = bytes32("TKM_S_022");

    SourceRecord[] internal recs;
    bytes32[] internal leaves;
    bytes32 internal root;

    function setUp() public {
        vm.warp(1_800_000_000);
        clock = new TicketsHarness(feeder, makeAddr("arbiter"), payable(makeAddr("fund")), 180, 0.0005 ether);
        recs.push(Fixtures.record(SRC_A, 1_761_905_340, 123_491));
        recs.push(Fixtures.record(SRC_B, 1_780_217_349, 7_847));
        recs.push(Fixtures.record(SRC_C, 1_786_000_000, 12_080));
        recs.push(Fixtures.record(SRC_A, 1_790_000_000, 50_000)); // a later detection of source A
        for (uint256 i = 0; i < recs.length; i++) {
            leaves.push(clock.hashSourceRecord(recs[i]));
        }
        root = MerkleHelper.root(leaves);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Snapshot, "test-snapshot");
        vm.deal(operatorA, 1 ether);
    }

    function _proof(uint256 i) internal view returns (bytes32[] memory) {
        return MerkleHelper.proof(leaves, leaves[i]);
    }

    function test_openUnbondedTicket() public {
        bytes32 expectedId = clock.ticketIdFor(SRC_B, recs[1].lastPlumeAt);
        vm.expectEmit(true, true, true, true, address(clock));
        emit TicketOpened(expectedId, SRC_B, address(0), root, 1_800_000_180, 7_847, 2_048_443);
        bytes32 id = clock.openTicket(root, recs[1], _proof(1));
        assertEq(id, expectedId);
        Ticket memory t = clock.getTicket(id);
        assertEq(uint8(t.status), uint8(Status.Open));
        assertEq(t.operator, address(0));
        assertEq(t.sourceId, SRC_B);
        assertEq(t.snapshotRoot, root);
        assertEq(t.openedAt, 1_800_000_000);
        assertEq(t.deadline, 1_800_000_180);
        assertEq(t.rateKgPerHour, 7_847);
        assertEq(t.co2eTonnesPerYear, 2_048_443);
        assertEq(clock.ticketCount(), 1);
        assertEq(clock.activeBondedTicket(SRC_B), bytes32(0));
    }

    function test_openBondedTicketLocksSourceSlot() public {
        vm.prank(operatorA);
        clock.pledge{value: 0.001 ether}(SRC_A);
        bytes32 id = clock.openTicket(root, recs[0], _proof(0));
        assertEq(clock.getTicket(id).operator, operatorA);
        assertEq(clock.activeBondedTicket(SRC_A), id);
    }

    function test_secondBondedTicketForBusySourceReverts() public {
        vm.prank(operatorA);
        clock.pledge{value: 0.001 ether}(SRC_A);
        clock.openTicket(root, recs[0], _proof(0));
        vm.expectRevert(SourceBusy.selector);
        clock.openTicket(root, recs[3], _proof(3));
    }

    function test_openRejectsUnknownAndWrongKindRoots() public {
        vm.expectRevert(WrongRootKind.selector);
        clock.openTicket(keccak256("unposted"), recs[0], _proof(0));
        bytes32 obsRoot = keccak256("reobservation-root");
        vm.prank(feeder);
        clock.postRoot(obsRoot, RootKind.Reobservation, "obs");
        vm.expectRevert(WrongRootKind.selector);
        clock.openTicket(obsRoot, recs[0], _proof(0));
    }

    function test_openRejectsBadProofAndTamperedRecord() public {
        vm.expectRevert(InvalidProof.selector);
        clock.openTicket(root, recs[0], _proof(1));
        SourceRecord memory tampered = recs[1];
        tampered.feedbackOperator = "Yes";
        vm.expectRevert(InvalidProof.selector);
        clock.openTicket(root, tampered, _proof(1));
    }

    function test_openRejectsDuplicateTicket() public {
        clock.openTicket(root, recs[2], _proof(2));
        vm.expectRevert(TicketExists.selector);
        clock.openTicket(root, recs[2], _proof(2));
    }

    function test_openTicketsBatchAndLengthCheck() public {
        SourceRecord[] memory batch = new SourceRecord[](2);
        bytes32[][] memory proofs = new bytes32[][](2);
        batch[0] = recs[1];
        batch[1] = recs[2];
        proofs[0] = _proof(1);
        proofs[1] = _proof(2);
        bytes32[] memory ids = clock.openTickets(root, batch, proofs);
        assertEq(ids.length, 2);
        assertEq(clock.ticketCount(), 2);
        bytes32[][] memory shortProofs = new bytes32[][](1);
        shortProofs[0] = _proof(1);
        vm.expectRevert(LengthMismatch.selector);
        clock.openTickets(root, batch, shortProofs);
    }

    function test_getTicketsPagesInOpenOrder() public {
        bytes32 first = clock.openTicket(root, recs[1], _proof(1));
        bytes32 second = clock.openTicket(root, recs[2], _proof(2));
        Ticket[] memory all = clock.getTickets(0, 10);
        assertEq(all.length, 2);
        assertEq(all[0].id, first);
        assertEq(all[1].id, second);
        Ticket[] memory tail = clock.getTickets(1, 10);
        assertEq(tail.length, 1);
        assertEq(tail[0].id, second);
        assertEq(clock.getTickets(2, 10).length, 0);
    }

    function test_openRecordsTransitionBlock() public {
        vm.roll(4242);
        bytes32 id = clock.openTicket(root, recs[1], _proof(1));
        uint64[] memory blocks = clock.getTransitionBlocks(id);
        assertEq(blocks.length, 1);
        assertEq(blocks[0], 4242);
    }
}
