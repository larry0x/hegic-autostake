// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract MockZHegic is Ownable, ERC20("Mock zHEGIC", "MockZHEGIC") {
    address public pool;

    modifier onlyPool {
        require(msg.sender == pool, "Only zLOT HEGIC pool can call this function");
        _;
    }

    function setPool (address _pool) external onlyOwner {
        pool = _pool;
    }

    function mint(address account, uint amount) external onlyPool {
        _mint(account, amount);
    }
}
