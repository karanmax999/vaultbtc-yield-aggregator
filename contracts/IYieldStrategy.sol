// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYieldStrategy
 * @dev Interface that all yield strategies must implement
 * @notice This interface defines the standard methods for depositing, withdrawing, and calculating yield
 * 
 * Strategy contracts are "plug-ins" that can be added to the StrategyManager.
 * Each strategy implements its own yield generation logic.
 */
interface IYieldStrategy {
    
    /**
     * @dev Deposits vBTC tokens into the strategy on behalf of a user
     * @param user The address of the user making the deposit
     * @param amount The amount of vBTC to deposit
     * 
     * This function is called by the StrategyManager when a user allocates funds to this strategy
     */
    function deposit(address user, uint256 amount) external;
    
    /**
     * @dev Withdraws vBTC tokens from the strategy for a user
     * @param user The address of the user making the withdrawal
     * @param amount The amount of vBTC to withdraw
     * 
     * This function is called by the StrategyManager when a user withdraws from this strategy
     * The strategy should transfer the tokens back to the StrategyManager
     */
    function withdraw(address user, uint256 amount) external;
    
    /**
     * @dev Calculates the current yield earned by a user in this strategy
     * @param user The address of the user
     * @return The amount of yield earned (in vBTC wei)
     * 
     * This is a view/pure function that calculates yield based on the strategy's logic
     * For example, it might calculate based on time elapsed, blocks mined, or other factors
     */
    function getYield(address user) external view returns (uint256);
    
    /**
     * @dev Returns the total balance of a user in this strategy (deposit + yield)
     * @param user The address of the user
     * @return The total balance including principal and earned yield
     */
    function balanceOf(address user) external view returns (uint256);
}
