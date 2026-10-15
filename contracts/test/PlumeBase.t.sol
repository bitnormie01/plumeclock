// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {
    RootKind,
    RootInfo,
    Ticket,
    NotFeeder,
    ZeroAddress,
    ZeroWindow,
    ZeroMinBond,
    InvalidRootKind,
    RootExists,
    UnknownTicket
} from "../src/PlumeTypes.sol";
import {Fixtures} from "./utils/Fixtures.sol";

contract BaseHarness is PlumeBase {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}
}

contract PlumeBaseTest is Test {
    event RootPosted(bytes32 indexed root, RootKind kind, string uri);

    BaseHarness internal base;
    address internal feeder = makeAddr("feeder");
    address internal arbiter = makeAddr("arbiter");
    address payable internal fund = payable(makeAddr("fund"));

    function setUp() public {
        base = new BaseHarness(feeder, arbiter, fund, 180, 0.0005 ether);
    }

    function test_constructorStoresImmutables() public view {
        assertEq(base.feeder(), feeder);
        assertEq(base.arbiter(), arbiter);
        assertEq(base.mitigationFund(), fund);
        assertEq(base.responseWindow(), 180);
        assertEq(base.minBond(), 0.0005 ether);
        assertEq(base.MAX_REOPENS(), 2);
    }

    function test_constructorRejectsBadArguments() public {
        vm.expectRevert(ZeroAddress.selector);
        new BaseHarness(address(0), arbiter, fund, 180, 1);
        vm.expectRevert(ZeroAddress.selector);
        new BaseHarness(feeder, address(0), fund, 180, 1);
        vm.expectRevert(ZeroAddress.selector);
        new BaseHarness(feeder, arbiter, payable(address(0)), 180, 1);
        vm.expectRevert(ZeroWindow.selector);
        new BaseHarness(feeder, arbiter, fund, 0, 1);
        vm.expectRevert(ZeroMinBond.selector);
        new BaseHarness(feeder, arbiter, fund, 180, 0);
    }

    function test_postRootStoresKindAndTimeAndEmits() public {
        bytes32 root = keccak256("snapshot");
        vm.warp(1_800_000_000);
        vm.expectEmit(true, false, false, true, address(base));
        emit RootPosted(root, RootKind.Snapshot, "imeo:2026-10-15");
        vm.prank(feeder);
        base.postRoot(root, RootKind.Snapshot, "imeo:2026-10-15");
        RootInfo memory info = base.rootInfo(root);
        assertEq(uint8(info.kind), uint8(RootKind.Snapshot));
        assertEq(info.postedAt, 1_800_000_000);
    }

    function test_postRootOnlyFeeder() public {
        vm.expectRevert(NotFeeder.selector);
        base.postRoot(keccak256("x"), RootKind.Snapshot, "");
    }

    function test_postRootRejectsNoneKindAndDuplicates() public {
        vm.startPrank(feeder);
        vm.expectRevert(InvalidRootKind.selector);
        base.postRoot(keccak256("x"), RootKind.None, "");
        base.postRoot(keccak256("x"), RootKind.Reobservation, "");
        vm.expectRevert(RootExists.selector);
        base.postRoot(keccak256("x"), RootKind.Snapshot, "");
        vm.stopPrank();
    }

    function test_co2eUsesGwp100AndFullYear() public view {
        // 7,847 kg/h * 8,760 h * 29.8 / 1,000 = 2,048,443.6 -> floor
        assertEq(base.co2eTonnesPerYear(7847), 2_048_443);
        assertEq(base.co2eTonnesPerYear(123_491), 32_237_078);
        assertEq(base.co2eTonnesPerYear(0), 0);
    }

    function test_ticketIdForIsAbiEncodedPair() public view {
        bytes32 expected = keccak256(abi.encode(bytes32("KAZ_S_003"), uint64(1780217349)));
        assertEq(base.ticketIdFor(bytes32("KAZ_S_003"), 1780217349), expected);
    }

    function test_hashSourceRecordMatchesCrossLanguageVectors() public view {
        assertEq(base.hashSourceRecord(Fixtures.vectorRecord1()), Fixtures.VECTOR_LEAF_1);
        assertEq(base.hashSourceRecord(Fixtures.vectorRecord2()), Fixtures.VECTOR_LEAF_2);
    }

    function test_hashReobservationMatchesCrossLanguageVector() public view {
        assertEq(base.hashReobservation(Fixtures.vectorObservation()), Fixtures.VECTOR_OBS_LEAF);
    }

    function test_crossLanguageRootVerifiesWithOpenZeppelin() public pure {
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = Fixtures.VECTOR_LEAF_2;
        assertTrue(MerkleProof.verify(proof, Fixtures.VECTOR_ROOT_2, Fixtures.VECTOR_LEAF_1));
    }

    function test_emptyViews() public {
        assertEq(base.ticketCount(), 0);
        Ticket[] memory page = base.getTickets(0, 10);
        assertEq(page.length, 0);
        assertEq(base.getTransitionBlocks(keccak256("none")).length, 0);
        vm.expectRevert(UnknownTicket.selector);
        base.getTicket(keccak256("none"));
    }
}
