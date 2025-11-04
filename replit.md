# VaultBTC Yield Aggregator - Replit Project

## Project Overview

This is a **Hardhat-based Ethereum smart contract project** for a DeFi yield aggregator. It's a development environment for Solidity contracts, not a running web application.

## Architecture

### Smart Contracts
- **VaultBTC.sol**: ERC20 token (vaultBTC) with mint/burn capabilities
- **StrategyManager.sol**: Core contract managing deposits and strategy allocations
- **IYieldStrategy.sol**: Interface for pluggable yield strategies
- **DummyLendingStrategy.sol**: Demo strategy with 0.1% per-block yield simulation

### Project Structure
```
/contracts        - Solidity smart contracts
/scripts          - Deployment and demo scripts
/test             - Comprehensive test suite (57 tests)
/artifacts        - Compiled contract artifacts
/cache            - Hardhat cache
```

## Development Workflow

This project uses:
- **Hardhat 2.x** for Ethereum development
- **Node.js 20** (CommonJS modules)
- **OpenZeppelin Contracts** for ERC20 standard
- **Ethers.js v6** for contract interactions
- **Chai** for testing

## Usage Commands

All commands should be run in the terminal:

```bash
# Compile contracts
npm run compile
# or: npx hardhat compile

# Run tests (57 passing tests)
npm test
# or: npx hardhat test

# Deploy contracts locally
npm run deploy
# or: npx hardhat run scripts/deploy.js

# Run demo transaction flow
npm run demo
# or: npx hardhat run scripts/demo-flow.js

# Clean build artifacts
npx hardhat clean
```

## Key Features

1. **Modular Strategy Pattern**: Easy to add new yield strategies
2. **Comprehensive Tests**: Full coverage of all contract functionality
3. **Demo Flow**: Complete user journey demonstration
4. **Well-Documented**: Inline comments explaining every function
5. **Gas Optimized**: Solidity 0.8.20 with optimizer enabled

## Testing Results

All 57 tests passing:
- VaultBTC: 15 tests (token minting, burning, ERC20 functions)
- StrategyManager: 23 tests (deposits, withdrawals, strategy management)
- DummyLendingStrategy: 19 tests (yield calculation, compounding)

## Next Steps for Extension

See README.md for 5 suggested advanced features:
1. DAO Governance for strategy approval
2. Real lending protocol integration (Aave, Compound)
3. Multi-asset vault support (WETH, USDC, DAI)
4. Role-based access control
5. React Web3 frontend

## Important Notes

- This is a **development environment**, not a production deployment
- Contracts are for **demo/hackathon use** and have not been audited
- VaultBTC has public mint/burn for testing (no access control)
- DummyLendingStrategy simulates yield; real strategies would integrate with DeFi protocols

## Project Status

✅ All contracts compiled successfully
✅ All 57 tests passing
✅ Deployment script working
✅ Demo flow script working
✅ Comprehensive documentation complete
✅ Ready for hackathon/development use
