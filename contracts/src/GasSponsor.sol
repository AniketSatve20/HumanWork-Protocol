// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract GasSponsor is Ownable {
    IERC20 public immutable stablecoin;

    uint256 public totalDeposits;
    uint256 public totalSponsored;

    mapping(address => bool) public authorizedContracts;
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userSpentGas;

    event DepositReceived(address indexed user, uint256 amount);
    event GasSponsored(address indexed user, address indexed contract_, uint256 amount);
    event ContractAuthorized(address indexed contract_, bool status);
    event Withdrawal(address indexed owner, uint256 amount);

    error UnauthorizedContract();
    error InsufficientUserBalance();

    constructor(address _stablecoin) Ownable(msg.sender) {
        stablecoin = IERC20(_stablecoin);
    }

    function receiveDeposit(address user, uint256 amount) external {
        require(stablecoin.transferFrom(msg.sender, address(this), amount), "Deposit transfer failed");
        userDeposits[user] += amount;
        totalDeposits += amount;
        emit DepositReceived(user, amount);
    }

    function sponsorGas(address user, uint256 gasAmount) external {
        if (!authorizedContracts[msg.sender]) revert UnauthorizedContract();
        if (userDeposits[user] < gasAmount) revert InsufficientUserBalance();

        userDeposits[user] -= gasAmount;
        userSpentGas[user] += gasAmount;
        totalSponsored += gasAmount;

        emit GasSponsored(user, msg.sender, gasAmount);
    }

    function getUserBalance(address user) external view returns (uint256) {
        return userDeposits[user];
    }

    function getUserSpentGas(address user) external view returns (uint256) {
        return userSpentGas[user];
    }

    function getTreasuryMetrics() external view returns (uint256 deposits, uint256 sponsored, uint256 remaining) {
        return (totalDeposits, totalSponsored, totalDeposits - totalSponsored);
    }

    function authorizeContract(address contract_, bool status) external onlyOwner {
        authorizedContracts[contract_] = status;
        emit ContractAuthorized(contract_, status);
    }

    function withdrawTreasury(uint256 amount) external onlyOwner {
        require(stablecoin.transfer(owner(), amount), "Withdrawal failed");
        emit Withdrawal(owner(), amount);
    }
}
