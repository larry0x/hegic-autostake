// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @notice Forked from https://github.com/hegic/GradualTokenSwap/blob/master/contracts/GradualTokenSwap.sol
 * @dev Changed the release schedule from timestamp-based to blocknumber-based so
 * that it's easier to test in a local testnet (e.g. Ganache). The interface remains
 * the same as the original GTS contract.
 */
contract MockGradualTokenSwap {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Withdrawn(address account, uint256 amount);

    uint256 public start;
    uint256 public duration;
    IERC20 public rHEGIC;
    IERC20 public HEGIC;

    mapping(address => uint) public released;
    mapping(address => uint) public provided;

    constructor(uint256 _start, uint256 _duration, IERC20 _rHEGIC, IERC20 _HEGIC) {
        if(_start == 0) _start = block.timestamp;
        require(_duration > 0, "GTS: duration is 0");

        duration = _duration;
        start = _start;
        rHEGIC =_rHEGIC;
        HEGIC = _HEGIC;
    }

    function provide(uint amount) external {
      rHEGIC.safeTransferFrom(msg.sender, address(this), amount);
      provided[msg.sender] = provided[msg.sender].add(amount);
    }

    function withdraw() external {
        uint amount = available(msg.sender);
        require(amount > 0, "GTS: You are have not unlocked tokens yet");
        released[msg.sender] = released[msg.sender].add(amount);
        HEGIC.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function available(address account) public view returns (uint256) {
        return unlocked(account).sub(released[account]);
    }

    function unlocked(address account) public view returns (uint256) {
        if(block.number < start)
            return 0;
        if (block.number >= start.add(duration)) {
            return provided[account];
        } else {
            return provided[account].mul(block.number.sub(start)).div(duration);
        }
    }
}
