// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./interfaces/IHegicStakingPool.sol";
import "./AutoStake.sol";


/**
 * @author Larrypc
 * @title AutoStakeToSHegic
 * @notice Pools HegicIOUToken (rHEGIC) together and deposits to the rHEGIC --> HEGIC
 * redemption contract; withdraws HEGIC and deposits to jmonteer's hegicstakingpool.co
 * at regular intervals.
 */
 contract AutoStakeToSHegic is AutoStake {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    IHegicStakingPool public sHEGIC;

    constructor(
        IERC20 _HEGIC,
        IERC20 _rHEGIC,
        IHegicStakingPool _sHEGIC,
        IIOUTokenRedemption _redemption
    )
    {
        HEGIC = _HEGIC;
        rHEGIC = _rHEGIC;
        sHEGIC = _sHEGIC;
        redemption = _redemption;

        feeRecipient = msg.sender;
    }

    /**
     * @notice Redeem the maximum possible amount of rHEGIC to HEGIC, then stake
     * in the sHEGIC contract. The developer will call this at regular intervals.
     * Anyone can call this as well, albeit no benefit.
     * @return amount Amount of HEGIC redeemed / sHEGIC staked in this transaction
     */
    function redeemAndStake() override external returns (uint amount) {
        amount = redemption.redeem();
        HEGIC.approve(address(sHEGIC), amount);
        sHEGIC.deposit(amount);

        totalRedeemed += amount;
        totalWithdrawable += amount;

        lastRedemptionTimestamp = block.timestamp;
    }

    /**
     * @notice Withdraw all available sHEGIC claimable by the user.
     */
    function withdrawStakedHEGIC() override external {
        uint amount = getUserWithdrawableAmount(msg.sender);
        require(amount > 0, "No sHEGIC token available for withdrawal");

        uint fee = amount.mul(feeRate).div(10000);
        uint amountAfterFee = amount.sub(fee);

        sHEGIC.transfer(msg.sender, amountAfterFee);
        userData[msg.sender].amountWithdrawn += amount;

        if (fee > 0) {
            sHEGIC.transfer(feeRecipient, fee);
        }

        totalWithdrawable -= amount;
        totalWithdrawn += amountAfterFee;
        totalFeeCollected += fee;

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }

    /**
     * @notice Calculate the maximum amount of sHEGIC token available for withdrawable
     * by a user.
     * @param account The user's account address
     * @return amount The user's withdrawable amount
     */
    function getUserWithdrawableAmount(address account) override public view returns (uint amount) {
        amount = userData[account].amountDeposited.sub(userData[account].amountWithdrawn);
        if (totalWithdrawable < amount) {
            amount = totalWithdrawable;
        }
    }
}
