/**
 * Test Suite for StrategyManager
 * 
 * Tests deposit, withdrawal, strategy management, and allocation functionality
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StrategyManager", function () {
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

    // Mint tokens to users for testing
    await vaultBTC.mint(user1.address, ethers.parseEther("1000"));
    await vaultBTC.mint(user2.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the correct vBTC address", async function () {
      expect(await strategyManager.vaultBTC()).to.equal(await vaultBTC.getAddress());
    });

    it("Should set the deployer as owner", async function () {
      expect(await strategyManager.owner()).to.equal(owner.address);
    });

    it("Should start with zero strategies", async function () {
      expect(await strategyManager.getStrategyCount()).to.equal(0);
    });
  });

  describe("Strategy Management", function () {
    it("Should allow owner to add strategy", async function () {
      await strategyManager.addStrategy(await dummyStrategy.getAddress());
      
      expect(await strategyManager.isStrategyApproved(await dummyStrategy.getAddress())).to.be.true;
      expect(await strategyManager.getStrategyCount()).to.equal(1);
    });

    it("Should emit StrategyAdded event", async function () {
      await expect(strategyManager.addStrategy(await dummyStrategy.getAddress()))
        .to.emit(strategyManager, "StrategyAdded")
        .withArgs(await dummyStrategy.getAddress());
    });

    it("Should prevent non-owner from adding strategy", async function () {
      await expect(
        strategyManager.connect(user1).addStrategy(await dummyStrategy.getAddress())
      ).to.be.reverted;
    });

    it("Should prevent adding same strategy twice", async function () {
      await strategyManager.addStrategy(await dummyStrategy.getAddress());
      
      await expect(
        strategyManager.addStrategy(await dummyStrategy.getAddress())
      ).to.be.revertedWith("Strategy already approved");
    });

    it("Should allow owner to remove strategy", async function () {
      await strategyManager.addStrategy(await dummyStrategy.getAddress());
      await strategyManager.removeStrategy(await dummyStrategy.getAddress());
      
      expect(await strategyManager.isStrategyApproved(await dummyStrategy.getAddress())).to.be.false;
      expect(await strategyManager.getStrategyCount()).to.equal(0);
    });

    it("Should return all strategies", async function () {
      await strategyManager.addStrategy(await dummyStrategy.getAddress());
      
      const strategies = await strategyManager.getAllStrategies();
      expect(strategies.length).to.equal(1);
      expect(strategies[0]).to.equal(await dummyStrategy.getAddress());
    });
  });

  describe("Deposits and Withdrawals", function () {
    beforeEach(async function () {
      // Approve StrategyManager to spend user1's vBTC
      await vaultBTC.connect(user1).approve(
        await strategyManager.getAddress(),
        ethers.parseEther("1000")
      );
    });

    it("Should allow user to deposit vBTC", async function () {
      const depositAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).deposit(depositAmount);
      
      expect(await strategyManager.userBalances(user1.address)).to.equal(depositAmount);
    });

    it("Should emit Deposited event", async function () {
      const depositAmount = ethers.parseEther("100");
      
      await expect(strategyManager.connect(user1).deposit(depositAmount))
        .to.emit(strategyManager, "Deposited")
        .withArgs(user1.address, depositAmount);
    });

    it("Should transfer vBTC from user to StrategyManager", async function () {
      const depositAmount = ethers.parseEther("100");
      const initialBalance = await vaultBTC.balanceOf(user1.address);
      
      await strategyManager.connect(user1).deposit(depositAmount);
      
      expect(await vaultBTC.balanceOf(user1.address)).to.equal(initialBalance - depositAmount);
      expect(await vaultBTC.balanceOf(await strategyManager.getAddress())).to.equal(depositAmount);
    });

    it("Should revert deposit with zero amount", async function () {
      await expect(
        strategyManager.connect(user1).deposit(0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should revert deposit without approval", async function () {
      const depositAmount = ethers.parseEther("100");
      
      await expect(
        strategyManager.connect(user2).deposit(depositAmount)
      ).to.be.reverted;
    });

    it("Should allow user to withdraw vBTC", async function () {
      const depositAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("50");
      
      await strategyManager.connect(user1).deposit(depositAmount);
      await strategyManager.connect(user1).withdraw(withdrawAmount);
      
      expect(await strategyManager.userBalances(user1.address)).to.equal(depositAmount - withdrawAmount);
    });

    it("Should emit Withdrawn event", async function () {
      const depositAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("50");
      
      await strategyManager.connect(user1).deposit(depositAmount);
      
      await expect(strategyManager.connect(user1).withdraw(withdrawAmount))
        .to.emit(strategyManager, "Withdrawn")
        .withArgs(user1.address, withdrawAmount);
    });

    it("Should revert withdrawal exceeding balance", async function () {
      await expect(
        strategyManager.connect(user1).withdraw(ethers.parseEther("100"))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Strategy Allocation", function () {
    beforeEach(async function () {
      // Add strategy
      await strategyManager.addStrategy(await dummyStrategy.getAddress());
      
      // User1 deposits vBTC
      await vaultBTC.connect(user1).approve(
        await strategyManager.getAddress(),
        ethers.parseEther("1000")
      );
      await strategyManager.connect(user1).deposit(ethers.parseEther("500"));
    });

    it("Should allow user to allocate to approved strategy", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      const allocation = await strategyManager.userStrategyAllocations(
        user1.address,
        await dummyStrategy.getAddress()
      );
      expect(allocation).to.equal(allocateAmount);
    });

    it("Should emit AllocatedToStrategy event", async function () {
      const allocateAmount = ethers.parseEther("100");
      
      await expect(
        strategyManager.connect(user1).allocateToStrategy(
          await dummyStrategy.getAddress(),
          allocateAmount
        )
      )
        .to.emit(strategyManager, "AllocatedToStrategy")
        .withArgs(user1.address, await dummyStrategy.getAddress(), allocateAmount);
    });

    it("Should decrease user balance in StrategyManager", async function () {
      const allocateAmount = ethers.parseEther("100");
      const initialBalance = await strategyManager.userBalances(user1.address);
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      expect(await strategyManager.userBalances(user1.address)).to.equal(
        initialBalance - allocateAmount
      );
    });

    it("Should revert allocation to unapproved strategy", async function () {
      const fakeStrategy = user2.address; // Random address
      
      await expect(
        strategyManager.connect(user1).allocateToStrategy(fakeStrategy, ethers.parseEther("100"))
      ).to.be.revertedWith("Strategy not approved");
    });

    it("Should allow withdrawal from strategy", async function () {
      const allocateAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("50");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      await strategyManager.connect(user1).withdrawFromStrategy(
        await dummyStrategy.getAddress(),
        withdrawAmount
      );
      
      const allocation = await strategyManager.userStrategyAllocations(
        user1.address,
        await dummyStrategy.getAddress()
      );
      expect(allocation).to.equal(allocateAmount - withdrawAmount);
    });

    it("Should emit WithdrawnFromStrategy event", async function () {
      const allocateAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("50");
      
      await strategyManager.connect(user1).allocateToStrategy(
        await dummyStrategy.getAddress(),
        allocateAmount
      );
      
      await expect(
        strategyManager.connect(user1).withdrawFromStrategy(
          await dummyStrategy.getAddress(),
          withdrawAmount
        )
      )
        .to.emit(strategyManager, "WithdrawnFromStrategy")
        .withArgs(user1.address, await dummyStrategy.getAddress(), withdrawAmount);
    });
  });
});
