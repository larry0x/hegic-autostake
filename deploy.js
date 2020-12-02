const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");

// Use environment variables to provide private key and RPC URL:
//
// PRIVATE_KEY=... RPC_URL=... node deploy.js
//
// If using ganache-cli:
//
// PRIVATE_KEY="copyFromGanacheCLI" RPL_URL=http://127.0.0.1:8545 node deploy.js
//
require('dotenv').config();

const deployToTestnet = async (web3, compiledContracts) => {
  const {
    FakeHegicToken,
    FakeRHegicToken,
    FakeHegicStakingPool,
    IOUTokenRedemption,
    HegicAutoStake,
  } = compiledContracts;

  // Get account
  var account = (await web3.eth.getAccounts())[0];
  console.log('Using account', account);

  // Fake HEGIC Token
  var result = await new web3.eth.Contract(FakeHegicToken.abi)
    .deploy({
      data: FakeHegicToken.evm.bytecode.object,
      arguments: []
    })
    .send({
      from: account,
      gas: 1500000
    });

  FakeHegicToken.address = result.options.address;
  console.log('Deployed FakeHegicToken at', FakeHegicToken.address);

  // Fake rHEGIC Token
  result = await new web3.eth.Contract(FakeRHegicToken.abi)
    .deploy({
      data: FakeRHegicToken.evm.bytecode.object,
      arguments: [ FakeHegicToken.address ]
    })
    .send({
      from: account,
      gas: 1500000
    });

  FakeRHegicToken.address = result.options.address;
  console.log('Deployed FakeRHegicToken at', FakeRHegicToken.address);

  // Fake HEGIC Staking Pool (sHEGIC)
  result = await new web3.eth.Contract(FakeHegicStakingPool.abi)
    .deploy({
      data: FakeHegicStakingPool.evm.bytecode.object,
      arguments: [ FakeHegicToken.address ]
    })
    .send({
      from: account,
      gas: 1500000
    });

  FakeHegicStakingPool.address = result.options.address;
  console.log('Deployed FakeHegicStakingPool at', FakeHegicStakingPool.address);

  // IOU Token Redemption. 120 blocks ~= 30 min
  result = await new web3.eth.Contract(IOUTokenRedemption.abi)
    .deploy({
      data: IOUTokenRedemption.evm.bytecode.object,
      arguments: [ FakeRHegicToken.address, FakeHegicToken.address, 120 ]
    })
    .send({
      from: account,
      gas: 1500000
    });

  IOUTokenRedemption.address = result.options.address;
  console.log('Deployed IOUTokenRedemption at', IOUTokenRedemption.address);

  // HegicAutoStake
  result = await new web3.eth.Contract(HegicAutoStake.abi)
    .deploy({
      data: HegicAutoStake.evm.bytecode.object,
      arguments: [
        FakeHegicToken.address,
        FakeRHegicToken.address,
        FakeHegicStakingPool.address,
        IOUTokenRedemption.address
      ]
    })
    .send({
      from: account,
      gas: 3500000
    });

  HegicAutoStake.address = result.options.address;
  console.log('Deployed HegicAutoStake at', HegicAutoStake.address);

  process.exit(0);  // The script won't exit by itself for some reason
};

console.log('Using private key', process.env.PRIVATE_KEY);
console.log('Using RPC URL', process.env.RPC_URL)

const provider = new HDWalletProvider(process.env.PRIVATE_KEY, process.env.RPC_URL);
console.log('Provider created');

const web3 = new Web3(provider);
console.log('Web3 created');

const compiledContracts = require('./compile.js');
console.log('Contracts compiled');

deployToTestnet(web3, compiledContracts);
