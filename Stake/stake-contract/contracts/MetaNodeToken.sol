// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title MetaNodeToken
 * @dev MetaNode代币合约，用作质押系统的奖励代币
 */
contract MetaNodeToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    // 最大供应量
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 10亿代币
    
    // 铸造者映射
    mapping(address => bool) public minters;
    
    // 事件
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount);
    
    /**
     * @dev 构造函数
     * @param _initialOwner 初始所有者地址
     */
    constructor(address _initialOwner) 
        ERC20("MetaNode Token", "META") 
        Ownable(_initialOwner)
        ERC20Permit("MetaNode Token")
    {
        // 初始铸造给所有者 10% 的代币用于初始分配
        uint256 initialMint = MAX_SUPPLY * 10 / 100; // 1亿代币
        _mint(_initialOwner, initialMint);
        
        emit TokensMinted(_initialOwner, initialMint);
    }
    
    /**
     * @dev 添加铸造者
     * @param _minter 铸造者地址
     */
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid minter address");
        require(!minters[_minter], "Already a minter");
        
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    /**
     * @dev 移除铸造者
     * @param _minter 铸造者地址
     */
    function removeMinter(address _minter) external onlyOwner {
        require(minters[_minter], "Not a minter");
        
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    /**
     * @dev 铸造代币（只有铸造者可以调用）
     * @param _to 接收者地址
     * @param _amount 铸造数量
     */
    function mint(address _to, uint256 _amount) external {
        require(minters[msg.sender], "Not authorized to mint");
        require(_to != address(0), "Invalid recipient address");
        require(totalSupply() + _amount <= MAX_SUPPLY, "Exceeds maximum supply");
        
        _mint(_to, _amount);
        emit TokensMinted(_to, _amount);
    }
    
    /**
     * @dev 批量铸造代币
     * @param _recipients 接收者地址数组
     * @param _amounts 对应的铸造数量数组
     */
    function batchMint(address[] calldata _recipients, uint256[] calldata _amounts) external {
        require(minters[msg.sender], "Not authorized to mint");
        require(_recipients.length == _amounts.length, "Arrays length mismatch");
        require(_recipients.length > 0, "Empty arrays");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Exceeds maximum supply");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient address");
            _mint(_recipients[i], _amounts[i]);
            emit TokensMinted(_recipients[i], _amounts[i]);
        }
    }
    
    /**
     * @dev 检查是否为铸造者
     * @param _account 要检查的地址
     * @return 是否为铸造者
     */
    function isMinter(address _account) external view returns (bool) {
        return minters[_account];
    }
    
    /**
     * @dev 获取剩余可铸造数量
     * @return 剩余可铸造的代币数量
     */
    function getRemainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    /**
     * @dev 紧急暂停功能（可以通过继承Pausable实现更复杂的暂停逻辑）
     * 这里提供基础的所有者紧急提取功能
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }
    
    /**
     * @dev 重写transfer函数以添加额外的检查（如果需要）
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(to != address(0), "Transfer to zero address");
        return super.transfer(to, amount);
    }
    
    /**
     * @dev 重写transferFrom函数以添加额外的检查（如果需要）
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        require(to != address(0), "Transfer to zero address");
        return super.transferFrom(from, to, amount);
    }
}