// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {PlumeBase} from "./PlumeBase.sol";
import {Bond, BondTooSmall, SourceClaimed, NoBond, NotOperator, BondLocked, TransferFailed} from "./PlumeTypes.sol";

/// @title PlumeBonds
/// @notice Operators opt in per source by pledging native testnet ETH; a bond is locked while the
///         source has an active bonded ticket.
abstract contract PlumeBonds is PlumeBase {
    /// @notice First pledger becomes the source's operator; the same operator may top up.
    function pledge(bytes32 sourceId) external payable {
        Bond storage b = _bonds[sourceId];
        if (b.operator == address(0)) {
            if (msg.value < minBond) revert BondTooSmall();
            b.operator = msg.sender;
        } else if (b.operator != msg.sender) {
            revert SourceClaimed();
        } else if (msg.value == 0) {
            revert BondTooSmall();
        }
        b.amount += msg.value;
        emit BondPledged(sourceId, msg.sender, msg.value, b.amount);
    }

    /// @notice The operator takes the whole bond back while no bonded ticket is active for the source.
    function withdrawBond(bytes32 sourceId) external nonReentrant {
        Bond memory b = _bonds[sourceId];
        if (b.operator == address(0)) revert NoBond();
        if (b.operator != msg.sender) revert NotOperator();
        if (_activeBondedTicket[sourceId] != bytes32(0)) revert BondLocked();
        delete _bonds[sourceId];
        emit BondWithdrawn(sourceId, msg.sender, b.amount);
        (bool ok,) = payable(msg.sender).call{value: b.amount}("");
        if (!ok) revert TransferFailed();
    }
}
