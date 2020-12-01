const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const web3 = new Web3(ganache.provider());
const compiledContracts = require('../compile.js');
const { deployContracts } = require('./utils.js');

var accounts;
var contracts;


beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  contracts = await deployContracts(web3, compiledContracts, accounts[0]);
});


describe('FakeHegicToken', () => {
  it('should mint the owner 100 token when deployed, and have 100 total supply', async () => {
    const { FakeHegicTokenInstance } = contracts;

    const ownerBalance = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();
    assert(ownerBalance == 100, 'Owner has a balance that is not 100');

    const totalSupply = await FakeHegicTokenInstance.methods
      .totalSupply().call();
    assert(totalSupply == 100, 'Total supply is not 100');
  });

  it('should successfully transfer 40 tokens from owner to user', async () => {
    const { FakeHegicTokenInstance } = contracts;

    await FakeHegicTokenInstance.methods.transfer(accounts[1], 40).send({
      from: accounts[0],
      gas: 1500000
    });

    const ownerBalance = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();
    assert(ownerBalance == 60, 'Owner has a balance that is not 60');

    const userBalance = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[1]).call();
    assert(userBalance == 40, 'User has a balance that is not 40');
  });
});


describe('FakeRHegicToken', () => {
  it('should deploy successfully', async () => {
    const { FakeRHegicTokenInstance } = contracts;
    assert(FakeRHegicTokenInstance, 'Contract object is null or undefined');
  });
});


describe('IOUTokenRedemption', () => {
  // To be implemented
});


describe('FakeHegicStakingPool', () => {
  it('should accept 50 HEGIC deposit and issue 50 sHEGIC back', async () => {
    const { FakeHegicTokenInstance, FakeHegicStakingPoolInstance } = contracts;

    await FakeHegicTokenInstance.methods
      .approve(FakeHegicStakingPoolInstance._address, 50)
      .send({
        from: accounts[0],
        gas: 1500000
      });

    await FakeHegicStakingPoolInstance.methods
      .deposit(50)
      .send({
        from: accounts[0],
        gas: 1500000
      });

    const fakeHegicBalance = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();
    assert(fakeHegicBalance == 50, 'Owner has an HEGIC balance that is not 50');

    const fakeSHegicBalance = await FakeHegicStakingPoolInstance.methods
      .balanceOf(accounts[0]).call();
    assert(fakeSHegicBalance == 50, 'Owner has an sHEGIC balance that is not 50');
  });
});
