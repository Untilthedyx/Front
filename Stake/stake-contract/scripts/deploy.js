const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("开始部署合约...");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 1. 部署 MetaNode 代币
  console.log("\n1. 部署 MetaNode 代币...");
  const MetaNodeToken = await ethers.getContractFactory("MetaNodeToken");
  const metaNodeToken = await MetaNodeToken.deploy(deployer.address);
  await metaNodeToken.waitForDeployment();
  const metaNodeTokenAddress = await metaNodeToken.getAddress();
  console.log("MetaNode 代币地址:", metaNodeTokenAddress);

  // 2. 部署测试代币（可选）
  console.log("\n2. 部署测试代币...");
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy("Test Stake Token", "TST", deployer.address);
  await testToken.waitForDeployment();
  const testTokenAddress = await testToken.getAddress();
  console.log("测试代币地址:", testTokenAddress);

  // 3. 部署质押合约（使用代理模式）
  console.log("\n3. 部署质押合约...");
  const StakePool = await ethers.getContractFactory("StakePool");
  
  // 质押合约初始化参数
  const metaNodePerBlock = ethers.parseEther("1"); // 每区块1个MetaNode代币
  const startBlock = await ethers.provider.getBlockNumber() + 10; // 10个区块后开始
  
  const stakePool = await upgrades.deployProxy(
    StakePool,
    [metaNodeTokenAddress, metaNodePerBlock, startBlock],
    { initializer: "initialize" }
  );
  await stakePool.waitForDeployment();
  const stakePoolAddress = await stakePool.getAddress();
  console.log("质押合约地址:", stakePoolAddress);

  // 4. 设置权限
  console.log("\n4. 设置权限...");
  
  // 将质押合约设置为MetaNode代币的铸造者
  await metaNodeToken.addMinter(stakePoolAddress);
  console.log("已将质押合约设置为MetaNode代币铸造者");
  
  // 向质押合约转移一些MetaNode代币用于奖励分发
  const rewardAmount = ethers.parseEther("1000000"); // 100万代币
  await metaNodeToken.transfer(stakePoolAddress, rewardAmount);
  console.log("已向质押合约转移", ethers.formatEther(rewardAmount), "MetaNode代币");

  // 5. 添加质押池
  console.log("\n5. 添加质押池...");
  
  // 添加ETH质押池
  const ethPoolWeight = 100;
  const ethMinDeposit = ethers.parseEther("0.01"); // 最小质押0.01 ETH
  const ethUnstakeBlocks = 7200; // 约1天的区块数（假设12秒一个区块）
  
  await stakePool.addPool(
    ethers.ZeroAddress, // ETH池使用零地址
    ethPoolWeight,
    ethMinDeposit,
    ethUnstakeBlocks
  );
  console.log("已添加ETH质押池 (池ID: 0)");
  
  // 添加测试代币质押池
  const tokenPoolWeight = 200;
  const tokenMinDeposit = ethers.parseEther("100"); // 最小质押100个代币
  const tokenUnstakeBlocks = 3600; // 约12小时的区块数
  
  await stakePool.addPool(
    testTokenAddress,
    tokenPoolWeight,
    tokenMinDeposit,
    tokenUnstakeBlocks
  );
  console.log("已添加测试代币质押池 (池ID: 1)");

  // 6. 输出部署信息
  console.log("\n=== 部署完成 ===");
  console.log("MetaNode代币地址:", metaNodeTokenAddress);
  console.log("测试代币地址:", testTokenAddress);
  console.log("质押合约地址:", stakePoolAddress);
  console.log("\n=== 合约验证命令 ===");
  console.log(`npx hardhat verify --network sepolia ${metaNodeTokenAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network sepolia ${testTokenAddress} "Test Stake Token" "TST" "${deployer.address}"`);
  console.log(`npx hardhat verify --network sepolia ${stakePoolAddress}`);
  
  // 7. 保存部署信息到文件
  const deploymentInfo = {
    network: "sepolia",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MetaNodeToken: {
        address: metaNodeTokenAddress,
        name: "MetaNode Token",
        symbol: "META"
      },
      TestToken: {
        address: testTokenAddress,
        name: "Test Stake Token",
        symbol: "TST"
      },
      StakePool: {
        address: stakePoolAddress,
        metaNodePerBlock: ethers.formatEther(metaNodePerBlock),
        startBlock: startBlock
      }
    },
    pools: [
      {
        id: 0,
        name: "ETH Pool",
        stTokenAddress: ethers.ZeroAddress,
        poolWeight: ethPoolWeight,
        minDepositAmount: ethers.formatEther(ethMinDeposit),
        unstakeLockedBlocks: ethUnstakeBlocks
      },
      {
        id: 1,
        name: "Test Token Pool",
        stTokenAddress: testTokenAddress,
        poolWeight: tokenPoolWeight,
        minDepositAmount: ethers.formatEther(tokenMinDeposit),
        unstakeLockedBlocks: tokenUnstakeBlocks
      }
    ]
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    './deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n部署信息已保存到 deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });