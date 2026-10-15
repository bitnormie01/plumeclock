// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {
    Status,
    RootKind,
    SourceRecord,
    Reobservation,
    RootInfo,
    Bond,
    Ticket,
    IPlumeClockEvents,
    NotFeeder,
    NotArbiter,
    ZeroAddress,
    ZeroWindow,
    ZeroMinBond,
    InvalidRootKind,
    RootExists,
    UnknownTicket
} from "./PlumeTypes.sol";

/// @title PlumeBase
/// @notice Immutables, storage, Merkle-root registry, pure hashing helpers and read views shared by
///         every PlumeClock layer. No admin, no upgrade path, no pause.
abstract contract PlumeBase is IPlumeClockEvents, EIP712, ReentrancyGuard {
    /// @notice IPCC AR6 GWP100 for fossil CH4 is 29.8; stored x10 to keep integer math.
    uint256 public constant GWP100_X10 = 298;
    uint256 public constant HOURS_PER_YEAR = 8760;
    /// @notice After this many failed fixes (re-observed plume), responses are no longer accepted.
    uint32 public constant MAX_REOPENS = 2;

    address public immutable feeder;
    address public immutable arbiter;
    address payable public immutable mitigationFund;
    uint64 public immutable responseWindow;
    uint256 public immutable minBond;

    mapping(bytes32 root => RootInfo) internal _roots;
    mapping(bytes32 sourceId => Bond) internal _bonds;
    mapping(bytes32 sourceId => bytes32 ticketId) internal _activeBondedTicket;
    mapping(bytes32 ticketId => Ticket) internal _tickets;
    mapping(bytes32 ticketId => uint64[]) internal _transitionBlocks;
    bytes32[] internal _ticketIds;

    modifier onlyFeeder() {
        if (msg.sender != feeder) revert NotFeeder();
        _;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert NotArbiter();
        _;
    }

    constructor(
        address feeder_,
        address arbiter_,
        address payable mitigationFund_,
        uint64 responseWindow_,
        uint256 minBond_
    ) EIP712("PlumeClock", "1") {
        if (feeder_ == address(0) || arbiter_ == address(0) || mitigationFund_ == address(0)) revert ZeroAddress();
        if (responseWindow_ == 0) revert ZeroWindow();
        if (minBond_ == 0) revert ZeroMinBond();
        feeder = feeder_;
        arbiter = arbiter_;
        mitigationFund = mitigationFund_;
        responseWindow = responseWindow_;
        minBond = minBond_;
    }

    // ------------------------------------------------------------------ roots

    /// @notice The feeder commits a Merkle root (a snapshot of IMEO records or a re-observation pass).
    function postRoot(bytes32 root, RootKind kind, string calldata uri) external onlyFeeder {
        if (kind == RootKind.None) revert InvalidRootKind();
        if (_roots[root].kind != RootKind.None) revert RootExists();
        _roots[root] = RootInfo({kind: kind, postedAt: uint64(block.timestamp)});
        emit RootPosted(root, kind, uri);
    }

    function rootInfo(bytes32 root) external view returns (RootInfo memory) {
        return _roots[root];
    }

    // ------------------------------------------------------------------ pure helpers

    /// @notice t CO2e per year if the plume persisted at `rateKgPerHour` all year (GWP100 = 29.8).
    function co2eTonnesPerYear(uint32 rateKgPerHour) public pure returns (uint256) {
        return uint256(rateKgPerHour) * HOURS_PER_YEAR * GWP100_X10 / 10_000;
    }

    function ticketIdFor(bytes32 sourceId, uint64 lastPlumeAt) public pure returns (bytes32) {
        return keccak256(abi.encode(sourceId, lastPlumeAt));
    }

    /// @notice Merkle leaf of a snapshot record: keccak256(bytes.concat(keccak256(abi.encode(rec)))).
    function hashSourceRecord(SourceRecord calldata rec) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(rec))));
    }

    /// @notice Merkle leaf of a re-observation: keccak256(bytes.concat(keccak256(abi.encode(obs)))).
    function hashReobservation(Reobservation calldata obs) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(obs))));
    }

    // ------------------------------------------------------------------ views

    function getBond(bytes32 sourceId) external view returns (Bond memory) {
        return _bonds[sourceId];
    }

    function activeBondedTicket(bytes32 sourceId) external view returns (bytes32) {
        return _activeBondedTicket[sourceId];
    }

    function ticketCount() external view returns (uint256) {
        return _ticketIds.length;
    }

    function getTicket(bytes32 ticketId) external view returns (Ticket memory) {
        Ticket memory t = _tickets[ticketId];
        if (t.status == Status.None) revert UnknownTicket();
        return t;
    }

    /// @notice Page through tickets in open order; returns fewer than `count` at the end.
    function getTickets(uint256 start, uint256 count) external view returns (Ticket[] memory page) {
        uint256 total = _ticketIds.length;
        if (start >= total) return new Ticket[](0);
        uint256 end = count > total - start ? total : start + count;
        page = new Ticket[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = _tickets[_ticketIds[i]];
        }
    }

    /// @notice Block number of every state change of a ticket (open first), for one-block log reads.
    function getTransitionBlocks(bytes32 ticketId) external view returns (uint64[] memory) {
        return _transitionBlocks[ticketId];
    }

    // ------------------------------------------------------------------ internal

    function _recordTransition(bytes32 ticketId) internal {
        _transitionBlocks[ticketId].push(uint64(block.number));
    }

    /// @dev Moves a ticket to a terminal status and frees its source's bonded slot.
    function _close(Ticket storage t, Status finalStatus) internal {
        t.status = finalStatus;
        t.closedAt = uint64(block.timestamp);
        if (_activeBondedTicket[t.sourceId] == t.id) {
            delete _activeBondedTicket[t.sourceId];
        }
        _recordTransition(t.id);
    }
}
