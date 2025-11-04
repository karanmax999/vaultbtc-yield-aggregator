/**
 * Deployment Script for VaultBTC Yield Aggregator
 * 
 * This script deploys all contracts in the correct order:
 * 1. VaultBTC token
 * 2. StrategyManager (requires VaultBTC address)
 * 3. DummyLendingStrategy (requires VaultBTC and StrategyManager addresses)
 * 4. Adds DummyLendingStrategy to StrategyManager's approved strategies
 * 
 * Usage: npx hardhat run scripts/deploy.js --network hardhat
 */

const hre = require("hardhat");

async function main() {
  console.log("========================================");
  console.log("🚀 VaultBTC Yield Aggregator Deployment");
  console.log("========================================\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Step 1: Deploy VaultBTC token
  console.log("📝 Step 1: Deploying VaultBTC token...");
  const VaultBTC = await hre.ethers.getContractFactory("VaultBTC");
  const vaultBTC = await VaultBTC.deploy();
  await vaultBTC.waitForDeployment();
  const vaultBTCAddress = await vaultBTC.getAddress();
  console.log("✅ VaultBTC deployed to:", vaultBTCAddress);
  console.log("   Token Name:", await vaultBTC.name());
  console.log("   Token Symbol:", await vaultBTC.symbol(), "\n");

  // Step 2: Deploy StrategyManager
  console.log("📝 Step 2: Deploying StrategyManager...");
  const StrategyManager = await hre.ethers.getContractFactory("StrategyManager");
  const strategyManager = await StrategyManager.deploy(vaultBTCAddress);
  await strategyManager.waitForDeployment();
  const strategyManagerAddress = await strategyManager.getAddress();
  console.log("✅ StrategyManager deployed to:", strategyManagerAddress);
  console.log("   Connected to VaultBTC:", await strategyManager.vaultBTC(), "\n");

  // Step 3: Deploy DummyLendingStrategy
  console.log("📝 Step 3: Deploying DummyLendingStrategy...");
  const DummyLendingStrategy = await hre.ethers.getContractFactory("DummyLendingStrategy");
  const dummyLendingStrategy = await DummyLendingStrategy.deploy(vaultBTCAddress, strategyManagerAddress);
  await dummyLendingStrategy.waitForDeployment();
  const dummyLendingStrategyAddress = await dummyLendingStrategy.getAddress();
  console.log("✅ DummyLendingStrategy deployed to:", dummyLendingStrategyAddress);
  console.log("   Yield Rate:", await dummyLendingStrategy.YIELD_RATE_PER_BLOCK(), "basis points per block");
  console.log("   Rate Denominator:", await dummyLendingStrategy.RATE_DENOMINATOR(), "\n");

  // Step 4: Add DummyLendingStrategy to StrategyManager's approved list
  console.log("📝 Step 4: Approving DummyLendingStrategy in StrategyManager...");
  const addStrategyTx = await strategyManager.addStrategy(dummyLendingStrategyAddress);
  await addStrategyTx.wait();
  console.log("✅ DummyLendingStrategy approved!");
  console.log("   Total approved strategies:", (await strategyManager.getStrategyCount()).toString(), "\n");

  // Deployment Summary
  console.log("========================================");
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log("VaultBTC Address:           ", vaultBTCAddress);
  console.log("StrategyManager Address:    ", strategyManagerAddress);
  console.log("DummyLendingStrategy Address:", dummyLendingStrategyAddress);
  console.log("========================================");
  console.log("✨ All contracts deployed successfully!");
  console.log("========================================\n");

  // Return deployed contract addresses for use in other scripts
  return {
    vaultBTC: vaultBTCAddress,
    strategyManager: strategyManagerAddress,
    dummyLendingStrategy: dummyLendingStrategyAddress
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
