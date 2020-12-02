const deployMockUpContracts = async (web3, compiledContracts, deployer) => {
  var { abi, evm } = compiledContracts['FakeHegicToken'];
  var FakeHegicTokenInstance = await new web3.eth.Contract(abi)
    .deploy({
      data: evm.bytecode.object,
      arguments: []
    })
    .send({
      from: deployer,
      gas: '1500000'
    });

  var { abi, evm } = compiledContracts['FakeRHegicToken'];
  var FakeRHegicTokenInstance = await new web3.eth.Contract(abi)
    .deploy({
      data: evm.bytecode.object,
      arguments: [ FakeHegicTokenInstance._address ]
    })
    .send({
      from: deployer,
      gas: '1500000'
    });

  var { abi, evm } = compiledContracts['IOUTokenRedemption'];
  var IOUTokenRedemptionInstance = await new web3.eth.Contract(abi)
  .deploy({
    data: evm.bytecode.object,
    arguments: [
      FakeRHegicTokenInstance._address,  // _inputToken
      FakeHegicTokenInstance._address,   // _outputToken
      5
    ]
  })
  .send({
    from: deployer,
    gas: '1500000'
  });

  var { abi, evm } = compiledContracts['FakeHegicStakingPool'];
  var FakeHegicStakingPoolInstance = await new web3.eth.Contract(abi)
  .deploy({
    data: evm.bytecode.object,
    arguments: [ FakeHegicTokenInstance._address ]
  })
  .send({
    from: deployer,
    gas: '1500000'
  });

  return {
    FakeHegicTokenInstance,
    FakeRHegicTokenInstance,
    IOUTokenRedemptionInstance,
    FakeHegicStakingPoolInstance
  };
};

const deployAllContracts = async (web3, compiledContracts, deployer) => {
  var mockUpContracts = await deployMockUpContracts(web3, compiledContracts, deployer);

  var { abi, evm } = compiledContracts['HegicAutoStake'];
  var HegicAutoStakeInstance = await new web3.eth.Contract(abi)
    .deploy({
      data: evm.bytecode.object,
      arguments: [
        mockUpContracts.FakeHegicTokenInstance._address,
        mockUpContracts.FakeRHegicTokenInstance._address,
        mockUpContracts.FakeHegicStakingPoolInstance._address,
        mockUpContracts.IOUTokenRedemptionInstance._address,
      ]
    })
    .send({
      from: deployer,
      gas: '3500000'
    });

    return { HegicAutoStakeInstance, ...mockUpContracts };
}

module.exports = { deployMockUpContracts, deployAllContracts };
