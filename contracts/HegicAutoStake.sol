// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./MockUpContracts.sol";


/**
 * @author Larrypc
 * @title HEGIC AutoStake
 * @notice Pools HegicIOUToken (rHEGIC) together and deposits to the rHEGIC <> HEGIC
 * redemption contract; withdraws HEGIC and deposits to jmonteer's HegicStakingPool at
 * regular intervals.
 */
contract HegicAutoStake is Ownable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    struct DepositData {
        uint amountDeposited;
        uint amountWithdrawn;
    }

    IERC20 public immutable HEGIC;
    IERC20 public immutable rHEGIC;
    FakeHegicStakingPool public immutable sHEGIC;  // Change this when deploying!!!
    IOUTokenRedemption public immutable redemption;

    uint public feeRate = 100;  // 1%
    address public feeRecipient;

    bool public allowDeposit = true;
    bool public allowClaimRefund = true;

    mapping(address => DepositData) public depositData;

    event Deposited(address account, uint amount);
    event RefundClaimed(address account, uint amount);
    event Withdrawn(address account, uint amountAfterFee, uint fee);

    constructor(IERC20 _HEGIC, IERC20 _rHEGIC, FakeHegicStakingPool _sHEGIC, IOUTokenRedemption _redemption) {
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
    function setFeeRate(uint _feeRate) public onlyOwner {
        require(_feeRate >= 0, "Rate too low!");
        require(_feeRate <= 500, "Rate too high!");  // Owner can charge no more than 5%
        feeRate = _feeRate;
    }

    /**
     * @notice Set the recipient address to fees generated.
     * @param _feeRecipient The new recipient address
     */
    function setFeeRecipient(address _feeRecipient) public onlyOwner {
        require(_feeRecipient != address(0), "Cannot set recipient to zero address");
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Deposits a given amount of rHEGIC to the contract.
     * @param amount Amount of rHEGIC to be deposited, i.e. amount of convHEGIC to
     * be minted
     */
    function deposit(uint amount) public {
        require(allowDeposit, "New deposits no longer accepted");
        require(amount > 0, "Amount must be greater than zero");

        rHEGIC.safeTransferFrom(msg.sender, address(this), amount);
        depositData[msg.sender].amountDeposited += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Claim a refund of rHEGIC before they are deposited to the redemption
     * contract. The developer will notify users to do this if the project fails
     * to attract enough deposit.
     */
    function claimRefund() public onlyOwner {
        uint amount = depositData[msg.sender].amountDeposited;

        require(amount > 0, "User has not deposited any fund");
        require(allowClaimRefund, "Funde are already deposited to the redemption contract");

        rHEGIC.safeTransfer(msg.sender, amount);
        depositData[msg.sender].amountDeposited = 0;

        emit RefundClaimed(msg.sender, amount);
    }

    /**
     * @notice Deposit all rHEGIC to the redemption contract. Once this is executed,
     * no new deposit will be accepted, and users will not be able to claim rHEGIC refund.
     * @return amount Amount of rHEGIC deposited
     */
    function depositToRedemptionContract() public onlyOwner returns (uint amount) {
        amount = rHEGIC.balanceOf(address(this));
        require(amount > 0, "No rHEGIC token to deposit");

        allowDeposit = false;
        allowClaimRefund = false;

        rHEGIC.approve(address(redemption), amount);
        redemption.deposit(amount);  //...
    }

    /**
     * @notice Redeem the maximum possible amount of rHEGIC to HEGIC, then stake
     * in the sHEGIC contract. The developer will call this at regular intervals.
     * Anyone can call this as well, albeit no benefit.
     * @return amount Amount of HEGIC redeemed / sHEGIC staked in this transaction
     */
    function redeemAndStake() public returns (uint amount) {
        amount = redemption.redeem(); //...
        HEGIC.approve(address(sHEGIC), amount);
        sHEGIC.deposit(amount);
    }

    /**
     * @notice Calculate the maximum amount of sHEGIC token available for withdrawable
     * by a user.
     * @param account The user's account address
     */
    function getUserWithdrawableAmount(address account) public view returns (uint withdrawableAmount) {
        uint sHegicAvailable = sHEGIC.balanceOf(address(this));
        uint userTotalWithdrawable = depositData[account].amountDeposited;
        uint userAlreadyWithdrawn = depositData[account].amountWithdrawn;

        withdrawableAmount = userTotalWithdrawable.sub(userAlreadyWithdrawn);
        if (sHegicAvailable < withdrawableAmount) {
            withdrawableAmount = sHegicAvailable;
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
        depositData[msg.sender].amountWithdrawn += amount;

        if (fee > 0) {
            sHEGIC.transfer(feeRecipient, fee);
        }

        emit Withdrawn(msg.sender, amountAfterFee, fee);
    }
}
