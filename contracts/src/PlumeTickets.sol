// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {PlumeBonds} from "./PlumeBonds.sol";
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
} from "./PlumeTypes.sol";

/// @title PlumeTickets
/// @notice Anyone opens a ticket from a record proven against a posted snapshot root.
abstract contract PlumeTickets is PlumeBonds {
    function openTicket(bytes32 root, SourceRecord calldata rec, bytes32[] calldata proof)
        external
        returns (bytes32 ticketId)
    {
        if (_roots[root].kind != RootKind.Snapshot) revert WrongRootKind();
        ticketId = _open(root, rec, proof);
    }

    function openTickets(bytes32 root, SourceRecord[] calldata recs, bytes32[][] calldata proofs)
        external
        returns (bytes32[] memory ids)
    {
        if (_roots[root].kind != RootKind.Snapshot) revert WrongRootKind();
        if (recs.length != proofs.length) revert LengthMismatch();
        ids = new bytes32[](recs.length);
        for (uint256 i = 0; i < recs.length; i++) {
            ids[i] = _open(root, recs[i], proofs[i]);
        }
    }

    function _open(bytes32 root, SourceRecord calldata rec, bytes32[] calldata proof)
        internal
        returns (bytes32 ticketId)
    {
        if (!MerkleProof.verifyCalldata(proof, root, hashSourceRecord(rec))) revert InvalidProof();
        ticketId = ticketIdFor(rec.sourceId, rec.lastPlumeAt);
        if (_tickets[ticketId].status != Status.None) revert TicketExists();
        address operator = _bonds[rec.sourceId].operator;
        if (operator != address(0)) {
            if (_activeBondedTicket[rec.sourceId] != bytes32(0)) revert SourceBusy();
            _activeBondedTicket[rec.sourceId] = ticketId;
        }
        uint64 deadline = uint64(block.timestamp) + responseWindow;
        uint256 co2e = co2eTonnesPerYear(rec.rateKgPerHour);
        Ticket storage t = _tickets[ticketId];
        t.id = ticketId;
        t.sourceId = rec.sourceId;
        t.snapshotRoot = root;
        t.operator = operator;
        t.status = Status.Open;
        t.rateKgPerHour = rec.rateKgPerHour;
        t.lastPlumeAt = rec.lastPlumeAt;
        t.openedAt = uint64(block.timestamp);
        t.deadline = deadline;
        t.co2eTonnesPerYear = co2e;
        _ticketIds.push(ticketId);
        _recordTransition(ticketId);
        emit TicketOpened(ticketId, rec.sourceId, operator, root, deadline, rec.rateKgPerHour, co2e);
    }
}
