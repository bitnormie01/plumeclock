// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ZeroAddress, TransferFailed} from "./PlumeTypes.sol";

error NotSteward();
error InsufficientBalance();

/// @title MitigationFund
/// @notice Receives slashed PlumeClock bonds. A named steward disburses them to mitigation work.
contract MitigationFund {
    address public immutable steward;
    uint256 public totalReceived;
    uint256 public totalDisbursed;

    event Received(address indexed from, uint256 amount);
    event Disbursed(address indexed to, uint256 amount, string memo);

    constructor(address steward_) {
        if (steward_ == address(0)) revert ZeroAddress();
        steward = steward_;
    }

    receive() external payable {
        totalReceived += msg.value;
        emit Received(msg.sender, msg.value);
    }

    function disburse(address payable to, uint256 amount, string calldata memo) external {
        if (msg.sender != steward) revert NotSteward();
        if (to == address(0)) revert ZeroAddress();
        if (amount > address(this).balance) revert InsufficientBalance();
        totalDisbursed += amount;
        emit Disbursed(to, amount, memo);
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
