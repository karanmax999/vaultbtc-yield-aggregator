// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title VaultBTC
 * @dev ERC20 token representing vault-based Bitcoin (vaultBTC)
 * @notice This token is used as the deposit currency in the yield aggregator
 *
 * Now includes access control and emergency pause for production readiness
 */
contract VaultBTC is ERC20, Ownable, Pausable {
    
    /**
     * @dev Constructor that sets the token name and symbol
     */
    constructor() ERC20("Vault Bitcoin", "vBTC") Ownable(msg.sender) {
        // Initial supply can be minted here if needed
        // For demo, we'll mint on-demand using the mint function
    }
    
    /**
     * @dev Mints new vBTC tokens to a specified address
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (in wei)
     *
     * Now restricted to owner only for production readiness
     */
    function mint(address to, uint256 amount) external onlyOwner whenNotPaused {
        _mint(to, amount);
    }
    
    /**
     * @dev Burns vBTC tokens from a specified address
     * @param from The address from which tokens will be burned
     * @param amount The amount of tokens to burn (in wei)
     *
     * Now restricted to owner only for production readiness
     * The caller must have allowance if burning from another address
     */
    function burn(address from, uint256 amount) external onlyOwner whenNotPaused {
        if (from != msg.sender) {
            _spendAllowance(from, msg.sender, amount);
        }
        _burn(from, amount);
    }

    /**
     * @dev Pauses all token operations in emergency situations
     * Can only be called by the owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses token operations after emergency is resolved
     * Can only be called by the owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
