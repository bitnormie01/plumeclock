// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Test-only Merkle builder, identical to src/lib/merkle.ts: leaves sorted ascending,
///         sorted-pair keccak256, odd node carried up unchanged (OpenZeppelin MerkleProof compatible).
library MerkleHelper {
    function hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function root(bytes32[] memory leaves) internal pure returns (bytes32) {
        bytes32[] memory level = _sorted(leaves);
        while (level.length > 1) {
            level = _next(level);
        }
        return level[0];
    }

    function proof(bytes32[] memory leaves, bytes32 leaf) internal pure returns (bytes32[] memory) {
        bytes32[] memory level = _sorted(leaves);
        uint256 index = type(uint256).max;
        for (uint256 i = 0; i < level.length; i++) {
            if (level[i] == leaf) {
                index = i;
                break;
            }
        }
        require(index != type(uint256).max, "MerkleHelper: leaf not found");
        bytes32[] memory buffer = new bytes32[](64);
        uint256 count = 0;
        while (level.length > 1) {
            uint256 sibling = index ^ 1;
            if (sibling < level.length) {
                buffer[count] = level[sibling];
                count++;
            }
            index = index >> 1;
            level = _next(level);
        }
        bytes32[] memory out = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            out[i] = buffer[i];
        }
        return out;
    }

    function _next(bytes32[] memory level) private pure returns (bytes32[] memory next) {
        next = new bytes32[]((level.length + 1) / 2);
        for (uint256 i = 0; i < level.length; i += 2) {
            next[i / 2] = i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i];
        }
    }

    function _sorted(bytes32[] memory leaves) private pure returns (bytes32[] memory out) {
        require(leaves.length > 0, "MerkleHelper: no leaves");
        out = new bytes32[](leaves.length);
        for (uint256 i = 0; i < leaves.length; i++) {
            out[i] = leaves[i];
        }
        for (uint256 i = 1; i < out.length; i++) {
            bytes32 key = out[i];
            uint256 j = i;
            while (j > 0 && out[j - 1] > key) {
                out[j] = out[j - 1];
                j--;
            }
            out[j] = key;
        }
    }
}
