// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {PlumeTickets} from "./PlumeTickets.sol";
import {
    Status,
    Attestation,
    DisputeClaim,
    Ticket,
    BadStatus,
    NotBonded,
    DeadlinePassed,
    TicketMismatch,
    BadSignature,
    TooManyReopens
} from "./PlumeTypes.sol";

/// @title PlumeResponses
/// @notice The bonded operator answers an open ticket with an EIP-712 signed attestation, or
///         disputes attribution (clock paused) for the arbiter to settle. Anyone may relay.
abstract contract PlumeResponses is PlumeTickets {
    bytes32 public constant ATTESTATION_TYPEHASH =
        keccak256("Attestation(bytes32 ticketId,string cause,string action,bytes32 evidenceHash)");
    bytes32 public constant DISPUTE_TYPEHASH =
        keccak256("DisputeClaim(bytes32 ticketId,string reason,bytes32 evidenceHash)");

    function attestationDigest(Attestation calldata att) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ATTESTATION_TYPEHASH,
                    att.ticketId,
                    keccak256(bytes(att.cause)),
                    keccak256(bytes(att.action)),
                    att.evidenceHash
                )
            )
        );
    }

    function disputeDigest(DisputeClaim calldata claim) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(DISPUTE_TYPEHASH, claim.ticketId, keccak256(bytes(claim.reason)), claim.evidenceHash))
        );
    }

    function respond(bytes32 ticketId, Attestation calldata att, bytes calldata signature) external {
        Ticket storage t = _openBondedTicket(ticketId);
        if (t.reopenCount >= MAX_REOPENS) revert TooManyReopens();
        if (att.ticketId != ticketId) revert TicketMismatch();
        if (!SignatureChecker.isValidSignatureNow(t.operator, attestationDigest(att), signature)) {
            revert BadSignature();
        }
        t.status = Status.Responded;
        t.respondedAt = uint64(block.timestamp);
        _recordTransition(ticketId);
        emit Responded(ticketId, t.operator, att.cause, att.action, att.evidenceHash);
    }

    function dispute(bytes32 ticketId, DisputeClaim calldata claim, bytes calldata signature) external {
        Ticket storage t = _openBondedTicket(ticketId);
        if (claim.ticketId != ticketId) revert TicketMismatch();
        if (!SignatureChecker.isValidSignatureNow(t.operator, disputeDigest(claim), signature)) {
            revert BadSignature();
        }
        uint64 remaining = t.deadline - uint64(block.timestamp);
        t.status = Status.Disputed;
        t.pausedRemaining = remaining;
        _recordTransition(ticketId);
        emit Disputed(ticketId, t.operator, claim.reason, claim.evidenceHash, remaining);
    }

    /// @notice upheld = misattribution confirmed (ticket dismissed); otherwise the clock resumes.
    function settleDispute(bytes32 ticketId, bool upheld) external onlyArbiter {
        Ticket storage t = _tickets[ticketId];
        if (t.status != Status.Disputed) revert BadStatus();
        uint64 newDeadline = 0;
        if (upheld) {
            t.pausedRemaining = 0;
            _close(t, Status.Dismissed);
        } else {
            newDeadline = uint64(block.timestamp) + t.pausedRemaining;
            t.deadline = newDeadline;
            t.pausedRemaining = 0;
            t.status = Status.Open;
            _recordTransition(ticketId);
        }
        emit DisputeSettled(ticketId, upheld, newDeadline);
    }

    function _openBondedTicket(bytes32 ticketId) internal view returns (Ticket storage t) {
        t = _tickets[ticketId];
        if (t.status != Status.Open) revert BadStatus();
        if (t.operator == address(0)) revert NotBonded();
        if (block.timestamp > t.deadline) revert DeadlinePassed();
    }
}
