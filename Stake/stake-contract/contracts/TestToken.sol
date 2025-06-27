// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestToken
 * @dev 测试用ERC20代币，可用作质押代币
 */
contract TestToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 10亿代币
    
    /**
     * @dev 构造函数
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _initialOwner 初始所有者
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) ERC20(_name, _symbol) Ownable(_initialOwner) {
        // 初始铸造 50% 给所有者
        uint256 initialMint = MAX_SUPPLY * 50 / 100;
        _mint(_initialOwner, initialMint);
    }
    
    /**
     * @dev 铸造代币（仅所有者）
     * @param _to 接收者地址
     * @param _amount 铸造数量
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Invalid recipient");
        require(totalSupply() + _amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(_to, _amount);
    }
    
    /**
     * @dev 免费领取代币（用于测试）
     * @param _amount 领取数量
     */
    function faucet(uint256 _amount) external {
        require(_amount <= 1000 * 10**18, "Amount too large"); // 最多领取1000个
        require(totalSupply() + _amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(msg.sender, _amount);
    }
    
    /**
     * @dev 批量空投（仅所有者）
     * @param _recipients 接收者数组
     * @param _amounts 对应数量数组
     */
    function batchAirdrop(address[] calldata _recipients, uint256[] calldata _amounts) external onlyOwner {
        require(_recipients.length == _amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient");
            _mint(_recipients[i], _amounts[i]);
        }
    }
}