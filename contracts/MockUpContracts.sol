// // SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";


contract FakeHegicToken is ERC20("Fake HEGIC", "FakeHEGIC") {
    constructor() {
        _mint(msg.sender, 100e18);
    }
}


contract FakeRHegicToken is ERC20("Fake rHEGIC", "FakeRHEGIC") {
    // Hardhat toolkit can't verify contracts on Etherscan if they have the same
    // bytecodes. This variable is useless but it makes the fake rHEGIC's bytecode
    // different from that of fake HEGIC's, so verification is a bit easier.
    FakeHegicToken public immutable isAnIOUFor;

    constructor(FakeHegicToken _isAnIOUFor) {
        isAnIOUFor = _isAnIOUFor;
        _mint(msg.sender, 100e18);
    }
}


contract IOUTokenRedemption is Ownable {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    struct Deposit {
        uint blockDeposited;
        uint amountDeposited;
        uint amountRedeemed;
    }

    uint public immutable blocksToRelease;  // How many block since since deposit will HEGIC be completely released.
    mapping(address => Deposit) public deposits;
    mapping(address => bool) public alreadyDeposited;

    ERC20 public immutable inputToken;
    ERC20 public immutable outputToken;

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
            amountRedeemed: 0
        });

        inputToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function redeem() public returns (uint amount) {
        amount = getRedeemableAmount(msg.sender);
        outputToken.safeTransfer(msg.sender, amount);
        deposits[msg.sender].amountRedeemed += amount;
    }

    function getRedeemableAmount(address account) public view returns (uint withdrawable) {
        uint blocksSinceDeposit = (block.number).sub(deposits[account].blockDeposited);
        withdrawable = (deposits[account].amountDeposited)
            .mul(blocksSinceDeposit)
            .div(blocksToRelease);

        if (withdrawable > deposits[account].amountDeposited) {
            withdrawable = deposits[account].amountDeposited;
        }

        withdrawable = withdrawable.sub(deposits[account].amountRedeemed);
    }
}


contract FakeHegicStakingPool is ERC20("Fake sHEGIC", "FakeSHEGIC") {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    ERC20 public immutable inputToken;

    constructor(ERC20 _inputToken) {
        inputToken = _inputToken;
    }

    function deposit(uint amount) public {
        inputToken.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }
}
