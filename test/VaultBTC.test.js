/**
 * Test Suite for VaultBTC Token
 *
 * Tests the core ERC20 functionality plus mint and burn operations
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VaultBTC", function () {
  let vaultBTC;
  let owner, user1, user2;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy VaultBTC
    const VaultBTC = await ethers.getContractFactory("VaultBTC");
    vaultBTC = await VaultBTC.deploy();
    await vaultBTC.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have correct name and symbol", async function () {
      expect(await vaultBTC.name()).to.equal("Vault Bitcoin");
      expect(await vaultBTC.symbol()).to.equal("vBTC");
    });

    it("Should have 18 decimals", async function () {
      expect(await vaultBTC.decimals()).to.equal(18);
    });

    it("Should start with zero total supply", async function () {
      expect(await vaultBTC.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("100");
      await vaultBTC.connect(owner).mint(user1.address, mintAmount);

      expect(await vaultBTC.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await vaultBTC.totalSupply()).to.equal(mintAmount);
    });

    it("Should revert when non-owner tries to mint", async function () {
      const mintAmount = ethers.parseEther("100");
      await expect(
        vaultBTC.connect(user1).mint(user2.address, mintAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should emit Transfer event on mint", async function () {
      const mintAmount = ethers.parseEther("50");
      await expect(vaultBTC.connect(owner).mint(user1.address, mintAmount))
        .to.emit(vaultBTC, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, mintAmount);
    });

    it("Should allow multiple mints", async function () {
      const mint1 = ethers.parseEther("100");
      const mint2 = ethers.parseEther("200");

      await vaultBTC.connect(owner).mint(user1.address, mint1);
      await vaultBTC.connect(owner).mint(user2.address, mint2);

      expect(await vaultBTC.balanceOf(user1.address)).to.equal(mint1);
      expect(await vaultBTC.balanceOf(user2.address)).to.equal(mint2);
      expect(await vaultBTC.totalSupply()).to.equal(mint1 + mint2);
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint tokens to user1 for burn tests
      const mintAmount = ethers.parseEther("1000");
      await vaultBTC.connect(owner).mint(user1.address, mintAmount);
    });

    it("Should allow owner to burn tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await vaultBTC.balanceOf(user1.address);

      await vaultBTC.connect(owner).burn(user1.address, burnAmount);

      expect(await vaultBTC.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should revert when non-owner tries to burn", async function () {
      const burnAmount = ethers.parseEther("100");
      await expect(
        vaultBTC.connect(user1).burn(user1.address, burnAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should emit Transfer event on burn", async function () {
      const burnAmount = ethers.parseEther("50");
      await expect(vaultBTC.connect(owner).burn(user1.address, burnAmount))
        .to.emit(vaultBTC, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
    });

    it("Should decrease total supply when burning", async function () {
      const burnAmount = ethers.parseEther("200");
      const initialSupply = await vaultBTC.totalSupply();

      await vaultBTC.connect(owner).burn(user1.address, burnAmount);

      expect(await vaultBTC.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should allow owner to burn with allowance", async function () {
      const burnAmount = ethers.parseEther("100");

      // user1 approves owner to burn their tokens
      await vaultBTC.connect(user1).approve(owner.address, burnAmount);

      // owner burns user1's tokens
      await vaultBTC.connect(owner).burn(user1.address, burnAmount);

      expect(await vaultBTC.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
    });

    it("Should revert when burning more than balance", async function () {
      const excessiveAmount = ethers.parseEther("10000");
      await expect(
        vaultBTC.connect(owner).burn(user1.address, excessiveAmount)
      ).to.be.reverted;
    });

    it("Should revert when burning without sufficient allowance", async function () {
      const burnAmount = ethers.parseEther("100");

      // user2 tries to burn user1's tokens without allowance
      await expect(
        vaultBTC.connect(owner).burn(user1.address, burnAmount)
      ).to.be.reverted;
    });
  });

  describe("ERC20 Standard Functions", function () {
    beforeEach(async function () {
      await vaultBTC.connect(owner).mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await vaultBTC.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await vaultBTC.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await vaultBTC.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
    });

    it("Should approve and transferFrom", async function () {
      const amount = ethers.parseEther("100");

      await vaultBTC.connect(user1).approve(user2.address, amount);
      await vaultBTC.connect(user2).transferFrom(user1.address, owner.address, amount);

      expect(await vaultBTC.balanceOf(owner.address)).to.equal(amount);
    });
  });

  describe("Pause Functionality", function () {
    beforeEach(async function () {
      await vaultBTC.connect(owner).mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should allow owner to pause", async function () {
      await vaultBTC.connect(owner).pause();
      expect(await vaultBTC.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await vaultBTC.connect(owner).pause();
      await vaultBTC.connect(owner).unpause();
      expect(await vaultBTC.paused()).to.be.false;
    });

    it("Should revert when non-owner tries to pause", async function () {
      await expect(
        vaultBTC.connect(user1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert when non-owner tries to unpause", async function () {
      await vaultBTC.connect(owner).pause();
      await expect(
        vaultBTC.connect(user1).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent minting when paused", async function () {
      await vaultBTC.connect(owner).pause();
      await expect(
        vaultBTC.connect(owner).mint(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent burning when paused", async function () {
      await vaultBTC.connect(owner).pause();
      await expect(
        vaultBTC.connect(owner).burn(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow transfers when paused", async function () {
      await vaultBTC.connect(owner).pause();
      await vaultBTC.connect(user1).transfer(user2.address, ethers.parseEther("100"));
      expect(await vaultBTC.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });
  });
});
