// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IZKVerifier
 * @notice Interface for Zero-Knowledge proof verification
 * @dev Integrates with ZK-SNARK/STARK proof systems for privacy-preserving KYC
 */
interface IZKVerifier {
    /**
     * @notice Verifies a zero-knowledge proof of human identity
     * @param zkProof The ZK proof bytes (generated off-chain)
     * @param publicSignals Public inputs to the ZK circuit
     * @return bool True if proof is valid
     */
    function verifyProof(
        bytes memory zkProof,
        uint256[] memory publicSignals
    ) external view returns (bool);
    
    /**
     * @notice Returns the proof system version
     */
    function version() external view returns (string memory);
}
