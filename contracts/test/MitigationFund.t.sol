// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MitigationFund, NotSteward, InsufficientBalance} from "../src/MitigationFund.sol";
import {ZeroAddress} from "../src/PlumeTypes.sol";

contract MitigationFundTest is Test {
    event Received(address indexed from, uint256 amount);
    event Disbursed(address indexed to, uint256 amount, string memo);

    MitigationFund internal fund;
    address internal steward = makeAddr("steward");
    address internal payer = makeAddr("payer");
    address payable internal project = payable(makeAddr("project"));

    function setUp() public {
        fund = new MitigationFund(steward);
        vm.deal(payer, 10 ether);
    }

    function test_constructorRejectsZeroSteward() public {
        vm.expectRevert(ZeroAddress.selector);
        new MitigationFund(address(0));
    }

    function test_receiveCountsAndEmits() public {
        vm.expectEmit(true, false, false, true, address(fund));
        emit Received(payer, 1 ether);
        vm.prank(payer);
        (bool ok,) = address(fund).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(fund.totalReceived(), 1 ether);
        assertEq(address(fund).balance, 1 ether);
    }

    function test_disburseByStewardTransfersAndEmits() public {
        vm.prank(payer);
        (bool ok,) = address(fund).call{value: 2 ether}("");
        assertTrue(ok);
        vm.expectEmit(true, false, false, true, address(fund));
        emit Disbursed(project, 0.5 ether, "methane capture retrofit");
        vm.prank(steward);
        fund.disburse(project, 0.5 ether, "methane capture retrofit");
        assertEq(project.balance, 0.5 ether);
        assertEq(fund.totalDisbursed(), 0.5 ether);
        assertEq(address(fund).balance, 1.5 ether);
    }

    function test_disburseRevertsForNonSteward() public {
        vm.prank(payer);
        vm.expectRevert(NotSteward.selector);
        fund.disburse(project, 1, "x");
    }

    function test_disburseRevertsWhenAmountExceedsBalance() public {
        vm.prank(steward);
        vm.expectRevert(InsufficientBalance.selector);
        fund.disburse(project, 1, "x");
    }

    function test_disburseRevertsForZeroRecipient() public {
        vm.prank(steward);
        vm.expectRevert(ZeroAddress.selector);
        fund.disburse(payable(address(0)), 0, "x");
    }
}
