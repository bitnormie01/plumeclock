// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeClock} from "../src/PlumeClock.sol";
import {MitigationFund} from "../src/MitigationFund.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Reobservation,
    Attestation,
    Ticket,
    BadStatus,
    NotBonded,
    DeadlineNotPassed,
    TransferFailed
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";

/// @dev A hostile "fund" that tries to slash a second ticket while receiving the first bond.
contract ReentrantFund {
    PlumeClock public clock;
    bytes32 public target;

    function arm(PlumeClock clock_, bytes32 target_) external {
        clock = clock_;
        target = target_;
    }

    receive() external payable {
        clock.slash(target);
    }
}

contract PlumeClockTest is Test {
    event Slashed(bytes32 indexed ticketId, address indexed operator, uint256 amount, address fund);

    PlumeClock internal clock;
    MitigationFund internal fund;
    address internal deployer = makeAddr("deployer");
    address internal feeder = makeAddr("feeder");
    address internal operatorA;
    uint256 internal keyA;
    address internal operatorB;
    uint256 internal keyB;
    bytes32 internal constant SRC_A = bytes32("IRQ_S_067");
    bytes32 internal constant SRC_B = bytes32("KAZ_S_003");
    bytes32 internal constant SRC_C = bytes32("TKM_S_022");
    bytes32 internal root;
    bytes32 internal ticketA;
    bytes32 internal ticketB;
    bytes32 internal ticketC;
    uint256 internal constant BOND = 0.001 ether;
    SourceRecord[] internal recs;
    bytes32[] internal leaves;

    function setUp() public {
        vm.warp(1_800_000_000);
        (operatorA, keyA) = makeAddrAndKey("operatorA");
        (operatorB, keyB) = makeAddrAndKey("operatorB");
        fund = new MitigationFund(deployer);
        clock = new PlumeClock(feeder, deployer, payable(address(fund)), 180, 0.0005 ether);
        recs.push(Fixtures.record(SRC_A, 1_761_905_340, 123_491));
        recs.push(Fixtures.record(SRC_B, 1_780_217_349, 7_847));
        recs.push(Fixtures.record(SRC_C, 1_786_000_000, 12_080));
        for (uint256 i = 0; i < 3; i++) {
            leaves.push(clock.hashSourceRecord(recs[i]));
        }
        root = MerkleHelper.root(leaves);
        vm.deal(operatorA, 1 ether);
        vm.deal(operatorB, 1 ether);
        vm.prank(operatorA);
        clock.pledge{value: BOND}(SRC_A);
        vm.prank(operatorB);
        clock.pledge{value: BOND}(SRC_B);
        vm.prank(feeder);
        clock.postRoot(root, RootKind.Snapshot, "imeo snapshot");
        ticketA = clock.openTicket(root, recs[0], MerkleHelper.proof(leaves, leaves[0]));
        ticketB = clock.openTicket(root, recs[1], MerkleHelper.proof(leaves, leaves[1]));
        ticketC = clock.openTicket(root, recs[2], MerkleHelper.proof(leaves, leaves[2]));
    }

    function test_slashAfterDeadlineMovesBondToFund() public {
        vm.warp(1_800_000_181);
        vm.expectEmit(true, true, false, true, address(clock));
        emit Slashed(ticketB, operatorB, BOND, address(fund));
        vm.prank(makeAddr("anyone"));
        clock.slash(ticketB);
        Ticket memory t = clock.getTicket(ticketB);
        assertEq(uint8(t.status), uint8(Status.Slashed));
        assertEq(t.slashedAmount, BOND);
        assertEq(t.closedAt, 1_800_000_181);
        assertEq(address(fund).balance, BOND);
        assertEq(fund.totalReceived(), BOND);
        assertEq(clock.getBond(SRC_B).operator, address(0));
        assertEq(clock.getBond(SRC_B).amount, 0);
        assertEq(clock.activeBondedTicket(SRC_B), bytes32(0));
        assertEq(address(clock).balance, BOND);
    }

    function test_slashCannotBeReenteredFromTheFund() public {
        ReentrantFund evil = new ReentrantFund();
        PlumeClock clock2 = new PlumeClock(feeder, deployer, payable(address(evil)), 180, 0.0005 ether);
        vm.prank(operatorA);
        clock2.pledge{value: BOND}(SRC_A);
        vm.prank(operatorB);
        clock2.pledge{value: BOND}(SRC_B);
        vm.prank(feeder);
        clock2.postRoot(root, RootKind.Snapshot, "imeo snapshot");
        bytes32 a2 = clock2.openTicket(root, recs[0], MerkleHelper.proof(leaves, leaves[0]));
        bytes32 b2 = clock2.openTicket(root, recs[1], MerkleHelper.proof(leaves, leaves[1]));
        evil.arm(clock2, b2);
        vm.warp(1_800_000_181);
        vm.expectRevert(TransferFailed.selector);
        clock2.slash(a2);
        assertEq(address(evil).balance, 0);
        assertEq(address(clock2).balance, 2 * BOND);
        assertEq(uint8(clock2.getTicket(a2).status), uint8(Status.Open));
        assertEq(uint8(clock2.getTicket(b2).status), uint8(Status.Open));
    }

    function test_slashRejectsAtOrBeforeDeadline() public {
        vm.warp(1_800_000_180);
        vm.expectRevert(DeadlineNotPassed.selector);
        clock.slash(ticketB);
    }

    function test_slashRejectsUnbondedTicket() public {
        vm.warp(1_800_000_181);
        vm.expectRevert(NotBonded.selector);
        clock.slash(ticketC);
    }

    function test_slashRejectsRespondedAndRepeatedSlash() public {
        Attestation memory att =
            Attestation({ticketId: ticketA, cause: "valve", action: "replaced", evidenceHash: keccak256("wo")});
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(keyA, clock.attestationDigest(att));
        clock.respond(ticketA, att, abi.encodePacked(r, s, v));
        vm.warp(1_800_000_181);
        vm.expectRevert(BadStatus.selector);
        clock.slash(ticketA);
        clock.slash(ticketB);
        vm.expectRevert(BadStatus.selector);
        clock.slash(ticketB);
    }

    function test_moneyShotFlow() public {
        // Operator A answers within the clock and a replayed pass shows no plume.
        Attestation memory att = Attestation({
            ticketId: ticketA,
            cause: "Stuck pressure-relief valve",
            action: "Valve replaced and line re-pressurised",
            evidenceHash: keccak256("work order 4711")
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(keyA, clock.attestationDigest(att));
        vm.warp(1_800_000_030);
        clock.respond(ticketA, att, abi.encodePacked(r, s, v));
        Reobservation memory obs = Reobservation({
            sourceId: SRC_A,
            observedAt: 1_800_000_031,
            plumeDetected: false,
            basis: "IMEO persistency_category=absent"
        });
        bytes32[] memory obsLeaves = new bytes32[](1);
        obsLeaves[0] = clock.hashReobservation(obs);
        vm.prank(feeder);
        clock.postRoot(obsLeaves[0], RootKind.Reobservation, "replayed pass");
        vm.warp(1_800_000_040);
        clock.resolve(ticketA, obsLeaves[0], obs, new bytes32[](0));
        // Operator B stays silent; the clock runs out and anyone slashes.
        vm.warp(1_800_000_181);
        clock.slash(ticketB);
        assertEq(uint8(clock.getTicket(ticketA).status), uint8(Status.Resolved));
        assertEq(uint8(clock.getTicket(ticketB).status), uint8(Status.Slashed));
        assertEq(uint8(clock.getTicket(ticketC).status), uint8(Status.Open));
        assertEq(address(fund).balance, BOND);
        // A's bond is free again once its ticket closed.
        uint256 before = operatorA.balance;
        vm.prank(operatorA);
        clock.withdrawBond(SRC_A);
        assertEq(operatorA.balance, before + BOND);
        assertEq(address(clock).balance, 0);
    }
}
