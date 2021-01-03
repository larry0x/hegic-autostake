// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./MockZHegic.sol";


/**
 * @dev To simulate the floating conversion rate of zHEGIC/HEGIC, here we start
 * with 1:1, then increase a preset percentage per block. e.g. One blocks after
 * the contract is created, 1 zHEGIC will worth 1.05 HEGIC; another block after
 * that, 1 zHEGIC will worth 1.10 HEGIC, etc.
 */
contract MockZLotPool is Ownable {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    ERC20 public immutable HEGIC;
    MockZHegic public immutable zHEGIC;

    uint public start;
    uint rateIncreasePerBlock;

    constructor(ERC20 _HEGIC, MockZHegic _zHEGIC, uint _rateIncreasePerBlock) {
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
