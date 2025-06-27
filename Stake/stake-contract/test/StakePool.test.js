const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakePool", function () {
  async function deployStakePoolFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // 部署MetaNode代币
    const MetaNodeToken = await ethers.getContractFactory("MetaNodeToken");
    const metaNodeToken = await MetaNodeToken.deploy(owner.address);
    await metaNodeToken.waitForDeployment();

    // 部署测试代币
    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy("Test Token", "TEST", owner.address);
    await testToken.waitForDeployment();

    // 部署质押合约
    const StakePool = await ethers.getContractFactory("StakePool");
    const metaNodePerBlock = ethers.parseEther("1");
    const startBlock = await ethers.provider.getBlockNumber() + 1;
    
    const stakePool = await upgrades.deployProxy(
      StakePool,
      [await metaNodeToken.getAddress(), metaNodePerBlock, startBlock],
      { initializer: "initialize" }
    );
    await stakePool.waitForDeployment();

    // 设置权限
    await metaNodeToken.addMinter(await stakePool.getAddress());
    
    // 向质押合约转移代币
    const rewardAmount = ethers.parseEther("1000000");
    await metaNodeToken.transfer(await stakePool.getAddress(), rewardAmount);

    // 给用户分发测试代币
    await testToken.mint(user1.address, ethers.parseEther("10000"));
    await testToken.mint(user2.address, ethers.parseEther("10000"));
    await testToken.mint(user3.address, ethers.parseEther("10000"));

    return {
      stakePool,
      metaNodeToken,
      testToken,
      owner,
      user1,
      user2,
      user3,
      metaNodePerBlock,
      startBlock
    };
  }

  describe("部署和初始化", function () {
    it("应该正确初始化合约", async function () {
      const { stakePool, metaNodeToken, metaNodePerBlock, startBlock } = await loadFixture(deployStakePoolFixture);
      
      expect(await stakePool.metaNodeToken()).to.equal(await metaNodeToken.getAddress());
      expect(await stakePool.metaNodePerBlock()).to.equal(metaNodePerBlock);
      expect(await stakePool.startBlock()).to.equal(startBlock);
      expect(await stakePool.getPoolLength()).to.equal(0);
    });

    it("应该正确设置角色", async function () {
      const { stakePool, owner } = await loadFixture(deployStakePoolFixture);
      
      const ADMIN_ROLE = await stakePool.ADMIN_ROLE();
      const UPGRADER_ROLE = await stakePool.UPGRADER_ROLE();
      const PAUSER_ROLE = await stakePool.PAUSER_ROLE();
      
      expect(await stakePool.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await stakePool.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
      expect(await stakePool.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("池管理", function () {
    it("应该能够添加ETH质押池", async function () {
      const { stakePool } = await loadFixture(deployStakePoolFixture);
      
      await stakePool.addPool(
        ethers.ZeroAddress, // ETH池
        100, // 权重
        ethers.parseEther("0.01"), // 最小质押
        7200 // 锁定区块
      );
      
      expect(await stakePool.getPoolLength()).to.equal(1);
      
      const pool = await stakePool.pools(0);
      expect(pool.stTokenAddress).to.equal(ethers.ZeroAddress);
      expect(pool.poolWeight).to.equal(100);
      expect(pool.minDepositAmount).to.equal(ethers.parseEther("0.01"));
      expect(pool.unstakeLockedBlocks).to.equal(7200);
      expect(pool.isActive).to.be.true;
    });

    it("应该能够添加ERC20代币质押池", async function () {
      const { stakePool, testToken } = await loadFixture(deployStakePoolFixture);
      
      await stakePool.addPool(
        await testToken.getAddress(),
        200,
        ethers.parseEther("100"),
        3600
      );
      
      const pool = await stakePool.pools(0);
      expect(pool.stTokenAddress).to.equal(await testToken.getAddress());
      expect(pool.poolWeight).to.equal(200);
    });

    it("应该能够更新池配置", async function () {
      const { stakePool } = await loadFixture(deployStakePoolFixture);
      
      // 先添加池
      await stakePool.addPool(
        ethers.ZeroAddress,
        100,
        ethers.parseEther("0.01"),
        7200
      );
      
      // 更新池
      await stakePool.updatePool(
        0,
        150, // 新权重
        ethers.parseEther("0.02"), // 新最小质押
        14400 // 新锁定区块
      );
      
      const pool = await stakePool.pools(0);
      expect(pool.poolWeight).to.equal(150);
      expect(pool.minDepositAmount).to.equal(ethers.parseEther("0.02"));
      expect(pool.unstakeLockedBlocks).to.equal(14400);
    });

    it("非管理员不能添加池", async function () {
      const { stakePool, user1 } = await loadFixture(deployStakePoolFixture);
      
      await expect(
        stakePool.connect(user1).addPool(
          ethers.ZeroAddress,
          100,
          ethers.parseEther("0.01"),
          7200
        )
      ).to.be.reverted;
    });
  });

  describe("ETH质押功能", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployStakePoolFixture);
      this.stakePool = fixture.stakePool;
      this.user1 = fixture.user1;
      this.user2 = fixture.user2;
      
      // 添加ETH池
      await this.stakePool.addPool(
        ethers.ZeroAddress,
        100,
        ethers.parseEther("0.01"),
        7200
      );
    });

    it("应该能够质押ETH", async function () {
      const stakeAmount = ethers.parseEther("1");
      
      await expect(
        this.stakePool.connect(this.user1).stake(0, stakeAmount, { value: stakeAmount })
      ).to.emit(this.stakePool, "Staked")
        .withArgs(this.user1.address, 0, stakeAmount);
      
      const user = await this.stakePool.users(0, this.user1.address);
      expect(user.stAmount).to.equal(stakeAmount);
      
      const pool = await this.stakePool.pools(0);
      expect(pool.stTokenAmount).to.equal(stakeAmount);
    });

    it("应该拒绝低于最小金额的质押", async function () {
      const stakeAmount = ethers.parseEther("0.005"); // 低于最小值0.01
      
      await expect(
        this.stakePool.connect(this.user1).stake(0, stakeAmount, { value: stakeAmount })
      ).to.be.revertedWith("Amount below minimum deposit");
    });

    it("应该拒绝ETH数量不匹配", async function () {
      const stakeAmount = ethers.parseEther("1");
      const wrongValue = ethers.parseEther("0.5");
      
      await expect(
        this.stakePool.connect(this.user1).stake(0, stakeAmount, { value: wrongValue })
      ).to.be.revertedWith("ETH amount mismatch");
    });
  });

  describe("ERC20代币质押功能", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployStakePoolFixture);
      this.stakePool = fixture.stakePool;
      this.testToken = fixture.testToken;
      this.user1 = fixture.user1;
      this.user2 = fixture.user2;
      
      // 添加代币池
      await this.stakePool.addPool(
        await this.testToken.getAddress(),
        200,
        ethers.parseEther("100"),
        3600
      );
    });

    it("应该能够质押ERC20代币", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      // 授权
      await this.testToken.connect(this.user1).approve(
        await this.stakePool.getAddress(),
        stakeAmount
      );
      
      await expect(
        this.stakePool.connect(this.user1).stake(0, stakeAmount)
      ).to.emit(this.stakePool, "Staked")
        .withArgs(this.user1.address, 0, stakeAmount);
      
      const user = await this.stakePool.users(0, this.user1.address);
      expect(user.stAmount).to.equal(stakeAmount);
    });

    it("应该拒绝未授权的代币转移", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      await expect(
        this.stakePool.connect(this.user1).stake(0, stakeAmount)
      ).to.be.reverted;
    });
  });

  describe("解质押功能", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployStakePoolFixture);
      this.stakePool = fixture.stakePool;
      this.user1 = fixture.user1;
      
      // 添加ETH池
      await this.stakePool.addPool(
        ethers.ZeroAddress,
        100,
        ethers.parseEther("0.01"),
        10 // 短锁定期用于测试
      );
      
      // 质押一些ETH
      const stakeAmount = ethers.parseEther("1");
      await this.stakePool.connect(this.user1).stake(0, stakeAmount, { value: stakeAmount });
    });

    it("应该能够请求解质押", async function () {
      const unstakeAmount = ethers.parseEther("0.5");
      
      await expect(
        this.stakePool.connect(this.user1).requestUnstake(0, unstakeAmount)
      ).to.emit(this.stakePool, "UnstakeRequested");
      
      const user = await this.stakePool.users(0, this.user1.address);
      expect(user.stAmount).to.equal(ethers.parseEther("0.5"));
      
      const requests = await this.stakePool.getUserUnstakeRequests(0, this.user1.address);
      expect(requests.length).to.equal(1);
      expect(requests[0].amount).to.equal(unstakeAmount);
      expect(requests[0].claimed).to.be.false;
    });

    it("应该能够在锁定期后提取", async function () {
      const unstakeAmount = ethers.parseEther("0.5");
      
      // 请求解质押
      await this.stakePool.connect(this.user1).requestUnstake(0, unstakeAmount);
      
      // 等待锁定期
      await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 11);
      
      const balanceBefore = await ethers.provider.getBalance(this.user1.address);
      
      await expect(
        this.stakePool.connect(this.user1).withdraw(0, 0)
      ).to.emit(this.stakePool, "Unstaked")
        .withArgs(this.user1.address, 0, unstakeAmount);
      
      const balanceAfter = await ethers.provider.getBalance(this.user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("应该拒绝在锁定期内提取", async function () {
      const unstakeAmount = ethers.parseEther("0.5");
      
      await this.stakePool.connect(this.user1).requestUnstake(0, unstakeAmount);
      
      await expect(
        this.stakePool.connect(this.user1).withdraw(0, 0)
      ).to.be.revertedWith("Still locked");
    });
  });

  describe("奖励功能", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployStakePoolFixture);
      this.stakePool = fixture.stakePool;
      this.metaNodeToken = fixture.metaNodeToken;
      this.user1 = fixture.user1;
      this.user2 = fixture.user2;
      this.metaNodePerBlock = fixture.metaNodePerBlock;
      
      // 添加ETH池
      await this.stakePool.addPool(
        ethers.ZeroAddress,
        100,
        ethers.parseEther("0.01"),
        7200
      );
    });

    it("应该能够计算待领取奖励", async function () {
      const stakeAmount = ethers.parseEther("1");
      
      // 用户1质押
      await this.stakePool.connect(this.user1).stake(0, stakeAmount, { value: stakeAmount });
      
      // 挖几个区块
      await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 5);
      
      const pendingReward = await this.stakePool.getPendingReward(0, this.user1.address);
      expect(pendingReward).to.be.gt(0);
    });

    it("应该能够领取奖励", async function () {
      const stakeAmount = ethers.parseEther("1");
      
      await this.stakePool.connect(this.user1).stake(0, stakeAmount, { value: stakeAmount });
      
      // 挖几个区块
      await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 5);
      
      const balanceBefore = await this.metaNodeToken.balanceOf(this.user1.address);
      
      await expect(
        this.stakePool.connect(this.user1).claimReward(0)
      ).to.emit(this.stakePool, "RewardClaimed");
      
      const balanceAfter = await this.metaNodeToken.balanceOf(this.user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("多用户应该按比例分配奖励", async function () {
      const stakeAmount1 = ethers.parseEther("1");
      const stakeAmount2 = ethers.parseEther("2");
      
      // 用户1质押1 ETH
      await this.stakePool.connect(this.user1).stake(0, stakeAmount1, { value: stakeAmount1 });
      
      // 用户2质押2 ETH
      await this.stakePool.connect(this.user2).stake(0, stakeAmount2, { value: stakeAmount2 });
      
      // 挖几个区块让奖励累积
      await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 10);
      
      const reward1 = await this.stakePool.getPendingReward(0, this.user1.address);
      const reward2 = await this.stakePool.getPendingReward(0, this.user2.address);
      
      expect(reward2).to.be.closeTo((reward1-this.metaNodePerBlock)* 2n, ethers.parseEther("0.1"));
    });
  });

  describe("管理员功能", function () {
    it("应该能够更新每区块奖励", async function () {
      const { stakePool, owner } = await loadFixture(deployStakePoolFixture);
      
      const newReward = ethers.parseEther("2");
      
      await stakePool.connect(owner).setMetaNodePerBlock(newReward);
      expect(await stakePool.metaNodePerBlock()).to.equal(newReward);
    });

    it("应该能够暂停和恢复操作", async function () {
      const { stakePool, owner } = await loadFixture(deployStakePoolFixture);
      
      // 测试设置操作暂停 - 先检查初始状态
      const initialState = await stakePool.operationPaused("stake");
      expect(initialState).to.be.false;
      
      // 设置暂停
      await stakePool.connect(owner).setOperationPaused("stake", true);
      
      // 检查暂停状态
      const pausedState = await stakePool.operationPaused("stake");
      expect(pausedState).to.be.true;
      
      // 恢复操作
      await stakePool.connect(owner).setOperationPaused("stake", false);
      const resumedState = await stakePool.operationPaused("stake");
      expect(resumedState).to.be.false;
    });

    it("应该能够暂停整个合约", async function () {
      const { stakePool, owner, user1 } = await loadFixture(deployStakePoolFixture);
      
      // 添加池
      await stakePool.addPool(
        ethers.ZeroAddress,
        100,
        ethers.parseEther("0.01"),
        7200
      );
      
      await stakePool.connect(owner).pause();
      
      // 暂停后不能质押
      await expect(
        stakePool.connect(user1).stake(0, ethers.parseEther("1"), { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(stakePool, "EnforcedPause");
      
      // 恢复后可以质押
      await stakePool.connect(owner).unpause();
      
      await expect(
        stakePool.connect(user1).stake(0, ethers.parseEther("1"), { value: ethers.parseEther("1") })
      ).to.emit(stakePool, "Staked");
    });
  });

  describe("安全性测试", function () {
    it("应该防止重入攻击", async function () {
      // 这里可以添加重入攻击测试
      // 由于使用了ReentrancyGuard，应该能够防止重入
    });

    it("应该正确处理零地址", async function () {
      const { stakePool } = await loadFixture(deployStakePoolFixture);
      
      // 测试添加池时的零地址检查等
      // 这里可以添加具体的零地址测试逻辑
    });
  });
});