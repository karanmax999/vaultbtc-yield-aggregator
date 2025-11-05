/**
 * Demo Transaction Flow Script
 *
 * This script demonstrates the complete user journey through the VaultBTC Yield Aggregator:
 * 1. Mint vBTC tokens to a user
 * 2. User approves StrategyManager to spend vBTC
 * 3. User deposits vBTC into StrategyManager
 * 4. User allocates deposited vBTC to DummyLendingStrategy
 * 5. Wait for some blocks to accrue yield
 * 6. Check user's yield and total balance
 * 7. User withdraws from strategy
 * 8. User withdraws from StrategyManager back to wallet
 *
 * Babylon Genesis Highlight: This demo uses ERC20 vaultBTC as a placeholder.
 * In production with Babylon, users would deposit native BTC and receive Babylon vault tokens.
 * The allocation and yield logic remains identical - only the underlying asset changes.
 *
 * Usage: npx hardhat run scripts/demo-flow.js --network hardhat
 */

const hre = require("hardhat");

async function main() {
  console.log("========================================");
  console.log("🎯 VaultBTC Yield Aggregator Demo Flow");
  console.log("========================================\n");

  // Get signers
  const [deployer, user1] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("👤 User1:", user1.address, "\n");

  // Deploy all contracts first
  console.log("📝 Deploying contracts...\n");
  
  const VaultBTC = await hre.ethers.getContractFactory("VaultBTC");
  const vaultBTC = await VaultBTC.deploy();
  await vaultBTC.waitForDeployment();
  const vaultBTCAddress = await vaultBTC.getAddress();

  const StrategyManager = await hre.ethers.getContractFactory("StrategyManager");
  const strategyManager = await StrategyManager.deploy(vaultBTCAddress);
  await strategyManager.waitForDeployment();
  const strategyManagerAddress = await strategyManager.getAddress();

  const DummyLendingStrategy = await hre.ethers.getContractFactory("DummyLendingStrategy");
  const dummyLendingStrategy = await DummyLendingStrategy.deploy(vaultBTCAddress, strategyManagerAddress);
  await dummyLendingStrategy.waitForDeployment();
  const dummyLendingStrategyAddress = await dummyLendingStrategy.getAddress();

  await strategyManager.addStrategy(dummyLendingStrategyAddress);

  console.log("✅ Contracts deployed!");
  console.log("   VaultBTC:", vaultBTCAddress);
  console.log("   StrategyManager:", strategyManagerAddress);
  console.log("   DummyLendingStrategy:", dummyLendingStrategyAddress, "\n");

  // Step 1: Mint vBTC to user1
  console.log("========================================");
  console.log("STEP 1: Minting vBTC to User1");
  console.log("========================================");
  const mintAmount = hre.ethers.parseEther("10"); // 10 vBTC
  console.log("💰 Minting", hre.ethers.formatEther(mintAmount), "vBTC to User1...");
  const mintTx = await vaultBTC.mint(user1.address, mintAmount);
  await mintTx.wait();
  const user1Balance = await vaultBTC.balanceOf(user1.address);
  console.log("✅ User1 vBTC Balance:", hre.ethers.formatEther(user1Balance), "vBTC\n");

  // Step 2: User1 approves StrategyManager
  console.log("========================================");
  console.log("STEP 2: User1 Approves StrategyManager");
  console.log("========================================");
  console.log("🔓 User1 approving StrategyManager to spend vBTC...");
  const approveTx = await vaultBTC.connect(user1).approve(strategyManagerAddress, mintAmount);
  await approveTx.wait();
  const allowance = await vaultBTC.allowance(user1.address, strategyManagerAddress);
  console.log("✅ Allowance set:", hre.ethers.formatEther(allowance), "vBTC\n");

  // Step 3: User1 deposits into StrategyManager
  console.log("========================================");
  console.log("STEP 3: User1 Deposits to StrategyManager");
  console.log("========================================");
  const depositAmount = hre.ethers.parseEther("5"); // Deposit 5 vBTC
  console.log("📥 User1 depositing", hre.ethers.formatEther(depositAmount), "vBTC...");
  const depositTx = await strategyManager.connect(user1).deposit(depositAmount);
  await depositTx.wait();
  const userBalance = await strategyManager.userBalances(user1.address);
  console.log("✅ User1 balance in StrategyManager:", hre.ethers.formatEther(userBalance), "vBTC\n");

  // Step 4: User1 allocates to DummyLendingStrategy
  console.log("========================================");
  console.log("STEP 4: User1 Allocates to DummyLendingStrategy");
  console.log("========================================");
  const allocateAmount = hre.ethers.parseEther("3"); // Allocate 3 vBTC to strategy
  console.log("📊 User1 allocating", hre.ethers.formatEther(allocateAmount), "vBTC to DummyLendingStrategy...");
  const allocateTx = await strategyManager.connect(user1).allocateToStrategy(dummyLendingStrategyAddress, allocateAmount);
  await allocateTx.wait();
  
  const strategyAllocation = await strategyManager.userStrategyAllocations(user1.address, dummyLendingStrategyAddress);
  const remainingBalance = await strategyManager.userBalances(user1.address);
  console.log("✅ User1 allocation to strategy:", hre.ethers.formatEther(strategyAllocation), "vBTC");
  console.log("✅ User1 remaining in StrategyManager:", hre.ethers.formatEther(remainingBalance), "vBTC\n");

  // Step 5: Mine some blocks to accrue yield
  console.log("========================================");
  console.log("STEP 5: Mining Blocks for Yield Accrual");
  console.log("========================================");
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  console.log("📦 Current block:", currentBlock);
  console.log("⛏️  Mining 100 blocks to simulate yield accrual...");
  
  // Mine 100 blocks
  for (let i = 0; i < 100; i++) {
    await hre.ethers.provider.send("evm_mine", []);
  }
  
  const newBlock = await hre.ethers.provider.getBlockNumber();
  console.log("📦 New block:", newBlock);
  console.log("✅ Mined", newBlock - currentBlock, "blocks\n");

  // Step 6: Check yield and balances
  console.log("========================================");
  console.log("STEP 6: Checking Yield and Balances");
  console.log("========================================");
  
  const yieldEarned = await strategyManager.getStrategyYield(user1.address, dummyLendingStrategyAddress);
  const totalStrategyBalance = await strategyManager.getStrategyBalance(user1.address, dummyLendingStrategyAddress);
  const userPosition = await dummyLendingStrategy.getUserPosition(user1.address);
  
  console.log("💎 User1 Yield Earned:", hre.ethers.formatEther(yieldEarned), "vBTC");
  console.log("💰 User1 Total Balance in Strategy:", hre.ethers.formatEther(totalStrategyBalance), "vBTC");
  console.log("   (Principal:", hre.ethers.formatEther(userPosition[0]), "vBTC +");
  console.log("    Yield:", hre.ethers.formatEther(userPosition[3]), "vBTC)");
  console.log("📊 Blocks elapsed:", userPosition[2].toString(), "→", newBlock);
  
  // Calculate APY for informational purposes
  const principal = parseFloat(hre.ethers.formatEther(allocateAmount));
  const yield_ = parseFloat(hre.ethers.formatEther(yieldEarned));
  const yieldPercentage = (yield_ / principal) * 100;
  console.log("📈 Yield percentage:", yieldPercentage.toFixed(4), "%");
  console.log("   (0.1% per block × 100 blocks = ~10%)\n");

  // Step 7: User1 withdraws from strategy
  console.log("========================================");
  console.log("STEP 7: User1 Withdraws from Strategy");
  console.log("========================================");
  const withdrawStrategyAmount = hre.ethers.parseEther("2"); // Withdraw 2 vBTC from strategy
  console.log("📤 User1 withdrawing", hre.ethers.formatEther(withdrawStrategyAmount), "vBTC from strategy...");
  const withdrawStrategyTx = await strategyManager.connect(user1).withdrawFromStrategy(dummyLendingStrategyAddress, withdrawStrategyAmount);
  await withdrawStrategyTx.wait();
  
  const newStrategyAllocation = await strategyManager.userStrategyAllocations(user1.address, dummyLendingStrategyAddress);
  const newManagerBalance = await strategyManager.userBalances(user1.address);
  console.log("✅ User1 remaining in strategy:", hre.ethers.formatEther(newStrategyAllocation), "vBTC");
  console.log("✅ User1 balance in StrategyManager:", hre.ethers.formatEther(newManagerBalance), "vBTC\n");

  // Step 8: User1 withdraws from StrategyManager to wallet
  console.log("========================================");
  console.log("STEP 8: User1 Withdraws to Wallet");
  console.log("========================================");
  const withdrawAmount = hre.ethers.parseEther("1"); // Withdraw 1 vBTC to wallet
  console.log("💸 User1 withdrawing", hre.ethers.formatEther(withdrawAmount), "vBTC to wallet...");
  const withdrawTx = await strategyManager.connect(user1).withdraw(withdrawAmount);
  await withdrawTx.wait();
  
  const finalWalletBalance = await vaultBTC.balanceOf(user1.address);
  const finalManagerBalance = await strategyManager.userBalances(user1.address);
  console.log("✅ User1 wallet balance:", hre.ethers.formatEther(finalWalletBalance), "vBTC");
  console.log("✅ User1 StrategyManager balance:", hre.ethers.formatEther(finalManagerBalance), "vBTC\n");

  // Final Summary
  console.log("========================================");
  console.log("📊 FINAL SUMMARY");
  console.log("========================================");
  console.log("User1 Asset Distribution:");
  console.log("  💼 Wallet:", hre.ethers.formatEther(finalWalletBalance), "vBTC");
  console.log("  🏦 StrategyManager:", hre.ethers.formatEther(finalManagerBalance), "vBTC");
  console.log("  📈 DummyLendingStrategy:", hre.ethers.formatEther(newStrategyAllocation), "vBTC");
  
  const totalAssets = finalWalletBalance + finalManagerBalance + newStrategyAllocation;
  console.log("  ═══════════════════════════════");
  console.log("  💎 Total Assets:", hre.ethers.formatEther(totalAssets), "vBTC");
  console.log("  🎁 Yield Earned:", hre.ethers.formatEther(yieldEarned), "vBTC");
  console.log("========================================");
  console.log("✨ Demo flow completed successfully!");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo flow failed:", error);
    process.exit(1);
  });
