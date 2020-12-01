const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const web3 = new Web3(ganache.provider());
const compiledContracts = require('../compile.js');
const { deployAllContracts } = require('./utils.js');

var accounts;
var contracts;

describe('HegicConverter', () => {
  beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    contracts = await deployAllContracts(web3, compiledContracts, accounts[0]);
  });

  it('should deploy successfully', async () => {
    const { HegicConverterInstance } = contracts;
    assert(HegicConverterInstance, 'Contract object is null or undefined');
  });

  it('should set fee rate correctly', async () => {
    const { HegicConverterInstance } = contracts;

    await HegicConverterInstance.methods
      .setFeeRate(500)
      .send({ from: accounts[0], gas: 1500000 });

    const newFeeRate = await HegicConverterInstance.methods
      .feeRate().call();
    assert(newFeeRate == 500, 'Fee rate not correctly set to 500');
  });

  it('should set fee recipient correctly', async () => {
    const { HegicConverterInstance } = contracts;

    await HegicConverterInstance.methods
      .setFeeRecipient(accounts[1])
      .send({ from: accounts[0], gas: 1500000 });

    const newFeeRecipient = await HegicConverterInstance.methods
      .feeRecipient().call();
    assert(newFeeRecipient == accounts[1], 'Fee recipient not correctly set to accounts[1]');
  });

  it('should accept user deposit and correctly record data in state variable', async () => {
    const { FakeRHegicTokenInstance, HegicConverterInstance } = contracts;

    await FakeRHegicTokenInstance.methods
      .approve(HegicConverterInstance._address, 50)
      .send({ from: accounts[0], gas: 1500000 });

    await HegicConverterInstance.methods
      .deposit(50)
      .send({ from: accounts[0], gas: 1500000 });

    const amountRHegicHeldByContract = await FakeRHegicTokenInstance.methods
      .balanceOf(HegicConverterInstance._address).call();
    const depositData = await HegicConverterInstance.methods
      .depositData(accounts[0]).call();

    assert(amountRHegicHeldByContract == 50, 'Contract did not correctly receive 50 rHEGIC');
    assert(
      depositData.amountDeposited == 50 && depositData.amountWithdrawn == 0,
      'Deposit data not correctly recorded in state variable'
    );
  });

  it('should allow user to claim refund and update state variable accordingly', async () => {
    const { FakeRHegicTokenInstance, HegicConverterInstance } = contracts;

    await FakeRHegicTokenInstance.methods
      .approve(HegicConverterInstance._address, 50)
      .send({ from: accounts[0], gas: 1500000 });

    await HegicConverterInstance.methods
      .deposit(50)
      .send({ from: accounts[0], gas: 1500000 });

      await HegicConverterInstance.methods
      .claimRefund()
      .send({ from: accounts[0], gas: 1500000 });

    const amountRHegicHeldByUser = await FakeRHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();
    const amountRHegicHeldByContract = await FakeRHegicTokenInstance.methods
      .balanceOf(HegicConverterInstance._address).call();
    const depositData = await HegicConverterInstance.methods
      .depositData(accounts[0]).call();

    console.log('amountRHegicHeldByUser:', amountRHegicHeldByUser);
    console.log('amountRHegicHeldByContract:', amountRHegicHeldByContract);
    console.log('depositData.amountDeposited:', depositData.amountDeposited);

    assert(
      amountRHegicHeldByUser == 100 && amountRHegicHeldByContract == 0,
      'Failed to correctly refund 50 rHEGIC to user'
    );
    assert(depositData.amountDeposited == 0, 'State variable not updated correctly');
  });
});
