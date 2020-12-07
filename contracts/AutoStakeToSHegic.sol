// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./interfaces/IHegicStakingPool.sol";
import "./interfaces/IIOUTokenRedemption.sol";


/**
 * @author Larrypc
 * @title Hegic AutoStake: to sHEGIC
 * @notice Pools HegicIOUToken (rHEGIC) together and deposits to the rHEGIC --> HEGIC
 * redemption contract; withdraws HEGIC and deposits to jmonteer's HegicStakingPool at
 * regular intervals.
 */
contract AutoStakeToSHegic is Ownable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    struct UserData {
        uint amountDeposited;
        uint amountWithdrawn;
    }

    IERC20 public immutable HEGIC;
    IERC20 public immutable rHEGIC;
    IIOUTokenRedemption public immutable redemption;
    IHegicStakingPool public immutable sHEGIC;

    uint public feeRate = 100;  // 1%
    address public feeRecipient;

    bool public allowDeposit = true;
    bool public allowClaimRefund = true;

    uint public totalDepositors = 0;
    uint public totalDeposited = 0;
    uint public totalRedeemed = 0;
    uint public totalWithdrawable = 0;
    uint public totalWithdrawn = 0;  // Not Including fees
    uint public totalFeeCollected = 0;

    uint public lastRedemptionTimestamp;

    mapping(address => UserData) public userData;

    event Deposited(address account, uint amount);
    event RefundClaimed(address account, uint amount);
    event Withdrawn(address account, uint amountAfterFee, uint fee);

    constructor(IERC20 _HEGIC, IERC20 _rHEGIC, IIOUTokenRedemption _redemption, IHegicStakingPool _sHEGIC) {
        HEGIC = _HEGIC;
        rHEGIC = _rHEGIC;
        sHEGIC = _sHEGIC;
        redemption = _redemption;

        feeRecipient = msg.sender;
    }

    /**
     * @notice Set the fee rate users are charged upon withdrawal.
     * @param _feeRate The new rate in basis points. E.g. 200 = 2%
     */
    function setFeeRate(uint _feeRate) external onlyOwner {
        require(_feeRate >= 0, "Rate too low!");
        require(_feeRate <= 500, "Rate too high!");
        feeRate = _feeRate;
    }

    /**
     * @notice Set the recipient address to fees generated.
     * @param _feeRecipient The new recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Cannot set recipient to zero address");
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Set to accept or reject new deposits. May be called if the project
     * fails to attract enough deposits that justify the work. In this case the
     * developer will inform depositors to withdraw their rHEGIC by calling the
     * `claimRefund` function.
     * @param _allowDeposit Whether new deposits are accepted
     */
    function setAllowDeposit(bool _allowDeposit) external onlyOwner {
        allowDeposit = _allowDeposit;
    }

    /**
     * @notice Deposits a given amount of rHEGIC to the contract.
     * @param amount Amount of rHEGIC to be deposited, i.e. amount of convHEGIC to
     * be minted
     */
    function deposit(uint amount) external {
        require(allowDeposit, "New deposits no longer accepted");
        require(amount > 0, "Amount must be greater than zero");

        if (userData[msg.sender].amountDeposited == 0) {
            totalDepositors += 1;
        }
        totalDeposited += amount;

        rHEGIC.safeTransferFrom(msg.sender, address(this), amount);
        userData[msg.sender].amountDeposited += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Claim a refund of rHEGIC before they are deposited to the redemption
     * contract. The developer will notify users to do this if the project fails
     * to attract enough deposit.
     */
    function claimRefund() external {
        uint amount = userData[msg.sender].amountDeposited;

        require(amount > 0, "User has not deposited any fund");
        require(allowClaimRefund, "Funds already transferred to the redemption contract");

        rHEGIC.safeTransfer(msg.sender, amount);

        userData[msg.sender].amountDeposited = 0;
        totalDeposited -= amount;
        totalDepositors -= 1;

        emit RefundClaimed(msg.sender, amount);
    }

    /**
     * @notice Deposit all rHEGIC to the redemption contract. Once this is executed,
     * no new deposit will be accepted, and users will not be able to claim rHEGIC refund.
     */
    function depositToRedemptionContract() external onlyOwner {
        require(totalDeposited > 0, "No rHEGIC token to deposit");

        rHEGIC.approve(address(redemption), totalDeposited);
        redemption.deposit(totalDeposited);

        allowDeposit = false;
        allowClaimRefund = false;
    }

    /**
     * @notice Redeem the maximum possible amount of rHEGIC to HEGIC, then stake
     * in the sHEGIC contract. The developer will call this at regular intervals.
     * Anyone can call this as well, albeit no benefit.
     * @return amount Amount of HEGIC redeemed / sHEGIC staked in this transaction
     */
    function redeemAndStake() external returns (uint amount) {
        amount = redemption.redeem();
        HEGIC.approve(address(sHEGIC), amount);
        sHEGIC.deposit(amount);

        totalRedeemed += amount;
        totalWithdrawable += amount;

        lastRedemptionTimestamp = block.timestamp;
    }

    /**
     * @notice Calculate the maximum amount of sHEGIC token available for withdrawable
     * by a user.
     * @param account The user's account address
     * @return amount The user's withdrawable amount
     */
    function getUserWithdrawableAmount(address account) public view returns (uint amount) {
        amount = userData[account].amountDeposited.sub(userData[account].amountWithdrawn);
        if (totalWithdrawable < amount) {
            amount = totalWithdrawable;
        }
    }

    /**
     * @notice Withdraw all available sHEGIC claimable by the user.
     */
    function withdrawStakedHEGIC() public {
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
}
