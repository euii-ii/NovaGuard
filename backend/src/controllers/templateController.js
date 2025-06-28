const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabaseAuth = require('../middleware/supabaseAuth');
const supabaseService = require('../services/supabaseService');
const logger = require('../utils/logger');

// Predefined templates
const defaultTemplates = [
  {
    id: 'erc20-basic',
    name: 'ERC-20 Token',
    version: '1.0.0',
    description: 'Standard ERC-20 token implementation with basic functionality',
    category: 'Token',
    network: 'Ethereum',
    files: {
      'contracts/Token.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol, uint256 initialSupply) 
        ERC20(name, symbol) 
        Ownable(msg.sender) 
    {
        _mint(msg.sender, initialSupply * 10**decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`,
      'scripts/deploy.js': `const { ethers } = require("hardhat");

async function main() {
    const Token = await ethers.getContractFactory("MyToken");
    const token = await Token.deploy("MyToken", "MTK", 1000000);
    await token.deployed();
    console.log("Token deployed to:", token.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});`,
      'test/Token.test.js': `const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken", function () {
    it("Should deploy with correct initial supply", async function () {
        const Token = await ethers.getContractFactory("MyToken");
        const token = await Token.deploy("Test", "TST", 1000);
        
        const [owner] = await ethers.getSigners();
        const balance = await token.balanceOf(owner.address);
        expect(balance).to.equal(ethers.utils.parseEther("1000"));
    });
});`
    }
  },
  {
    id: 'erc721-nft',
    name: 'ERC-721 NFT',
    version: '1.0.0',
    description: 'Non-fungible token (NFT) contract with minting capabilities',
    category: 'NFT',
    network: 'Ethereum',
    files: {
      'contracts/NFT.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}

    function mintNFT(address recipient, string memory tokenURI) 
        public onlyOwner returns (uint256) 
    {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }
}`
    }
  },
  {
    id: 'defi-staking',
    name: 'DeFi Staking Pool',
    version: '1.0.0',
    description: 'Staking contract with rewards distribution',
    category: 'DeFi',
    network: 'Ethereum',
    files: {
      'contracts/StakingPool.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakingPool is Ownable, ReentrancyGuard {
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    
    uint256 public rewardRate = 100; // tokens per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;
    
    uint256 private _totalSupply;
    
    constructor(address _stakingToken, address _rewardToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }
    
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply += amount;
        balances[msg.sender] += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }
    
    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply -= amount;
        balances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
    }
    
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
    
    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + 
            (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / _totalSupply);
    }
    
    function earned(address account) public view returns (uint256) {
        return ((balances[account] * 
            (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) + 
            rewards[account];
    }
}`
    }
  },
  {
    id: 'dao-governance',
    name: 'DAO Governance',
    version: '1.0.0',
    description: 'Decentralized governance contract with voting mechanisms',
    category: 'Governance',
    network: 'Ethereum',
    files: {
      'contracts/DAOGovernance.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DAOGovernance is Ownable {
    IERC20 public governanceToken;
    
    struct Proposal {
        uint256 id;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public votingPeriod = 7 days;
    uint256 public quorum = 1000000 * 10**18; // 1M tokens
    
    event ProposalCreated(uint256 indexed proposalId, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    
    constructor(address _governanceToken) Ownable(msg.sender) {
        governanceToken = IERC20(_governanceToken);
    }
    
    function createProposal(string memory description) external returns (uint256) {
        require(governanceToken.balanceOf(msg.sender) >= 10000 * 10**18, "Insufficient tokens to propose");
        
        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.description = description;
        newProposal.deadline = block.timestamp + votingPeriod;
        
        emit ProposalCreated(proposalCount, description);
        return proposalCount;
    }
    
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp < proposal.deadline, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }
        
        emit VoteCast(proposalId, msg.sender, support, weight);
    }
}`
    }
  }
];

// Get all templates
router.get('/list', async (req, res) => {
  try {
    const { category, network, search } = req.query;
    
    let filteredTemplates = [...defaultTemplates];
    
    // Filter by category
    if (category && category !== 'All') {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }
    
    // Filter by network
    if (network && network !== 'All') {
      filteredTemplates = filteredTemplates.filter(t => t.network === network);
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      success: true,
      data: filteredTemplates
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get template by ID
router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = defaultTemplates.find(t => t.id === templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get template categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = [...new Set(defaultTemplates.map(t => t.category))];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get supported networks
router.get('/meta/networks', async (req, res) => {
  try {
    const networks = [...new Set(defaultTemplates.map(t => t.network))];
    
    res.json({
      success: true,
      data: networks
    });
  } catch (error) {
    logger.error('Error fetching networks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
