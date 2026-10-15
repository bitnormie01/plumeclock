// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {PlumeResponses} from "./PlumeResponses.sol";
import {
    Status,
    RootKind,
    Reobservation,
    Ticket,
    BadStatus,
    WrongRootKind,
    InvalidProof,
    SourceMismatch,
    StaleObservation,
    PlumeStillDetected,
    PlumeNotDetected
} from "./PlumeTypes.sol";

/// @title PlumeReobservations
/// @notice A responded ticket closes only when a re-observation (proven against a posted
///         re-observation root, newer than the response) shows no plume; a plume reopens it.
abstract contract PlumeReobservations is PlumeResponses {
    function resolve(bytes32 ticketId, bytes32 root, Reobservation calldata obs, bytes32[] calldata proof) external {
        Ticket storage t = _checkReobservation(ticketId, root, obs, proof);
        if (obs.plumeDetected) revert PlumeStillDetected();
        _close(t, Status.Resolved);
        emit Resolved(ticketId, root, obs.observedAt, obs.basis);
    }

    function reopen(bytes32 ticketId, bytes32 root, Reobservation calldata obs, bytes32[] calldata proof) external {
        Ticket storage t = _checkReobservation(ticketId, root, obs, proof);
        if (!obs.plumeDetected) revert PlumeNotDetected();
        uint64 newDeadline = uint64(block.timestamp) + responseWindow;
        t.status = Status.Open;
        t.deadline = newDeadline;
        t.reopenCount += 1;
        _recordTransition(ticketId);
        emit Reopened(ticketId, root, obs.observedAt, newDeadline);
    }

    function _checkReobservation(bytes32 ticketId, bytes32 root, Reobservation calldata obs, bytes32[] calldata proof)
        internal
        view
        returns (Ticket storage t)
    {
        t = _tickets[ticketId];
        if (t.status != Status.Responded) revert BadStatus();
        if (_roots[root].kind != RootKind.Reobservation) revert WrongRootKind();
        if (!MerkleProof.verifyCalldata(proof, root, hashReobservation(obs))) revert InvalidProof();
        if (obs.sourceId != t.sourceId) revert SourceMismatch();
        if (obs.observedAt <= t.respondedAt) revert StaleObservation();
    }
}
