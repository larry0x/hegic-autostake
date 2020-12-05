// // SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;


interface IIOUTokenRedemption {
    function fundOutputToken(uint amount) external;
    function deposit(uint amount) external;
    function redeem() external returns (uint);
}
