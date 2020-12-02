const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const toBN = Web3.utils.toBN;

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

    assert(
      ownerBalance == toBN('100000000000000000000'),
      'Owner has a balance that is not 100'
    );

    const totalSupply = await FakeHegicTokenInstance.methods
      .totalSupply().call();

    assert(
      totalSupply == toBN('100000000000000000000'),
      'Total supply is not 100'
    );
  });

  it('should successfully transfer 40 tokens from owner to user', async () => {
    const { FakeHegicTokenInstance } = contracts;

    await FakeHegicTokenInstance.methods
      .transfer(accounts[1], toBN('40000000000000000000'))
      .send({ from: accounts[0], gas: 1500000 });

    const ownerBalance = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();

    assert(
      ownerBalance == toBN('60000000000000000000'),
      'Owner has a balance that is not 60'
    );

    const userBalance = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[1]).call();

    assert(
      userBalance == toBN('40000000000000000000'),
      'User has a balance that is not 40'
    );
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
      .approve(IOUTokenRedemptionInstance._address, toBN('50000000000000000000'))
      .send({ from: accounts[0], gas: 1500000 });

    await IOUTokenRedemptionInstance.methods
      .deposit(toBN('50000000000000000000'))
      .send({ from: accounts[0], gas: 1500000 });

    // Fund redemption contract with HEGIC token
    await FakeHegicTokenInstance.methods
      .transfer(IOUTokenRedemptionInstance._address, toBN('100000000000000000000'))
      .send({ from: accounts[0], gas: 1500000 });
  });

  it('should take rHEGIC deposits and log data in state variables', async () => {
    const alreadyDeposited = await IOUTokenRedemptionInstance.methods
      .alreadyDeposited(accounts[0]).call();

    assert(alreadyDeposited, "`alreadyDeposited` is not correctly set to true");

    const balance = await FakeRHegicTokenInstance.methods
      .balanceOf(IOUTokenRedemptionInstance._address).call();

    assert(
      balance == toBN('50000000000000000000'),
      'Contract did not receive the deposited tokens'
    );

    const depositData = await IOUTokenRedemptionInstance.methods
      .deposits(accounts[0]).call();

    assert(
      depositData.amountDeposited == toBN('50000000000000000000'),
      'Depositor data not correctly logged'
    );
  });

  it('should reject if user attempts to make a 2nd deposit', async () => {
    var error = null;
    try {
      await IOUTokenRedemptionInstance.methods  // Should throw error
        .deposit(toBN('50000000000000000000'))
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

    const correctRedeemableAmount = toBN('50000000000000000000')
      .mul(toBN(currentBlock - blockDeposited))
      .div(toBN(blocksToRelease));

    // console.log('redeemableAmount:', redeemableAmount);
    // console.log('correctRedeemableAmount:', correctRedeemableAmount.toString());

    assert(
      toBN(redeemableAmount).eq(correctRedeemableAmount),
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

    const hegicBalanceChange = toBN(hegicBalanceAfter).sub(toBN(hegicBalanceBefore));

    // console.log('hegicBalanceBefore:', hegicBalanceBefore);
    // console.log('hegicBalanceAfter:', hegicBalanceAfter);
    // console.log('hegicBalanceChange:', hegicBalanceChange.toString());

    assert(
      hegicBalanceChange.eq(toBN('20000000000000000000')),
      'User did not receive correct amount of tokens'
    );

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
      .approve(FakeHegicStakingPoolInstance._address, toBN('50000000000000000000'))
      .send({ from: accounts[0], gas: 1500000});

    await FakeHegicStakingPoolInstance.methods
      .deposit(toBN('50000000000000000000'))
      .send({ from: accounts[0], gas: 1500000});

    const fakeHegicBalance = await FakeHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();

    assert(
      toBN(fakeHegicBalance).eq(toBN('50000000000000000000')),
      'Owner has an HEGIC balance that is not 50'
    );

    const fakeSHegicBalance = await FakeHegicStakingPoolInstance.methods
      .balanceOf(accounts[0]).call();

    assert(
      toBN(fakeSHegicBalance).eq(toBN('50000000000000000000')),
      'Owner has an sHEGIC balance that is not 50'
    );
  });
});
