// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./Interfaces/IHegicStakingPool.sol"; // HegicStaking.co by jmonteer
import "./Interfaces/IVestingContract.sol";  // The upcoming rHEGIC <> HEGIC contract


/**
 * @author Larrypc
 * @title Hegic Converter
 * @notice Pools Hegic IOU token (rHEGIC) together, deposits to the rHEGIC <> HEGIC
 * vesting contract, withdraws HEGIC and deposits to jmonteer's staking pool at
 * regular intervals.
 */
contract HegicConverter is Ownable, ERC20("HEGIC Converter Token", "convHEGIC") {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    IERC20 public immutable HEGIC;
    IERC20 public immutable rHEGIC;
    IHegicStakingPool public immutable sHEGIC;
    IVestingContract public immutable vesting;

    bool depositAllowed = true;
    address[] depositors;

    event Deposited(address account, uint amount);
    event Withdrawn(address account, uint amount);

    constructor(
        IERC20 _HEGIC,
        IERC20 _rHEGIC,
        IHegicStakingPool _sHEGIC,
        IVestingContract _vesting
    )
        public
    {
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
    function withdrawStakedHEGIC() external {
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
        uint convertableAmount = vesting.getConvertableAmount();  //...

        vesting.tradeRHegicForHegic(convertableAmount); //...

        sHEGIC.deposit(convertableAmount);
    }

    /**
     * @notice Return all deposited rHEGIC to depositors. To be called when not
     * enough deposits have been received.
     */
    function refund() public onlyOwner {
        for ( uint i = 0; i < depositors.length; i++ ) {
            rHEGIC.safeTransfer(depositors[i], balanceOf(depositors[i]));
            _burn(balanceOf(depositors));
        }
    }
}
