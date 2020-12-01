const deployContracts = async (web3, compiledContracts, deployer) => {
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
      arguments: []
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

module.exports = { deployContracts };
