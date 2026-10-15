// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract SmokeTest is Test {
    function test_toolchainResolvesForgeStdAndOpenZeppelin() public pure {
        bytes32 leaf = keccak256("leaf");
        bytes32[] memory proof = new bytes32[](0);
        assertTrue(MerkleProof.verify(proof, leaf, leaf));
    }
}
