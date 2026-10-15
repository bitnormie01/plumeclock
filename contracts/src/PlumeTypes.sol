// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Lifecycle of a PlumeClock ticket.
enum Status {
    None,
    Open,
    Responded,
    Resolved,
    Slashed,
    Disputed,
    Dismissed
}

/// @notice What a posted Merkle root commits to.
enum RootKind {
    None,
    Snapshot,
    Reobservation
}

/// @notice One IMEO MARS source, as committed in a snapshot Merkle tree (one leaf per source).
struct SourceRecord {
    bytes32 sourceId; // IMEO source_name as ASCII, right-padded with zero bytes ("KAZ_S_003")
    string lastPlumeId; // IMEO id_last_plume (UUID)
    uint64 lastPlumeAt; // IMEO last_plume_date, unix seconds (UTC)
    uint32 rateKgPerHour; // ch4_fluxrate of the last plume, kg/h, rounded
    uint32 plumeCount; // IMEO n_plumes_detected
    int32 latE5; // latitude * 1e5, rounded
    int32 lonE5; // longitude * 1e5, rounded
    string country; // verbatim
    string sector; // verbatim
    string sourceType; // verbatim
    string persistency; // persistency_category, verbatim
    string notified; // verbatim
    string feedbackOperator; // verbatim
    string feedbackGovernment; // verbatim
}

/// @notice A replayed satellite re-observation of one source, committed in a re-observation tree.
struct Reobservation {
    bytes32 sourceId;
    uint64 observedAt;
    bool plumeDetected;
    string basis;
}

/// @notice EIP-712 repair attestation signed by a ticket's bonded operator.
struct Attestation {
    bytes32 ticketId;
    string cause;
    string action;
    bytes32 evidenceHash;
}

/// @notice EIP-712 misattribution dispute signed by a ticket's bonded operator.
struct DisputeClaim {
    bytes32 ticketId;
    string reason;
    bytes32 evidenceHash;
}

struct RootInfo {
    RootKind kind;
    uint64 postedAt;
}

struct Bond {
    address operator;
    uint256 amount;
}

struct Ticket {
    bytes32 id;
    bytes32 sourceId;
    bytes32 snapshotRoot;
    address operator;
    Status status;
    uint32 rateKgPerHour;
    uint32 reopenCount;
    uint64 lastPlumeAt;
    uint64 openedAt;
    uint64 deadline;
    uint64 respondedAt;
    uint64 closedAt;
    uint64 pausedRemaining;
    uint256 co2eTonnesPerYear;
    uint256 slashedAmount;
}

error NotFeeder();
error NotArbiter();
error ZeroAddress();
error ZeroWindow();
error ZeroMinBond();
error InvalidRootKind();
error RootExists();
error WrongRootKind();
error InvalidProof();
error TicketExists();
error UnknownTicket();
error LengthMismatch();
error SourceBusy();
error BondTooSmall();
error SourceClaimed();
error NotOperator();
error NoBond();
error BondLocked();
error TransferFailed();
error BadStatus();
error NotBonded();
error DeadlinePassed();
error DeadlineNotPassed();
error TicketMismatch();
error BadSignature();
error TooManyReopens();
error SourceMismatch();
error StaleObservation();
error PlumeStillDetected();
error PlumeNotDetected();

/// @notice Every event PlumeClock emits (inherited by PlumeBase).
interface IPlumeClockEvents {
    event RootPosted(bytes32 indexed root, RootKind kind, string uri);
    event BondPledged(bytes32 indexed sourceId, address indexed operator, uint256 amount, uint256 total);
    event BondWithdrawn(bytes32 indexed sourceId, address indexed operator, uint256 amount);
    event TicketOpened(
        bytes32 indexed ticketId,
        bytes32 indexed sourceId,
        address indexed operator,
        bytes32 root,
        uint64 deadline,
        uint32 rateKgPerHour,
        uint256 co2eTonnesPerYear
    );
    event Responded(bytes32 indexed ticketId, address indexed operator, string cause, string action, bytes32 evidenceHash);
    event Disputed(
        bytes32 indexed ticketId, address indexed operator, string reason, bytes32 evidenceHash, uint64 pausedRemaining
    );
    event DisputeSettled(bytes32 indexed ticketId, bool upheld, uint64 newDeadline);
    event Resolved(bytes32 indexed ticketId, bytes32 indexed root, uint64 observedAt, string basis);
    event Reopened(bytes32 indexed ticketId, bytes32 indexed root, uint64 observedAt, uint64 newDeadline);
    event Slashed(bytes32 indexed ticketId, address indexed operator, uint256 amount, address fund);
}
