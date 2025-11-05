# 🏦 VaultBTC Yield Aggregator

A decentralized finance (DeFi) yield aggregator built with Hardhat and Solidity. This project demonstrates a modular architecture where users can deposit **vaultBTC** tokens and allocate them to different yield-generating strategies.

## 📋 Overview

The VaultBTC Yield Aggregator is a hackathon-ready DeFi project that showcases:

- **ERC20 Token Standard**: VaultBTC token representing vault-based Bitcoin
- **Strategy Pattern**: Pluggable yield strategies with a standardized interface
- **User Fund Management**: Secure deposit, withdrawal, and allocation mechanisms
- **Simulated Yield**: Demo lending strategy with 0.1% per-block yield accrual

## 🌟 Babylon Integration & Upgrade Roadmap

**Babylon Trustless Vaults**: The vaultBTC component is architected as a drop-in placeholder for Babylon's trustless, native Bitcoin vault protocol. When Babylon mainnet and vault standards are production-ready, we only need to swap this contract and plug in Babylon's proof and withdrawal logic—no redesign required.

**Security Finality**: We plan to timestamp critical actions (deposits, withdrawals, yield claims) on Babylon Genesis, leveraging their periodic Bitcoin block anchoring. This enables Bitcoin-grade finality and on-chain auditability for DeFi aggregators.

**BABY Token and Staking**: With Babylon's dual-staking design, future yield strategies in this aggregator can support dual rewards: DeFi yield + Babylon security rewards, directly incentivizing both users and network health.

**Cross-chain and IBC Expansion**: The modular design enables future integration with Cosmos IBC and other cross-chain assets or strategies.

**Upgrade Path**: See contract comments in `VaultBTC.sol` and `StrategyManager.sol` for specific integration points. The strategy interface (`IYieldStrategy.sol`) remains compatible with Babylon-native primitives.

## 🏗️ Architecture

### Smart Contracts

1. **VaultBTC.sol**

   - ERC20 token representing vaultBTC
   - Includes mint/burn functions for demo/testing (no access control)
   - Users deposit this token into the yield aggregator

2. **IYieldStrategy.sol**

   - Interface that all yield strategies must implement
   - Defines standard methods: `deposit()`, `withdraw()`, `getYield()`, `balanceOf()`
   - Enables plug-and-play strategy architecture

3. **StrategyManager.sol**

   - Core contract managing user deposits and strategy allocations
   - Maintains user balances and tracks allocations across strategies
   - Only approved strategies can receive user funds
   - Owner can add/remove strategies

4. **DummyLendingStrategy.sol**
   - Implements the IYieldStrategy interface
   - Simulates a lending protocol with 0.1% yield per block
   - Tracks user positions and calculates yield based on blocks elapsed
   - Includes compound yield feature for reinvestment

### Architecture Diagram

```
User Wallet (vBTC)
       ↓
       ↓ deposit()
       ↓
StrategyManager
       ↓
       ↓ allocateToStrategy()
       ↓
┌──────────────────────┐
│ DummyLendingStrategy │ (0.1% per block)
│ (implements          │
│  IYieldStrategy)     │
└──────────────────────┘
       ↓
  Yield Accrual
  (based on blocks)
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile
```

### Running Tests

```bash
# Run all tests
npx hardhat test

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test file
npx hardhat test test/VaultBTC.test.js
```

### Deployment

Deploy to Hardhat local network:

```bash
npx hardhat run scripts/deploy.js --network hardhat
```

### Demo Flow

Run the complete transaction flow demonstration:

```bash
npx hardhat run scripts/demo-flow.js --network hardhat
```

This script demonstrates:

1. ✅ Minting vBTC to a user
2. ✅ User depositing vBTC into StrategyManager
3. ✅ User allocating funds to DummyLendingStrategy
4. ✅ Mining blocks to accrue yield (simulates time passing)
5. ✅ Checking yield earned (0.1% per block)
6. ✅ Withdrawing from strategy
7. ✅ Withdrawing to wallet

## 📁 Project Structure

```
vaultbtc-yield-aggregator/
├── contracts/
│   ├── VaultBTC.sol              # ERC20 token contract
│   ├── IYieldStrategy.sol         # Strategy interface
│   ├── StrategyManager.sol        # Core manager contract
│   └── DummyLendingStrategy.sol   # Example strategy implementation
├── scripts/
│   ├── deploy.js                  # Deployment script
│   └── demo-flow.js               # Transaction flow demonstration
├── test/
│   ├── VaultBTC.test.js           # Token tests
│   ├── StrategyManager.test.js    # Manager tests
│   └── DummyLendingStrategy.test.js # Strategy tests
├── hardhat.config.js              # Hardhat configuration
├── package.json                   # Dependencies
└── README.md                      # This file
```

## 🧪 Testing Coverage

### VaultBTC Tests

- ✅ Token deployment and initialization
- ✅ Minting tokens to addresses
- ✅ Burning tokens (with and without allowance)
- ✅ Standard ERC20 transfers and approvals

### StrategyManager Tests

- ✅ Strategy management (add/remove strategies)
- ✅ User deposits and withdrawals
- ✅ Strategy allocations and withdrawals
- ✅ Access control (owner-only functions)
- ✅ Event emissions

### DummyLendingStrategy Tests

- ✅ Yield calculation (0.1% per block)
- ✅ Deposit and withdrawal mechanics
- ✅ Compound yield functionality
- ✅ User position tracking
- ✅ Integration with StrategyManager

## 💡 Key Features

### For Users

- **Deposit vBTC**: Securely deposit tokens into the StrategyManager
- **Choose Strategies**: Allocate funds to different approved yield strategies
- **Earn Yield**: Automatically accrue yield based on strategy logic
- **Flexible Withdrawals**: Withdraw from strategies or back to wallet anytime
- **Compound Yield**: Reinvest earned yield for compound interest

### For Developers

- **Modular Design**: Easy to add new strategies by implementing IYieldStrategy
- **Well-Commented Code**: Every function includes detailed documentation
- **Comprehensive Tests**: Full test coverage for all contracts
- **Gas Optimized**: Uses Solidity 0.8.20 with optimizer enabled
- **Event Driven**: All key actions emit events for off-chain tracking

## 🔮 Suggested Extensions for Advanced DeFi

Ready to take this hackathon project to the next level? Here are **3 recommended extensions**:

### 1. 🗳️ DAO Governance for Strategy Approval

**What**: Implement decentralized governance where token holders vote on strategy approvals

**Why**: Removes centralized control, increases trust, community-driven decision making

**Implementation Ideas**:

- Create a governance token (or use vBTC for voting)
- Strategy proposals require community voting
- Time-locked execution after vote passes
- Delegate voting for better participation
- Quorum requirements for valid votes

**Tech Stack**: OpenZeppelin Governor contracts, Snapshot for off-chain voting

---

### 2. 🔌 Real Lending Protocol Integration

**What**: Connect to actual DeFi protocols like Aave, Compound, or Yearn for real yield

**Why**: Generate actual returns instead of simulated yield, production-ready functionality

**Implementation Ideas**:

- Create AaveStrategy.sol implementing IYieldStrategy
- Use Aave's lending pool for deposits/withdrawals
- Track aTokens received from Aave
- Calculate real yield from protocol interest
- Handle protocol-specific edge cases (liquidity, collateral ratios)

**Tech Stack**: Aave V3 SDK, Compound V3, Chainlink price feeds

**Example Integration**:

```solidity
contract AaveStrategy is IYieldStrategy {
    ILendingPool public aavePool;

    function deposit(address user, uint256 amount) external override {
        // Deposit vBTC into Aave
        aavePool.deposit(address(vaultBTC), amount, address(this), 0);
        // Receive aTokens representing the deposit
    }
}
```

---

### 3. 💰 Multi-Asset Vault Support

**What**: Expand beyond vaultBTC to support multiple assets (WETH, USDC, DAI, etc.)

**Why**: Diversification, broader user base, risk management across different assets

**Implementation Ideas**:

- Modify StrategyManager to accept multiple token types
- Track balances per user per asset
- Implement asset-specific strategies
- Add liquidity pool strategies (Uniswap, Curve)
- Cross-asset yield optimization (auto-rebalancing)

**Tech Stack**: Uniswap V3, Curve Finance, 1inch for token swaps

**Architecture Change**:

```solidity
// Instead of:
mapping(address => uint256) public userBalances;

// Use:
mapping(address => mapping(address => uint256)) public userAssetBalances;
// user address => token address => balance
```

---

### 4. 🔐 Advanced Access Control (Bonus)

**What**: Implement role-based permissions with multiple admin roles

**Why**: Better security, separation of concerns, emergency response capabilities

**Implementation Ideas**:

- **Owner**: Can add/remove strategy managers
- **Strategy Manager**: Can approve/remove strategies
- **Guardian**: Can pause contracts in emergencies
- **Treasury**: Can collect protocol fees
- Time-locked admin actions for transparency

**Tech Stack**: OpenZeppelin AccessControl, TimelockController

---

### 5. 🌐 React Web3 Frontend (Bonus)

**What**: Build a user-friendly web interface for deposits, withdrawals, and yield tracking

**Why**: Better UX, visual yield tracking, easier onboarding for non-technical users

**Implementation Ideas**:

- Connect wallet (MetaMask, WalletConnect)
- Display user balances and allocations
- Interactive strategy selection
- Real-time yield charts
- Transaction history
- Mobile-responsive design

**Tech Stack**: React, ethers.js v6, wagmi, RainbowKit, TailwindCSS, recharts

---

## 📊 Yield Calculation Explained

The DummyLendingStrategy uses a simple formula:

```
Yield = Principal × Blocks Elapsed × (0.1% per block)
```

**Example**:

- Principal: 100 vBTC
- Blocks Elapsed: 100
- Yield Rate: 0.1% = 10/10000

```
Yield = 100 × 100 × 10/10000 = 10 vBTC (10% total)
```

> **Note**: On Ethereum mainnet, blocks are mined every ~12 seconds. On test networks, block times vary. This is a demonstration only—real yield rates would be much lower!

## 🔒 Security Considerations

**For Demo/Hackathon Use Only**:

- ⚠️ VaultBTC has public mint/burn (no access control)
- ⚠️ DummyLendingStrategy is a simulation (not a real protocol)
- ⚠️ No audit has been performed on these contracts
- ⚠️ Do not deploy to mainnet without proper security review

**For Production**:

- Add proper access control (OpenZeppelin Ownable/AccessControl)
- Implement emergency pause mechanisms
- Add reentrancy guards on all external functions
- Conduct professional smart contract audits
- Implement time locks for sensitive operations
- Add slippage protection for yield claims

## 📝 Smart Contract Functions

### VaultBTC

- `mint(address to, uint256 amount)`: Mint tokens to an address
- `burn(address from, uint256 amount)`: Burn tokens from an address

### StrategyManager

- `deposit(uint256 amount)`: Deposit vBTC into manager
- `withdraw(uint256 amount)`: Withdraw vBTC from manager
- `allocateToStrategy(address strategy, uint256 amount)`: Allocate to a strategy
- `withdrawFromStrategy(address strategy, uint256 amount)`: Withdraw from strategy
- `addStrategy(address strategy)`: Owner adds approved strategy
- `removeStrategy(address strategy)`: Owner removes strategy
- `getStrategyYield(address user, address strategy)`: View user's yield
- `getStrategyBalance(address user, address strategy)`: View user's total balance

### DummyLendingStrategy

- `deposit(address user, uint256 amount)`: Called by StrategyManager
- `withdraw(address user, uint256 amount)`: Called by StrategyManager
- `getYield(address user)`: Calculate current yield for user
- `balanceOf(address user)`: Get total balance (principal + yield)
- `compoundYield()`: User compounds their yield into principal
- `getUserPosition(address user)`: Get complete position details

## 🛠️ Development Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Run tests with coverage
npx hardhat coverage

# Deploy locally
npx hardhat run scripts/deploy.js

# Run demo flow
npx hardhat run scripts/demo-flow.js

# Clean artifacts
npx hardhat clean

# Start local node
npx hardhat node
```

## 📜 License

MIT License - feel free to use this for hackathons, learning, or as a foundation for your DeFi project!

## 🙏 Acknowledgments

Built with:

- **Hardhat**: Ethereum development environment
- **OpenZeppelin**: Secure smart contract libraries
- **Ethers.js**: Web3 library for contract interactions

---

## 🚀 Next Steps

1. ✅ Clone and install dependencies
2. ✅ Run tests to verify everything works
3. ✅ Run the demo flow to see it in action
4. ✅ Read through the contract code and comments
5. 🔮 Pick one of the suggested extensions above
6. 🏗️ Build and iterate on your DeFi aggregator
7. 🏆 Win the hackathon!

---

**Happy Building! 🎉**

For questions or improvements, feel free to open an issue or submit a pull request.
