// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SourceRecord, Reobservation} from "../../src/PlumeTypes.sol";

/// @notice Shared test records. The VECTOR_* hashes were computed by the TypeScript encoder
///         (src/lib/merkle.ts) and must match Solidity byte-for-byte.
library Fixtures {
    bytes32 internal constant VECTOR_LEAF_1 = 0x03921c0a78d6b85dd4afdaa1a5b4ff9676991b7e5af8774a5cebca375f6d094a;
    bytes32 internal constant VECTOR_LEAF_2 = 0x50fdc75c9872748f4f6ee30bd066ebd6a409b3429851eac4445aa05f28b6e5fd;
    bytes32 internal constant VECTOR_OBS_LEAF = 0x9e1589fa9a7eace672605a7d660c811852cc42a340a900be64706f57f44b71e3;
    bytes32 internal constant VECTOR_ROOT_2 = 0x581f67a5b8e3a132a67656b87d49e7116dab748d0f308c4a8bf916946162f8a7;

    function vectorRecord1() internal pure returns (SourceRecord memory) {
        return SourceRecord({
            sourceId: bytes32("KAZ_S_003"),
            lastPlumeId: "vector-plume-0001",
            lastPlumeAt: 1780217349,
            rateKgPerHour: 7847,
            plumeCount: 23,
            latE5: 4534143,
            lonE5: 5519165,
            country: "Kazakhstan",
            sector: "Oil and Gas",
            sourceType: "Transmission Compressor Station",
            persistency: "persistent",
            notified: "Yes",
            feedbackOperator: "No",
            feedbackGovernment: "No"
        });
    }

    function vectorRecord2() internal pure returns (SourceRecord memory) {
        return SourceRecord({
            sourceId: bytes32("TUR_S_001"),
            lastPlumeId: "vector-plume-0002",
            lastPlumeAt: 1764547200,
            rateKgPerHour: 1234,
            plumeCount: 2,
            latE5: -3612345,
            lonE5: -6479417,
            country: unicode"Türkiye",
            sector: "Oil and Gas",
            sourceType: "O&G facility (generic)",
            persistency: "absent",
            notified: "Yes",
            feedbackOperator: "Yes",
            feedbackGovernment: "No"
        });
    }

    function vectorObservation() internal pure returns (Reobservation memory) {
        return Reobservation({
            sourceId: bytes32("KAZ_S_003"),
            observedAt: 1790000000,
            plumeDetected: false,
            basis: "vector re-observation"
        });
    }

    /// @notice A plain notified oil & gas record for `sourceId` detected at `lastPlumeAt`.
    function record(bytes32 sourceId, uint64 lastPlumeAt, uint32 rateKgPerHour)
        internal
        pure
        returns (SourceRecord memory)
    {
        return SourceRecord({
            sourceId: sourceId,
            lastPlumeId: "test-plume",
            lastPlumeAt: lastPlumeAt,
            rateKgPerHour: rateKgPerHour,
            plumeCount: 3,
            latE5: 3000000,
            lonE5: 5000000,
            country: "Testland",
            sector: "Oil and Gas",
            sourceType: "Flare",
            persistency: "persistent",
            notified: "Yes",
            feedbackOperator: "No",
            feedbackGovernment: "No"
        });
    }
}
