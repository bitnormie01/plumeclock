// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PlumeBase} from "../src/PlumeBase.sol";
import {PlumeBonds} from "../src/PlumeBonds.sol";
import {
    Bond, BondTooSmall, SourceClaimed, NoBond, NotOperator, BondLocked, TransferFailed
} from "../src/PlumeTypes.sol";

contract BondsHarness is PlumeBonds {
    constructor(address f, address a, address payable m, uint64 w, uint256 b) PlumeBase(f, a, m, w, b) {}

    /// @dev Test hook standing in for PlumeTickets (which sets the slot when a bonded ticket opens).
    function setActive(bytes32 sourceId, bytes32 ticketId) external {
        _activeBondedTicket[sourceId] = ticketId;
    }
}

/// @dev An operator contract that tries to withdraw twice by re-entering from receive().
contract ReentrantOperator {
    BondsHarness internal immutable bonds;
    bytes32 internal immutable source;

    constructor(BondsHarness bonds_, bytes32 source_) {
        bonds = bonds_;
        source = source_;
    }

    function pledge() external payable {
        bonds.pledge{value: msg.value}(source);
    }

    function withdraw() external {
        bonds.withdrawBond(source);
    }

    receive() external payable {
        bonds.withdrawBond(source);
    }
}

contract PlumeBondsTest is Test {
    event BondPledged(bytes32 indexed sourceId, address indexed operator, uint256 amount, uint256 total);
    event BondWithdrawn(bytes32 indexed sourceId, address indexed operator, uint256 amount);

    BondsHarness internal bonds;
    address internal operatorA = makeAddr("operatorA");
    address internal operatorB = makeAddr("operatorB");
    bytes32 internal constant SOURCE = bytes32("IRQ_S_067");
    uint256 internal constant MIN_BOND = 0.0005 ether;

    function setUp() public {
        bonds = new BondsHarness(makeAddr("feeder"), makeAddr("arbiter"), payable(makeAddr("fund")), 180, MIN_BOND);
        vm.deal(operatorA, 1 ether);
        vm.deal(operatorB, 1 ether);
    }

    function test_firstPledgeClaimsSource() public {
        vm.expectEmit(true, true, false, true, address(bonds));
        emit BondPledged(SOURCE, operatorA, 0.001 ether, 0.001 ether);
        vm.prank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        Bond memory b = bonds.getBond(SOURCE);
        assertEq(b.operator, operatorA);
        assertEq(b.amount, 0.001 ether);
        assertEq(address(bonds).balance, 0.001 ether);
    }

    function test_pledgeBelowMinBondReverts() public {
        vm.prank(operatorA);
        vm.expectRevert(BondTooSmall.selector);
        bonds.pledge{value: MIN_BOND - 1}(SOURCE);
    }

    function test_topUpBySameOperatorAccumulates() public {
        vm.startPrank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        bonds.pledge{value: 1 wei}(SOURCE);
        vm.stopPrank();
        assertEq(bonds.getBond(SOURCE).amount, 0.001 ether + 1 wei);
    }

    function test_zeroTopUpReverts() public {
        vm.startPrank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        vm.expectRevert(BondTooSmall.selector);
        bonds.pledge{value: 0}(SOURCE);
        vm.stopPrank();
    }

    function test_pledgeByAnotherOperatorReverts() public {
        vm.prank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        vm.prank(operatorB);
        vm.expectRevert(SourceClaimed.selector);
        bonds.pledge{value: 0.001 ether}(SOURCE);
    }

    function test_withdrawReturnsWholeBondAndClears() public {
        vm.prank(operatorA);
        bonds.pledge{value: 0.002 ether}(SOURCE);
        uint256 before = operatorA.balance;
        vm.expectEmit(true, true, false, true, address(bonds));
        emit BondWithdrawn(SOURCE, operatorA, 0.002 ether);
        vm.prank(operatorA);
        bonds.withdrawBond(SOURCE);
        assertEq(operatorA.balance, before + 0.002 ether);
        assertEq(bonds.getBond(SOURCE).operator, address(0));
        assertEq(address(bonds).balance, 0);
    }

    function test_withdrawRevertsWithoutBond() public {
        vm.prank(operatorA);
        vm.expectRevert(NoBond.selector);
        bonds.withdrawBond(SOURCE);
    }

    function test_withdrawRevertsForNonOperator() public {
        vm.prank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        vm.prank(operatorB);
        vm.expectRevert(NotOperator.selector);
        bonds.withdrawBond(SOURCE);
    }

    function test_withdrawCannotBeReentered() public {
        ReentrantOperator attacker = new ReentrantOperator(bonds, SOURCE);
        attacker.pledge{value: 0.001 ether}();
        vm.expectRevert(TransferFailed.selector);
        attacker.withdraw();
        assertEq(bonds.getBond(SOURCE).amount, 0.001 ether);
        assertEq(address(bonds).balance, 0.001 ether);
    }

    function test_withdrawRevertsWhileBondedTicketActive() public {
        vm.prank(operatorA);
        bonds.pledge{value: 0.001 ether}(SOURCE);
        bonds.setActive(SOURCE, keccak256("ticket"));
        vm.prank(operatorA);
        vm.expectRevert(BondLocked.selector);
        bonds.withdrawBond(SOURCE);
    }
}
