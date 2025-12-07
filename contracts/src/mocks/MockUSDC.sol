// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000 * 10**6); // Mint 1M USDC to deployer
    }

    function decimals() public view virtual override returns (uint8) {
        return 6; // USDC has 6 decimals
    }

    // Function to give free tokens to test users
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
