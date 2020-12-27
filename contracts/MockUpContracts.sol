// SPDX-License-Identifier: GPL-3.0-or-later
//
// Mock-up contracts that provide the same interfaces as mainnet contracts, and
// have mechanisms built in to mimic their actual behaviors. Used for testing.
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";


contract FakeWBTC is ERC20("Fake WBTC", "FakeWBTC") {
    constructor() {
        _setupDecimals(8);
    }

    function mint(address recipient, uint amount) external {
        _mint(recipient, amount);
    }
}


contract FakeHegic is ERC20("Fake HEGIC", "FakeHEGIC") {
    constructor() {}

    function mint(uint amount) external {
        _mint(msg.sender, amount);
    }
}


contract FakeRHegic is ERC20("Fake rHEGIC", "FakeRHEGIC") {
    constructor() {}

    function mint(uint amount) external {
        _mint(msg.sender, amount);
    }

    // Need to make the bytecode different from that of Fake HEGIC
    // otherwise Hardhat can't verify it on etherscan
    function isIOU() external pure returns (bool) {
        return true;
    }
}


contract FakeSHegic is ERC20("Fake sHEGIC", "FakeSHEGIC") {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    ERC20 public HEGIC;
    FakeWBTC public WBTC;

    constructor(ERC20 _HEGIC, FakeWBTC _WBTC) {
        HEGIC = _HEGIC;
        WBTC = _WBTC;
    }

    // Payable
    receive() external payable {}

    function deposit(uint amount) external {
        HEGIC.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }

    // If the sender holds nonzero amount of sHEGIC, simply sends fixed amounts
    // of ETH & WBTC. Simulates the behavior of the actual claimAllProfit function.
    function claimAllProfit() external {
        if (balanceOf(msg.sender) > 0) {
            payable(msg.sender).transfer(100000000000000000);  // 0.1 ether
            WBTC.mint(msg.sender, 1000000);  // 0.01 WBTC
        }
    }

    function profitOf(address account, uint asset) public pure returns (uint profit) {
        if (asset == 0) {
            profit = 1000000;  // 0 = WBTC
        } else {
            profit = 100000000000000000;  // 1 = ETH
        }
    }
}


contract FakeZHegic is Ownable, ERC20("Fake zHEGIC", "FakeZHEGIC") {
    address public pool;

    modifier onlyPool {
        require(msg.sender == pool, "Only zLOT HEGIC pool can call this function");
        _;
    }

    function setPool (address _pool) external onlyOwner {
        pool = _pool;
    }

    function mint(address account, uint amount) external onlyPool {
        _mint(account, amount);
    }
}


// To simulate the floating conversion rate of zHEGIC/HEGIC, here we start with
// 1:1, then increase a preset percentage per block.
// e.g. One blocks after the contract is created, 1 zHEGIC will worth 1.05 HEGIC;
// another block after that, 1 zHEGIC will worth 1.10 HEGIC, etc.
contract FakeZLotPool is Ownable {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    ERC20 public immutable HEGIC;
    FakeZHegic public immutable zHEGIC;

    uint public start;
    uint rateIncreasePerBlock;

    constructor(ERC20 _HEGIC, FakeZHegic _zHEGIC, uint _rateIncreasePerBlock) {
        HEGIC = _HEGIC;
        zHEGIC = _zHEGIC;
        start = block.number;
        rateIncreasePerBlock = _rateIncreasePerBlock;
    }

    /**
     * @dev Reset the start block to the current block. Added this function so I
     * can reuse the same contract instances for multiple tests. Same goes for `setRateIncrease`.
     */
    function resetStartBlock() external onlyOwner {
        start = block.number;
    }

    function setRateIncrease(uint _rateIncreasePerBlock) external onlyOwner {
        rateIncreasePerBlock = _rateIncreasePerBlock;
    }

    function deposit(uint amount) external returns (uint zTokenAmount) {
        uint blocksPassed = (block.number).sub(start);
        zTokenAmount = amount.mul(100).div(blocksPassed.mul(rateIncreasePerBlock).add(100));

        HEGIC.safeTransferFrom(msg.sender, address(this), amount);
        zHEGIC.mint(msg.sender, zTokenAmount);
    }
}
