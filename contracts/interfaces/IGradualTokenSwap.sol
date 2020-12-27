// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;


interface IGradualTokenSwap {
    function provide(uint amount) external;
    function withdraw() external;
    function available(address account) public view returns (uint256);
    function unlocked(address account) public view returns (uint256);
}
