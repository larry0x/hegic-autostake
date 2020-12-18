// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./interfaces/IHegicPoolV2.sol";
import "./AutoStake.sol";


/**
 * @author Larrypc
 * @title AutoStakeToZHegic
 * @notice Pools HegicIOUToken (rHEGIC) together and deposits to the rHEGIC --> HEGIC
 * redemption contract; withdraws HEGIC and deposits to zLOT HEGIC pool at regular
 * intervals.
 */
 contract AutoStakeToZHegic is AutoStake {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    IERC20 public zHEGIC;
    IHegicPoolV2 public zLotPool;

    constructor(
        IERC20 _HEGIC,
        IERC20 _rHEGIC,
        IERC20 _zHEGIC,
        IHegicPoolV2 _zLotPool,
        IIOUTokenRedemption _redemption
    )
    {
        HEGIC = _HEGIC;
        rHEGIC = _rHEGIC;
        zHEGIC = _zHEGIC;
        zLotPool = _zLotPool;
        redemption = _redemption;

        feeRecipient = msg.sender;
    }

    /**
     * @notice Redeem the maximum possible amount of rHEGIC to HEGIC, then stake
     * in the sHEGIC contract. The developer will call this at regular intervals.
     * Anyone can call this as well, albeit no benefit.
     * @return amountRedeemed Amount of HEGIC redeemed
     * @return amountStaked Amount of zHEGIC received from staking HEGIC
     */
    function redeemAndStake() override external returns (uint amountRedeemed, uint amountStaked) {
        amountRedeemed = redemption.redeem();
        HEGIC.approve(address(zLotPool), amountRedeemed);
        amountStaked = zLotPool.deposit(amountRedeemed);

        totalRedeemed += amountRedeemed;
        totalStaked += amountStaked;
        totalWithdrawable += amountStaked;

        lastRedemptionTimestamp = block.timestamp;
    }

    /**
     * @notice Withdraw all available zHEGIC claimable by the user.
     */
    function withdrawStakedHEGIC() override external {
        uint amount = getUserWithdrawableAmount(msg.sender);
        require(amount > 0, "No zHEGIC token available for withdrawal");

        uint fee = amount.mul(feeRate).div(10000);
        uint amountAfterFee = amount.sub(fee);

        zHEGIC.safeTransfer(msg.sender, amountAfterFee);
        zHEGIC.safeTransfer(feeRecipient, fee);

        userData[msg.sender].amountWithdrawn += amount;

        totalWithdrawable -= amount;
        totalWithdrawn += amountAfterFee;
        totalFeeCollected += fee;

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }

    /**
     * @notice Calculate the maximum amount of zHEGIC token available for withdrawable
     * by a user.
     * @param account The user's account address
     * @return amount The user's withdrawable amount
     */
    function getUserWithdrawableAmount(address account) public view returns (uint amount) {
        amount = totalStaked
            .mul(userData[account].amountDeposited)
            .div(totalDeposited)
            .sub(userData[account].amountWithdrawn);

        if (totalWithdrawable < amount) {
            amount = totalWithdrawable;
        }
    }
}
