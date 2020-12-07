// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;


/**
 * @notice zLOT staking pool: 0x9E4E091fC8921FE3575eab1c9a6446114f3b5Ef2
 */
interface IHegicPoolV2 {
    function deposit(uint256 _amount) public override returns (uint256 _shares);
}
