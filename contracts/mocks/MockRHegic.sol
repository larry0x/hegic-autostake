// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MockRHegic is ERC20("Mock rHEGIC", "MockRHEGIC") {
    constructor() {}

    function mint(uint amount) external {
        _mint(msg.sender, amount);
    }

    // Need to make the bytecode different from that of Mock HEGIC
    // otherwise Hardhat can't verify it on etherscan
    function isIOU() external pure returns (bool) {
        return true;
    }
}
