/**
 * Test Suite for DummyLendingStrategy
 * 
 * Tests the yield calculation, deposit/withdrawal mechanics, and compounding
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DummyLendingStrategy", function () {
  let vaultBTC, strategyManager, dummyStrategy;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy VaultBTC
    const VaultBTC = await ethers.getContractFactory("VaultBTC");
    vaultBTC = await VaultBTC.deploy();
    await vaultBTC.waitForDeployment();

    // Deploy StrategyManager
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    strategyManager = await StrategyManager.deploy(await vaultBTC.getAddress());
    await strategyManager.waitForDeployment();

    // Deploy DummyLendingStrategy
    const DummyLendingStrategy = await ethers.getContractFactory("DummyLendingStrategy");
    dummyStrategy = await DummyLendingStrategy.deploy(
      await vaultBTC.getAddress(),
      await strategyManager.getAddress()
    );
    await dummyStrategy.waitForDeployment();

    // Setup: Add strategy and prepare user deposits
    await strategyManager.addStrategy(await dummyStrategy.getAddress());
    await vaultBTC.mint(user1.address, ethers.parseEther("1000"));
    await vaultBTC.connect(user1).approve(
      await strategyManager.getAddress(),
      ethers.parseEther("1000")
    );
    await strategyManager.connect(user1).deposit(ethers.parseEther("500"));
  });

  describe("Deployment", function () {
    it("Should set correct vBTC address", async function () {
      expect(await dummyStrategy.vaultBTC()).to.equal(await vaultBTC.getAddress());
    });

    it("Should set correct StrategyManager address", async function () {
      expect(await dummyStrategy.strategyManager()).to.equal(await strategyManager.getAddress());
    });

    it("Should have correct yield rate", async function () {
      expect(await dummyStrategy.YIELD_RATE_PER_BLOCK()).to.equal(10);
      expect(await dummyStrategy.RATE_DENOMINATOR()).to.equal(10000);
    });
  });

  describe("Deposits via StrategyManager", function () {
    it("Should record deposit correctly", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      const position = await dummyStrategy.positions(user1.address);
      expect(position.depositedAmount).to.equal(allocateAmount);
    });

    it("Should emit StrategyDeposit event", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await expect(
        strategyManager.connect(user1).allocateToStrategy(
          await dummyStrategy.getAddress(),
          allocateAmount
        )
      ).to.emit(dummyStrategy, "StrategyDeposit");
    });

    it("Should track deposit block number", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      const currentBlock = await ethers.provider.getBlockNumber();
      const position = await dummyStrategy.positions(user1.address);
      
      expect(position.depositBlock).to.equal(currentBlock);
      expect(position.lastWithdrawBlock).to.equal(currentBlock);
    });

    it("Should revert if non-StrategyManager calls deposit", async function () {
      await expect(
        dummyStrategy.connect(user1).deposit(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Only StrategyManager");
    });
  });

  describe("Yield Calculation", function () {
    it("Should calculate zero yield immediately after deposit", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      const yieldEarned = await dummyStrategy.getYield(user1.address);
      expect(yieldEarned).to.equal(0);
    });

    it("Should calculate yield after blocks elapse", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      // Mine 10 blocks
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      const yieldEarned = await dummyStrategy.getYield(user1.address);
      
      // Expected: 100 vBTC * 10 blocks * 10/10000 = 1 vBTC
      const expectedYield = ethers.parseEther("1");
      expect(yieldEarned).to.equal(expectedYield);
    });

    it("Should calculate correct yield for 100 blocks (10%)", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      // Mine 100 blocks
      for (let i = 0; i < 100; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      const yieldEarned = await dummyStrategy.getYield(user1.address);
      
      // Expected: 100 vBTC * 100 blocks * 10/10000 = 10 vBTC (10%)
      const expectedYield = ethers.parseEther("10");
      expect(yieldEarned).to.equal(expectedYield);
    });

    it("Should return correct total balance (principal + yield)", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      // Mine 50 blocks
      for (let i = 0; i < 50; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      const totalBalance = await dummyStrategy.balanceOf(user1.address);
      const yieldEarned = await dummyStrategy.getYield(user1.address);
      
      expect(totalBalance).to.equal(allocateAmount + yieldEarned);
    });
  });

  describe("Withdrawals via StrategyManager", function () {
    beforeEach(async function () {
      // User allocates to strategy
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        ethers.parseEther("200")
      );
      
      // Mine some blocks to accrue yield
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    });

    it("Should allow withdrawal of principal", async function () {
      const withdrawAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).withdrawFromStrategy(
        await dummyStrategy.getAddress(),
        withdrawAmount
      );
      
      const position = await dummyStrategy.positions(user1.address);
      expect(position.depositedAmount).to.equal(ethers.parseEther("100"));
    });

    it("Should emit StrategyWithdraw event", async function () {
      const withdrawAmount = ethers.parseEther("100");
      
      await expect(
        strategyManager.connect(user1).withdrawFromStrategy(
          await dummyStrategy.getAddress(),
          withdrawAmount
        )
      ).to.emit(dummyStrategy, "StrategyWithdraw");
    });

    it("Should revert if withdrawing more than deposited", async function () {
      const excessiveAmount = ethers.parseEther("500");
      
      await expect(
        strategyManager.connect(user1).withdrawFromStrategy(
          await dummyStrategy.getAddress(),
          excessiveAmount
        )
      ).to.be.reverted;
    });

    it("Should revert if non-StrategyManager calls withdraw", async function () {
      await expect(
        dummyStrategy.connect(user1).withdraw(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Only StrategyManager");
    });
  });

  describe("Compound Yield", function () {
    it("Should allow users to compound their yield", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      // Mine blocks
      for (let i = 0; i < 50; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      const yieldBeforeCompound = await dummyStrategy.getYield(user1.address);
      
      await dummyStrategy.connect(user1).compoundYield();
      
      const position = await dummyStrategy.positions(user1.address);
      // The compound transaction itself mines a block, so we expect at least the yield we saw
      expect(position.depositedAmount).to.be.gte(allocateAmount + yieldBeforeCompound);
    });

    it("Should reset yield tracking after compound", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      // Mine blocks
      for (let i = 0; i < 50; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await dummyStrategy.connect(user1).compoundYield();
      
      // Yield should be zero immediately after compound
      const yieldAfterCompound = await dummyStrategy.getYield(user1.address);
      expect(yieldAfterCompound).to.equal(0);
    });

    it("Should emit YieldCalculated event on compound", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      // Mine blocks
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      await expect(dummyStrategy.connect(user1).compoundYield())
        .to.emit(dummyStrategy, "YieldCalculated");
    });

    it("Should benefit from compound interest", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      // Mine 50 blocks
      for (let i = 0; i < 50; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Compound
      await dummyStrategy.connect(user1).compoundYield();
      const positionAfterFirstCompound = await dummyStrategy.positions(user1.address);
      
      // Mine another 50 blocks
      for (let i = 0; i < 50; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Yield should be calculated on the new (higher) principal
      const yieldOnCompounded = await dummyStrategy.getYield(user1.address);
      const expectedYield = (positionAfterFirstCompound.depositedAmount * BigInt(50) * BigInt(10)) / BigInt(10000);
      
      expect(yieldOnCompounded).to.equal(expectedYield);
    });
  });

  describe("User Position Query", function () {
    it("Should return complete position details", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      // Mine blocks
      for (let i = 0; i < 20; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      const position = await dummyStrategy.getUserPosition(user1.address);
      
      expect(position.depositedAmount).to.equal(allocateAmount);
      expect(position.currentYield).to.equal(ethers.parseEther("2")); // 100 * 20 * 0.001
      expect(position.depositBlock).to.be.greaterThan(0);
      expect(position.lastWithdrawBlock).to.be.greaterThan(0);
    });
  });
});
