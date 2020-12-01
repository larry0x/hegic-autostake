// // SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";


contract FakeHegicToken is ERC20("Fake HEGIC Token", "FakeHEGIC") {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    constructor() {
        _mint(msg.sender, 100);
    }
}


contract FakeRHegicToken is ERC20("Fake rHEGIC Token", "FakeRHEGIC") {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    constructor() {
        _mint(msg.sender, 100);
    }
}


contract IOUTokenRedemption is Ownable {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    struct Deposit {
        uint blockDeposited;
        uint amountDeposited;
        uint amountWithdrawn;
    }

    uint blocksToRelease;  // How many block since since deposit will HEGIC be completely released.
    mapping(address => Deposit) deposits;
    mapping(address => bool) alreadyDeposited;

    ERC20 inputToken;
    ERC20 outputToken;

    constructor(ERC20 _inputToken, ERC20 _outputToken, uint _blocksToRelease) {
        inputToken = _inputToken;
        outputToken = _outputToken;
        blocksToRelease = _blocksToRelease;
    }

    function fundOutputToken(uint amount) public onlyOwner {
        outputToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function deposit(uint amount) public {
        require(!alreadyDeposited[msg.sender], "This account has already deposited");
        alreadyDeposited[msg.sender] = true;

        deposits[msg.sender] = Deposit({
            blockDeposited: block.number,
            amountDeposited: amount,
            amountWithdrawn: 0
        });

        inputToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw() public returns (uint amount) {
        amount = getWithdrawableAmount(msg.sender);
        outputToken.safeTransfer(msg.sender, amount);
        deposits[msg.sender].amountWithdrawn += amount;
    }

    function getWithdrawableAmount(address account) public view returns (uint withdrawable) {
        uint blocksSinceDeposit = (block.number).sub(deposits[account].blockDeposited);
        withdrawable = (deposits[account].amountDeposited)
            .mul(blocksSinceDeposit)
            .div(blocksToRelease)
            .sub(deposits[account].amountWithdrawn);
    }
}


contract FakeHegicStakingPool is ERC20("Fake sHEGIC Token", "FakeSHEGIC") {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    ERC20 inputToken;

    constructor(ERC20 _inputToken) {
        inputToken = _inputToken;
    }

    function deposit(uint amount) public {
        inputToken.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }
}
