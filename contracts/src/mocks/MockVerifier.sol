// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IZKVerifier.sol";

contract MockVerifier is IZKVerifier {
    /**
     * @dev Always returns true for testing purposes.
     * This bypasses the actual ZK-SNARK verification which would require off-chain proof generation.
     */
    function verifyProof(
        bytes memory,
        /* proof */
        uint256[] memory /* pubSignals */
    )
        external
        pure
        override
        returns (bool)
    {
        return true; // Always verify successfully for demo/testnet
    }

    /**
     * @dev Returns a mock version string to satisfy the interface.
     */
    function version() external pure override returns (string memory) {
        return "1.0.0-mock";
    }
}
