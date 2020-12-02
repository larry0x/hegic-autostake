const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const web3 = new Web3(ganache.provider());
const compiledContracts = require('../compile.js');
const { deployMockUpContracts } = require('./utils.js');

var accounts;
var contracts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  contracts = await deployMockUpContracts(web3, compiledContracts, accounts[0]);
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

    await FakeHegicTokenInstance.methods
      .transfer(accounts[1], 40)
      .send({ from: accounts[0], gas: 1500000 });

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
  var FakeHegicTokenInstance;
  var FakeRHegicTokenInstance;
  var IOUTokenRedemptionInstance;

  beforeEach(async () => {
    // Can't use object destructuring here. damn
    FakeHegicTokenInstance = contracts.FakeHegicTokenInstance;
    FakeRHegicTokenInstance = contracts.FakeRHegicTokenInstance;
    IOUTokenRedemptionInstance = contracts.IOUTokenRedemptionInstance;

    await FakeRHegicTokenInstance.methods
      .approve(IOUTokenRedemptionInstance._address, 100)
      .send({ from: accounts[0], gas: 1500000 });

    await IOUTokenRedemptionInstance.methods
      .deposit(50)
      .send({ from: accounts[0], gas: 1500000 });

    // Fund redemption contract with HEGIC token
    await FakeHegicTokenInstance.methods
      .transfer(IOUTokenRedemptionInstance._address, 100)
      .send({ from: accounts[0], gas: 1500000 });
  });

  it('should take rHEGIC deposits and log data in state variables', async () => {
    const alreadyDeposited = await IOUTokenRedemptionInstance.methods
      .alreadyDeposited(accounts[0]).call();
    assert(alreadyDeposited, "`alreadyDeposited` is not correctly set to true");

    const balance = await FakeRHegicTokenInstance.methods
      .balanceOf(IOUTokenRedemptionInstance._address).call();
    assert(balance == 50, 'Contract did not receive the deposited tokens');

    const depositData = await IOUTokenRedemptionInstance.methods
      .deposits(accounts[0]).call();
    assert(depositData.amountDeposited == 50, 'Depositor data not correctly logged');
  });

  it('should reject if user attempts to make a 2nd deposit', async () => {
    var error = null;
    try {
      await IOUTokenRedemptionInstance.methods  // Should throw error
        .deposit(50)
        .send({ from: accounts[0], gas: 1500000 });
    } catch (err) {
      error = err;
    }
    assert.ok(error, 'Failed to reject user\'s 2nd deposit');
  });

  it('should correctly calculate redeemable amount', async () => {
    const currentBlock = await web3.eth.getBlockNumber();
    const blockDeposited = (await IOUTokenRedemptionInstance.methods
      .deposits(accounts[0]).call()).blockDeposited;
    const blocksToRelease = await IOUTokenRedemptionInstance.methods
      .blocksToRelease().call();
    const redeemableAmount = await IOUTokenRedemptionInstance.methods
      .getRedeemableAmount(accounts[0]).call();

    assert(
      redeemableAmount == 50 * (currentBlock - blockDeposited) / blocksToRelease,
      'Redeemable amount not accurately calculated'
    );
  });

  it('should calculate redeemable amount accurately and transfer to user', async () => {
    const hegicBalanceBefore = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();

    await IOUTokenRedemptionInstance.methods
      .redeem().send({ from: accounts[0], gas: 1500000 });

    const hegicBalanceAfter = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();

    const hegicBalanceChange = hegicBalanceAfter - hegicBalanceBefore;
    assert(hegicBalanceChange == 20, 'User did not receive correct amount of tokens');

    const depositData = await IOUTokenRedemptionInstance.methods
      .deposits(accounts[0]).call();
    assert(
      depositData.amountRedeemed == hegicBalanceChange,
      'Redeemed amount not correctly recorded'
    );
  });
});

describe('FakeHegicStakingPool', () => {
  it('should accept 50 HEGIC deposit and issue 50 sHEGIC back', async () => {
    const { FakeHegicTokenInstance, FakeHegicStakingPoolInstance } = contracts;

    await FakeHegicTokenInstance.methods
      .approve(FakeHegicStakingPoolInstance._address, 50)
      .send({ from: accounts[0], gas: 1500000});

    await FakeHegicStakingPoolInstance.methods
      .deposit(50)
      .send({ from: accounts[0], gas: 1500000});

    const fakeHegicBalance = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();
    assert(fakeHegicBalance == 50, 'Owner has an HEGIC balance that is not 50');

    const fakeSHegicBalance = await FakeHegicStakingPoolInstance.methods
      .balanceOf(accounts[0]).call();
    assert(fakeSHegicBalance == 50, 'Owner has an sHEGIC balance that is not 50');
  });
});
