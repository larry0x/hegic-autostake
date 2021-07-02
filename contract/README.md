# HEGIC AutoStake: Contracts

Pools rHEGIC tokens together, redeem HEGIC, and stake to [zLOT](https://zlot.finance/) at regular intervals.

## Mainnet contract addresses

| Contract         | Address                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AutoStake        | [`0xfe7621FF771dfeCF28A2037F6d7eB3605106ED39`](https://etherscan.io/address/0xfe7621FF771dfeCF28A2037F6d7eB3605106ED39) |
| HEGIC            | [`0x584bC13c7D411c00c01A62e8019472dE68768430`](https://etherscan.io/address/0x584bC13c7D411c00c01A62e8019472dE68768430) |
| rHEGIC           | [`0x47C0aD2aE6c0Ed4bcf7bc5b380D7205E89436e84`](https://etherscan.io/address/0x47C0aD2aE6c0Ed4bcf7bc5b380D7205E89436e84) |
| zHEGIC           | [`0x837010619aeb2AE24141605aFC8f66577f6fb2e7`](https://etherscan.io/address/0x837010619aeb2AE24141605aFC8f66577f6fb2e7) |
| zLotPool (v3)    | [`0x6eC088B454d2dB7a2d8879A25d9ce015039E30FB`](https://etherscan.io/address/0x6eC088B454d2dB7a2d8879A25d9ce015039E30FB) |
| GradualTokenSwap | [`0x1F533aCf0C12D12997c49F4B64192030B6647c46`](https://etherscan.io/address/0x1F533aCf0C12D12997c49F4B64192030B6647c46) |

## Notes to myself

Compile contracts:

```bash
npx hardhat compile
```

Run test scripts:

```bash
npx hardhat test
```

Deploy contracts:

```bash
npx hardhat run scripts/deployTo{Test,Main}net.js --network {goerli,mainnet}
```

Verify contracts on Etherscan:

```bash
npx hardhat verify --network {goerli,mainnet} contractAddress [constructorArguments]
```
