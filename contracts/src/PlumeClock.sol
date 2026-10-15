// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {PlumeBase} from "./PlumeBase.sol";
import {PlumeReobservations} from "./PlumeReobservations.sol";
import {Status, Ticket, BadStatus, NotBonded, DeadlineNotPassed, TransferFailed} from "./PlumeTypes.sol";

/// @title PlumeClock
/// @notice Every satellite-detected methane super-emitter opens an on-chain ticket with a public
///         response clock. Signed repair attestations plus a clean re-observation close it; when a
///         bonded operator ignores the clock, anyone can slash the bond to the mitigation fund.
contract PlumeClock is PlumeReobservations {
    constructor(
        address feeder_,
        address arbiter_,
        address payable mitigationFund_,
        uint64 responseWindow_,
        uint256 minBond_
    ) PlumeBase(feeder_, arbiter_, mitigationFund_, responseWindow_, minBond_) {}

    /// @notice Permissionless deadline enforcement: an open bonded ticket past its deadline sends the
    ///         operator's whole source bond to the mitigation fund.
    function slash(bytes32 ticketId) external nonReentrant {
        Ticket storage t = _tickets[ticketId];
        if (t.status != Status.Open) revert BadStatus();
        if (t.operator == address(0)) revert NotBonded();
        if (block.timestamp <= t.deadline) revert DeadlineNotPassed();
        uint256 amount = _bonds[t.sourceId].amount;
        delete _bonds[t.sourceId];
        t.slashedAmount = amount;
        _close(t, Status.Slashed);
        emit Slashed(ticketId, t.operator, amount, mitigationFund);
        (bool ok,) = mitigationFund.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
