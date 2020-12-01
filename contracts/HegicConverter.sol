// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./MockUpContracts.sol";


/**
 * @author Larrypc
 * @title Hegic Converter
 * @notice Pools Hegic IOU token (rHEGIC) together and deposits to the rHEGIC <> HEGIC
 * vesting contract; withdraws HEGIC and deposits to jmonteer's staking pool at
 * regular intervals.
 */
contract HegicConverter is Ownable, ERC20("HEGIC Converter Token", "convHEGIC") {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    IERC20 public immutable HEGIC;
    IERC20 public immutable rHEGIC;
    // HegicStakingPool public immutable sHEGIC;
    FakeHegicStakingPool public immutable sHEGIC;
    IOUTokenRedemption public immutable vesting;

    bool depositAllowed = true;
    address[] depositors;

    event Deposited(address account, uint amount);
    event Withdrawn(address account, uint amount);

    constructor(
        IERC20 _HEGIC,
        IERC20 _rHEGIC,
        // HegicStakingPool _sHEGIC,
        FakeHegicStakingPool _sHEGIC,
        IOUTokenRedemption _vesting
    ) {
        HEGIC = _HEGIC;
        rHEGIC = _rHEGIC;
        sHEGIC = _sHEGIC;
        vesting = _vesting;
    }

    /**
     * @notice Deposits _amount rHEGIC to the contract.
     * @param _amount Amount of rHEGIC to be deposited // amount of convHEGIC to
     * be minted
     */
    function deposit(uint _amount) external {
        require(depositAllowed, "New deposits no longer accepted");
        require(_amount > 0, "Amount must be greater than zero");

        rHEGIC.safeTransferFrom(msg.sender, address(this), _amount);
        depositors.push(msg.sender);
        _mint(msg.sender, _amount);

        emit Deposited(msg.sender, _amount);
    }

    /**
     * @notice Withdraw all available sHEGIC claimable by the user.
     */
    function withdrawStakedHEGIC(uint _amount) external {
        require(_amount > 0, "Amount must be greater than zero");

        uint totalSHegicBalance = sHEGIC.balanceOf(address(this));
        uint userShare = totalSHegicBalance.mul(_amount).div(totalSupply());

        sHEGIC.transfer(msg.sender, userShare);
        _burn(msg.sender, userShare);

        emit Withdrawn(msg.sender, userShare);
    }

    /**
     * @notice Deposit all rHEGIC to the vesting contract, and disallow any new
     * rHEGIC deposits.
     */
    function depositToVestingContract() public onlyOwner {
        uint rHegicBalance = rHEGIC.balanceOf(address(this));
        require(rHegicBalance > 0, "No rHEGIC token to deposit");

        vesting.deposit(rHegicBalance);  //...

        depositAllowed = false;
    }

    /**
     * @notice Convert the maximum possible amount of rHEGIC to HEGIC, then deposit
     * to sHEGIC contract.
     */
    function convertAndStake() public {
        uint withdrawableAmount = vesting.getWithdrawableAmount(msg.sender);  //...

        vesting.withdraw(withdrawableAmount); //...

        sHEGIC.deposit(withdrawableAmount);
    }

    /**
     * @notice Return all deposited rHEGIC to depositors. To be called when not
     * enough deposits have been received.
     */
    function refund() public onlyOwner {
        for ( uint i = 0; i < depositors.length; i++ ) {
            rHEGIC.safeTransfer(depositors[i], balanceOf(depositors[i]));
            _burn(depositors[i], balanceOf(depositors[i]));
        }
    }
}
