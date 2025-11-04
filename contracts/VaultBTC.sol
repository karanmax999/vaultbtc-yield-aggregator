// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title VaultBTC
 * @dev ERC20 token representing vault-based Bitcoin (vaultBTC)
 * @notice This token is used as the deposit currency in the yield aggregator
 * 
 * For demo/testing purposes, this contract includes public mint and burn functions.
 * In production, these would be restricted to authorized addresses only.
 */
contract VaultBTC is ERC20 {
    
    /**
     * @dev Constructor that sets the token name and symbol
     */
    constructor() ERC20("Vault Bitcoin", "vBTC") {
        // Initial supply can be minted here if needed
        // For demo, we'll mint on-demand using the mint function
    }
    
    /**
     * @dev Mints new vBTC tokens to a specified address
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (in wei)
     * 
     * NOTE: In production, this should have access control (e.g., onlyOwner)
     * For hackathon/demo purposes, this is publicly callable
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev Burns vBTC tokens from a specified address
     * @param from The address from which tokens will be burned
     * @param amount The amount of tokens to burn (in wei)
     * 
     * NOTE: In production, this should have access control
     * For hackathon/demo purposes, this is publicly callable
     * The caller must have allowance if burning from another address
     */
    function burn(address from, uint256 amount) external {
        if (from != msg.sender) {
            _spendAllowance(from, msg.sender, amount);
        }
        _burn(from, amount);
    }
}
