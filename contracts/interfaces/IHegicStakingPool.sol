// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

interface IHegicStakingPool {
    function deposit(uint _amount) external;
    function transfer(address recipient, uint256 amount) external returns (bool);
}
