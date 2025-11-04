// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IYieldStrategy.sol";

/**
 * @title StrategyManager
 * @dev Core contract that manages user deposits and allocations to different yield strategies
 * @notice Users deposit vBTC into this contract and can allocate it to various approved strategies
 * 
 * This contract acts as the central hub of the yield aggregator, coordinating between
 * users and multiple yield-generating strategies.
 */
contract StrategyManager is Ownable {
    
    // The vBTC token that users deposit
    IERC20 public immutable vaultBTC;
    
    // Mapping: user address => total vBTC balance in StrategyManager (not yet allocated)
    mapping(address => uint256) public userBalances;
    
    // Mapping: user address => strategy address => amount allocated to that strategy
    mapping(address => mapping(address => uint256)) public userStrategyAllocations;
    
    // Array of approved strategy addresses
    address[] public strategies;
    
    // Mapping: strategy address => whether it's approved
    mapping(address => bool) public isStrategyApproved;
    
    // Events for tracking deposits, withdrawals, and strategy actions
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event AllocatedToStrategy(address indexed user, address indexed strategy, uint256 amount);
    event WithdrawnFromStrategy(address indexed user, address indexed strategy, uint256 amount);
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    
    /**
     * @dev Constructor sets the vBTC token address
     * @param _vaultBTC Address of the VaultBTC ERC20 token
     */
    constructor(address _vaultBTC) Ownable(msg.sender) {
        require(_vaultBTC != address(0), "Invalid vBTC address");
        vaultBTC = IERC20(_vaultBTC);
    }
    
    /**
     * @dev Allows owner to add a new yield strategy
     * @param strategy Address of the strategy contract (must implement IYieldStrategy)
     * 
     * Only approved strategies can receive user allocations
     */
    function addStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "Invalid strategy address");
        require(!isStrategyApproved[strategy], "Strategy already approved");
        
        strategies.push(strategy);
        isStrategyApproved[strategy] = true;
        
        emit StrategyAdded(strategy);
    }
    
    /**
     * @dev Allows owner to remove a yield strategy
     * @param strategy Address of the strategy to remove
     * 
     * Note: This doesn't force-withdraw users' funds from the strategy
     * Users should withdraw before a strategy is removed
     */
    function removeStrategy(address strategy) external onlyOwner {
        require(isStrategyApproved[strategy], "Strategy not approved");
        
        isStrategyApproved[strategy] = false;
        
        // Remove from array (swap with last element and pop)
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i] == strategy) {
                strategies[i] = strategies[strategies.length - 1];
                strategies.pop();
                break;
            }
        }
        
        emit StrategyRemoved(strategy);
    }
    
    /**
     * @dev Deposits vBTC tokens into the StrategyManager
     * @param amount Amount of vBTC to deposit
     * 
     * User must approve this contract to spend their vBTC before calling this function
     * Deposited funds sit in the StrategyManager until allocated to a strategy
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer vBTC from user to this contract
        require(vaultBTC.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Update user's balance
        userBalances[msg.sender] += amount;
        
        emit Deposited(msg.sender, amount);
    }
    
    /**
     * @dev Withdraws vBTC tokens from the StrategyManager back to the user
     * @param amount Amount of vBTC to withdraw
     * 
     * Only withdraws from unallocated balance (not from strategies)
     * To withdraw from strategies, use withdrawFromStrategy first
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        
        // Update balance
        userBalances[msg.sender] -= amount;
        
        // Transfer vBTC back to user
        require(vaultBTC.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Allocates user's deposited vBTC to a specific yield strategy
     * @param strategy Address of the approved strategy
     * @param amount Amount of vBTC to allocate
     * 
     * This moves vBTC from the user's StrategyManager balance into the chosen strategy
     * The strategy will then start generating yield according to its logic
     */
    function allocateToStrategy(address strategy, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(isStrategyApproved[strategy], "Strategy not approved");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        
        // Decrease user's available balance in StrategyManager
        userBalances[msg.sender] -= amount;
        
        // Increase user's allocation to this strategy
        userStrategyAllocations[msg.sender][strategy] += amount;
        
        // Approve strategy to take the tokens
        vaultBTC.approve(strategy, amount);
        
        // Call strategy's deposit function
        IYieldStrategy(strategy).deposit(msg.sender, amount);
        
        emit AllocatedToStrategy(msg.sender, strategy, amount);
    }
    
    /**
     * @dev Withdraws user's vBTC from a strategy back to StrategyManager
     * @param strategy Address of the strategy
     * @param amount Amount to withdraw from the strategy
     * 
     * This pulls funds back from the strategy to the user's StrategyManager balance
     * The user can then withdraw to their wallet using the withdraw() function
     */
    function withdrawFromStrategy(address strategy, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(userStrategyAllocations[msg.sender][strategy] >= amount, "Insufficient strategy allocation");
        
        // Decrease user's allocation in this strategy
        userStrategyAllocations[msg.sender][strategy] -= amount;
        
        // Call strategy's withdraw function (strategy sends tokens back to this contract)
        IYieldStrategy(strategy).withdraw(msg.sender, amount);
        
        // Increase user's available balance in StrategyManager
        userBalances[msg.sender] += amount;
        
        emit WithdrawnFromStrategy(msg.sender, strategy, amount);
    }
    
    /**
     * @dev Returns the total number of approved strategies
     * @return Number of strategies
     */
    function getStrategyCount() external view returns (uint256) {
        return strategies.length;
    }
    
    /**
     * @dev Returns all approved strategy addresses
     * @return Array of strategy addresses
     */
    function getAllStrategies() external view returns (address[] memory) {
        return strategies;
    }
    
    /**
     * @dev Gets the yield earned by a user in a specific strategy
     * @param user Address of the user
     * @param strategy Address of the strategy
     * @return Amount of yield earned
     */
    function getStrategyYield(address user, address strategy) external view returns (uint256) {
        return IYieldStrategy(strategy).getYield(user);
    }
    
    /**
     * @dev Gets the total balance (principal + yield) of a user in a specific strategy
     * @param user Address of the user
     * @param strategy Address of the strategy
     * @return Total balance in the strategy
     */
    function getStrategyBalance(address user, address strategy) external view returns (uint256) {
        return IYieldStrategy(strategy).balanceOf(user);
    }
}
