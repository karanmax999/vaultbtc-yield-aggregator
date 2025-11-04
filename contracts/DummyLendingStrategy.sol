// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IYieldStrategy.sol";

/**
 * @title DummyLendingStrategy
 * @dev A simulated lending strategy that generates yield based on blocks elapsed
 * @notice This strategy simulates a lending protocol by accruing 0.1% yield per block
 * 
 * DISCLAIMER: This is a demo/testing contract only. Real yield strategies would integrate
 * with actual DeFi protocols like Aave, Compound, or Yearn.
 * 
 * The yield calculation is simple: 0.1% of the deposited amount per block since deposit.
 * This allows for easy testing and demonstration of the yield aggregator concept.
 */
contract DummyLendingStrategy is IYieldStrategy {
    
    // Reference to the vBTC token
    IERC20 public immutable vaultBTC;
    
    // Reference to the StrategyManager (only it can call deposit/withdraw)
    address public immutable strategyManager;
    
    // Yield rate: 0.1% per block = 10 basis points = 10/10000
    uint256 public constant YIELD_RATE_PER_BLOCK = 10;
    uint256 public constant RATE_DENOMINATOR = 10000;
    
    // Struct to track each user's position
    struct UserPosition {
        uint256 depositedAmount;     // Principal amount deposited
        uint256 depositBlock;         // Block number when deposit was made
        uint256 lastWithdrawBlock;    // Last block when yield was withdrawn/compounded
    }
    
    // Mapping: user address => their position details
    mapping(address => UserPosition) public positions;
    
    // Events
    event StrategyDeposit(address indexed user, uint256 amount, uint256 blockNumber);
    event StrategyWithdraw(address indexed user, uint256 amount, uint256 blockNumber);
    event YieldCalculated(address indexed user, uint256 yieldAmount, uint256 blockDelta);
    
    /**
     * @dev Constructor sets the vBTC token and StrategyManager addresses
     * @param _vaultBTC Address of the VaultBTC token
     * @param _strategyManager Address of the StrategyManager contract
     */
    constructor(address _vaultBTC, address _strategyManager) {
        require(_vaultBTC != address(0), "Invalid vBTC address");
        require(_strategyManager != address(0), "Invalid manager address");
        
        vaultBTC = IERC20(_vaultBTC);
        strategyManager = _strategyManager;
    }
    
    /**
     * @dev Modifier to ensure only StrategyManager can call certain functions
     */
    modifier onlyStrategyManager() {
        require(msg.sender == strategyManager, "Only StrategyManager");
        _;
    }
    
    /**
     * @dev Deposits vBTC into this strategy for a user
     * @param user The user making the deposit
     * @param amount Amount of vBTC to deposit
     * 
     * Called by StrategyManager when user allocates funds to this strategy
     */
    function deposit(address user, uint256 amount) external override onlyStrategyManager {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer tokens from StrategyManager to this contract
        require(vaultBTC.transferFrom(strategyManager, address(this), amount), "Transfer failed");
        
        UserPosition storage position = positions[user];
        
        // If user already has a deposit, we need to handle existing yield
        if (position.depositedAmount > 0) {
            // Calculate existing yield and add it to the principal
            uint256 existingYield = _calculateYield(user);
            position.depositedAmount += existingYield;
        }
        
        // Add new deposit to principal
        position.depositedAmount += amount;
        
        // Update the deposit block to current block
        position.depositBlock = block.number;
        position.lastWithdrawBlock = block.number;
        
        emit StrategyDeposit(user, amount, block.number);
    }
    
    /**
     * @dev Withdraws vBTC from this strategy for a user
     * @param user The user making the withdrawal
     * @param amount Amount of vBTC to withdraw (not including yield)
     * 
     * Called by StrategyManager when user withdraws from this strategy
     * This withdraws principal only; yield stays in the strategy
     */
    function withdraw(address user, uint256 amount) external override onlyStrategyManager {
        require(amount > 0, "Amount must be > 0");
        
        UserPosition storage position = positions[user];
        require(position.depositedAmount >= amount, "Insufficient deposit");
        
        // Decrease deposited amount
        position.depositedAmount -= amount;
        
        // Transfer tokens back to StrategyManager
        require(vaultBTC.transfer(strategyManager, amount), "Transfer failed");
        
        // Update last withdraw block
        position.lastWithdrawBlock = block.number;
        
        emit StrategyWithdraw(user, amount, block.number);
    }
    
    /**
     * @dev Calculates current yield for a user
     * @param user Address of the user
     * @return The amount of yield earned since last interaction
     * 
     * Formula: yield = principal * (blocks elapsed) * (0.1% per block)
     * This is a pure calculation based on the current block number
     */
    function getYield(address user) external view override returns (uint256) {
        return _calculateYield(user);
    }
    
    /**
     * @dev Returns total balance for a user (principal + yield)
     * @param user Address of the user
     * @return Total balance including yield
     */
    function balanceOf(address user) external view override returns (uint256) {
        UserPosition memory position = positions[user];
        uint256 currentYield = _calculateYield(user);
        return position.depositedAmount + currentYield;
    }
    
    /**
     * @dev Internal function to calculate yield
     * @param user Address of the user
     * @return Calculated yield amount
     * 
     * This is the core yield calculation logic:
     * - Get blocks elapsed since deposit
     * - Multiply principal by blocks elapsed
     * - Apply 0.1% per block rate
     */
    function _calculateYield(address user) internal view returns (uint256) {
        UserPosition memory position = positions[user];
        
        if (position.depositedAmount == 0) {
            return 0;
        }
        
        // Calculate blocks elapsed since last interaction
        uint256 blockDelta = block.number - position.lastWithdrawBlock;
        
        if (blockDelta == 0) {
            return 0;
        }
        
        // Calculate yield: principal * blocks * rate
        // yield = (depositedAmount * blockDelta * YIELD_RATE_PER_BLOCK) / RATE_DENOMINATOR
        uint256 yieldAmount = (position.depositedAmount * blockDelta * YIELD_RATE_PER_BLOCK) / RATE_DENOMINATOR;
        
        return yieldAmount;
    }
    
    /**
     * @dev Allows users to compound their yield back into principal
     * 
     * This is an extra feature for hackathon purposes - users can reinvest yield
     * to benefit from compound interest
     */
    function compoundYield() external {
        UserPosition storage position = positions[msg.sender];
        require(position.depositedAmount > 0, "No active position");
        
        uint256 yieldAmount = _calculateYield(msg.sender);
        require(yieldAmount > 0, "No yield to compound");
        
        // Add yield to principal
        position.depositedAmount += yieldAmount;
        
        // Reset the yield tracking
        position.lastWithdrawBlock = block.number;
        
        emit YieldCalculated(msg.sender, yieldAmount, block.number - position.depositBlock);
    }
    
    /**
     * @dev View function to get user's position details
     * @param user Address of the user
     * @return depositedAmount Principal deposited
     * @return depositBlock Block when deposit was made
     * @return lastWithdrawBlock Last block of interaction
     * @return currentYield Current unclaimed yield
     */
    function getUserPosition(address user) external view returns (
        uint256 depositedAmount,
        uint256 depositBlock,
        uint256 lastWithdrawBlock,
        uint256 currentYield
    ) {
        UserPosition memory position = positions[user];
        return (
            position.depositedAmount,
            position.depositBlock,
            position.lastWithdrawBlock,
            _calculateYield(user)
        );
    }
}
