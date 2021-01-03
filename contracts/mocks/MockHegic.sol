// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MockHegic is ERC20("Mock HEGIC", "MockHEGIC") {
    constructor() {}

    function mint(uint amount) external {
        _mint(msg.sender, amount);
    }
}
