// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StakePool
 * @dev 多池质押合约，支持多种代币质押并分配MetaNode代币奖励
 */
contract StakePool is 
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // 角色定义
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // 质押池结构
    struct Pool {
        address stTokenAddress;      // 质押代币地址 (address(0) 表示 ETH)
        uint256 poolWeight;          // 池权重
        uint256 lastRewardBlock;     // 最后奖励区块
        uint256 accMetaNodePerST;    // 每个质押代币累积的MetaNode数量
        uint256 stTokenAmount;       // 池中总质押代币量
        uint256 minDepositAmount;    // 最小质押金额
        uint256 unstakeLockedBlocks; // 解质押锁定区块数
        bool isActive;               // 池是否激活
    }

    // 用户信息结构
    struct User {
        uint256 stAmount;           // 用户质押数量
        uint256 finishedMetaNode;   // 已分配的MetaNode数量
        uint256 pendingMetaNode;    // 待领取的MetaNode数量
        UnstakeRequest[] requests;  // 解质押请求列表
    }

    // 解质押请求结构
    struct UnstakeRequest {
        uint256 amount;      // 解质押数量
        uint256 unlockBlock; // 解锁区块号
        bool claimed;        // 是否已领取
    }

    // 状态变量
    IERC20 public metaNodeToken;           // MetaNode奖励代币
    uint256 public metaNodePerBlock;       // 每区块MetaNode产出
    uint256 public totalPoolWeight;       // 总池权重
    uint256 public startBlock;             // 开始区块
    uint256 public endBlock;               // 结束区块
    
    Pool[] public pools;                   // 质押池数组
    mapping(uint256 => mapping(address => User)) public users; // 用户信息映射
    
    // 暂停控制
    mapping(string => bool) public operationPaused;

    // 事件定义
    event PoolAdded(uint256 indexed pid, address indexed stTokenAddress, uint256 poolWeight, uint256 minDepositAmount, uint256 unstakeLockedBlocks);
    event PoolUpdated(uint256 indexed pid, uint256 poolWeight, uint256 minDepositAmount, uint256 unstakeLockedBlocks);
    event Staked(address indexed user, uint256 indexed pid, uint256 amount);
    event UnstakeRequested(address indexed user, uint256 indexed pid, uint256 amount, uint256 unlockBlock);
    event Unstaked(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardClaimed(address indexed user, uint256 indexed pid, uint256 amount);
    event MetaNodePerBlockUpdated(uint256 oldValue, uint256 newValue);
    event OperationPausedUpdated(string operation, bool paused);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化合约
     */
    function initialize(
        address _metaNodeToken,
        uint256 _metaNodePerBlock,
        uint256 _startBlock
    ) public initializer {
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        metaNodeToken = IERC20(_metaNodeToken);
        metaNodePerBlock = _metaNodePerBlock;
        startBlock = _startBlock;
        endBlock = _startBlock + 365 * 24 * 60 * 60 / 12; // 默认1年后结束

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev 添加新的质押池
     */
    function addPool(
        address _stTokenAddress,
        uint256 _poolWeight,
        uint256 _minDepositAmount,
        uint256 _unstakeLockedBlocks
    ) external onlyRole(ADMIN_ROLE) {
        require(_poolWeight > 0, "Pool weight must be greater than 0");
        require(_minDepositAmount > 0, "Min deposit amount must be greater than 0");
        require(_unstakeLockedBlocks > 0, "Unstake locked blocks must be greater than 0");

        massUpdatePools();

        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalPoolWeight += _poolWeight;

        pools.push(Pool({
            stTokenAddress: _stTokenAddress,
            poolWeight: _poolWeight,
            lastRewardBlock: lastRewardBlock,
            accMetaNodePerST: 0,
            stTokenAmount: 0,
            minDepositAmount: _minDepositAmount,
            unstakeLockedBlocks: _unstakeLockedBlocks,
            isActive: true
        }));

        emit PoolAdded(pools.length - 1, _stTokenAddress, _poolWeight, _minDepositAmount, _unstakeLockedBlocks);
    }

    /**
     * @dev 更新质押池配置
     */
    function updatePool(
        uint256 _pid,
        uint256 _poolWeight,
        uint256 _minDepositAmount,
        uint256 _unstakeLockedBlocks
    ) external onlyRole(ADMIN_ROLE) {
        require(_pid < pools.length, "Pool does not exist");
        require(_poolWeight > 0, "Pool weight must be greater than 0");
        require(_minDepositAmount > 0, "Min deposit amount must be greater than 0");
        require(_unstakeLockedBlocks > 0, "Unstake locked blocks must be greater than 0");

        massUpdatePools();

        Pool storage pool = pools[_pid];
        totalPoolWeight = totalPoolWeight - pool.poolWeight + _poolWeight;
        pool.poolWeight = _poolWeight;
        pool.minDepositAmount = _minDepositAmount;
        pool.unstakeLockedBlocks = _unstakeLockedBlocks;

        emit PoolUpdated(_pid, _poolWeight, _minDepositAmount, _unstakeLockedBlocks);
    }

    /**
     * @dev 质押代币
     */
    function stake(uint256 _pid, uint256 _amount) external payable nonReentrant whenNotPaused {
        require(!operationPaused["stake"], "Stake operation is paused");
        require(_pid < pools.length, "Pool does not exist");
        require(pools[_pid].isActive, "Pool is not active");
        require(_amount >= pools[_pid].minDepositAmount, "Amount below minimum deposit");

        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];

        updatePool(_pid);

        // 处理待领取奖励
        if (user.stAmount > 0) {
            uint256 pending = (user.stAmount * pool.accMetaNodePerST / 1e12) - user.finishedMetaNode;
            if (pending > 0) {
                user.pendingMetaNode += pending;
            }
        }

        // 转移代币
        if (pool.stTokenAddress == address(0)) {
            // ETH质押
            require(msg.value == _amount, "ETH amount mismatch");
        } else {
            // ERC20代币质押
            require(msg.value == 0, "Should not send ETH for ERC20 staking");
            IERC20(pool.stTokenAddress).safeTransferFrom(msg.sender, address(this), _amount);
        }

        // 更新状态
        user.stAmount += _amount;
        pool.stTokenAmount += _amount;
        user.finishedMetaNode = user.stAmount * pool.accMetaNodePerST / 1e12;

        emit Staked(msg.sender, _pid, _amount);
    }

    /**
     * @dev 请求解除质押
     */
    function requestUnstake(uint256 _pid, uint256 _amount) external nonReentrant whenNotPaused {
        require(!operationPaused["unstake"], "Unstake operation is paused");
        require(_pid < pools.length, "Pool does not exist");
        require(_amount > 0, "Amount must be greater than 0");

        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];
        require(user.stAmount >= _amount, "Insufficient staked amount");

        updatePool(_pid);

        // 处理待领取奖励
        uint256 pending = (user.stAmount * pool.accMetaNodePerST / 1e12) - user.finishedMetaNode;
        if (pending > 0) {
            user.pendingMetaNode += pending;
        }

        // 更新状态
        user.stAmount -= _amount;
        pool.stTokenAmount -= _amount;
        user.finishedMetaNode = user.stAmount * pool.accMetaNodePerST / 1e12;

        // 添加解质押请求
        uint256 unlockBlock = block.number + pool.unstakeLockedBlocks;
        user.requests.push(UnstakeRequest({
            amount: _amount,
            unlockBlock: unlockBlock,
            claimed: false
        }));

        emit UnstakeRequested(msg.sender, _pid, _amount, unlockBlock);
    }

    /**
     * @dev 提取解质押的代币
     */
    function withdraw(uint256 _pid, uint256 _requestIndex) external nonReentrant whenNotPaused {
        require(!operationPaused["withdraw"], "Withdraw operation is paused");
        require(_pid < pools.length, "Pool does not exist");
        
        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];
        require(_requestIndex < user.requests.length, "Invalid request index");
        
        UnstakeRequest storage request = user.requests[_requestIndex];
        require(!request.claimed, "Already claimed");
        require(block.number >= request.unlockBlock, "Still locked");
        
        request.claimed = true;
        
        // 转移代币
        if (pool.stTokenAddress == address(0)) {
            // 转移ETH
            payable(msg.sender).transfer(request.amount);
        } else {
            // 转移ERC20代币
            IERC20(pool.stTokenAddress).safeTransfer(msg.sender, request.amount);
        }
        
        emit Unstaked(msg.sender, _pid, request.amount);
    }

    /**
     * @dev 领取奖励
     */
    function claimReward(uint256 _pid) external nonReentrant whenNotPaused {
        require(!operationPaused["claim"], "Claim operation is paused");
        require(_pid < pools.length, "Pool does not exist");

        Pool storage pool = pools[_pid];
        User storage user = users[_pid][msg.sender];

        updatePool(_pid);

        uint256 pending = (user.stAmount * pool.accMetaNodePerST / 1e12) - user.finishedMetaNode;
        uint256 totalReward = user.pendingMetaNode + pending;
        
        require(totalReward > 0, "No reward to claim");

        user.pendingMetaNode = 0;
        user.finishedMetaNode = user.stAmount * pool.accMetaNodePerST / 1e12;

        metaNodeToken.safeTransfer(msg.sender, totalReward);

        emit RewardClaimed(msg.sender, _pid, totalReward);
    }

    /**
     * @dev 更新单个池的奖励
     */
    function updatePool(uint256 _pid) public {
        require(_pid < pools.length, "Pool does not exist");
        
        Pool storage pool = pools[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        
        if (pool.stTokenAmount == 0 || !pool.isActive) {
            pool.lastRewardBlock = block.number;
            return;
        }
        
        uint256 blockReward = getBlockReward(pool.lastRewardBlock, block.number);
        uint256 poolReward = blockReward * pool.poolWeight / totalPoolWeight;
        
        pool.accMetaNodePerST += poolReward * 1e12 / pool.stTokenAmount;
        pool.lastRewardBlock = block.number;
    }

    /**
     * @dev 批量更新所有池
     */
    function massUpdatePools() public {
        for (uint256 pid = 0; pid < pools.length; pid++) {
            updatePool(pid);
        }
    }

    /**
     * @dev 计算区块奖励
     */
    function getBlockReward(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_from >= endBlock) {
            return 0;
        }
        if (_to > endBlock) {
            _to = endBlock;
        }
        return (_to - _from) * metaNodePerBlock;
    }

    /**
     * @dev 获取用户待领取奖励
     */
    function getPendingReward(uint256 _pid, address _user) external view returns (uint256) {
        require(_pid < pools.length, "Pool does not exist");
        
        Pool storage pool = pools[_pid];
        User storage user = users[_pid][_user];
        
        uint256 accMetaNodePerST = pool.accMetaNodePerST;
        if (block.number > pool.lastRewardBlock && pool.stTokenAmount > 0 && pool.isActive) {
            uint256 blockReward = getBlockReward(pool.lastRewardBlock, block.number);
            uint256 poolReward = blockReward * pool.poolWeight / totalPoolWeight;
            accMetaNodePerST += poolReward * 1e12 / pool.stTokenAmount;
        }
        
        uint256 pending = (user.stAmount * accMetaNodePerST / 1e12) - user.finishedMetaNode;
        return user.pendingMetaNode + pending;
    }

    /**
     * @dev 获取用户解质押请求
     */
    function getUserUnstakeRequests(uint256 _pid, address _user) external view returns (UnstakeRequest[] memory) {
        return users[_pid][_user].requests;
    }

    /**
     * @dev 获取池数量
     */
    function getPoolLength() external view returns (uint256) {
        return pools.length;
    }

    // 管理员功能
    function setMetaNodePerBlock(uint256 _metaNodePerBlock) external onlyRole(ADMIN_ROLE) {
        massUpdatePools();
        uint256 oldValue = metaNodePerBlock;
        metaNodePerBlock = _metaNodePerBlock;
        emit MetaNodePerBlockUpdated(oldValue, _metaNodePerBlock);
    }

    function setEndBlock(uint256 _endBlock) external onlyRole(ADMIN_ROLE) {
        require(_endBlock > block.number, "End block must be in the future");
        endBlock = _endBlock;
    }

    function setPoolActive(uint256 _pid, bool _isActive) external onlyRole(ADMIN_ROLE) {
        require(_pid < pools.length, "Pool does not exist");
        pools[_pid].isActive = _isActive;
    }

    function setOperationPaused(string memory _operation, bool _paused) external onlyRole(PAUSER_ROLE) {
        operationPaused[_operation] = _paused;
        emit OperationPausedUpdated(_operation, _paused);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        if (_token == address(0)) {
            payable(msg.sender).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // 接收ETH
    receive() external payable {}
}