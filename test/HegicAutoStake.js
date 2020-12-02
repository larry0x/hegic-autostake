const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const web3 = new Web3(ganache.provider());
const compiledContracts = require('../compile.js');
const { deployAllContracts } = require('./utils.js');

var accounts;
var contracts;

describe('HegicAutoStake', () => {
  beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    contracts = await deployAllContracts(web3, compiledContracts, accounts[0]);

    const {
      FakeHegicTokenInstance,
      FakeRHegicTokenInstance,
      HegicAutoStakeInstance ,
      IOUTokenRedemptionInstance
    } = contracts;

    await FakeRHegicTokenInstance.methods
      .approve(HegicAutoStakeInstance._address, 50)
      .send({ from: accounts[0], gas: 1500000 });

    await HegicAutoStakeInstance.methods
      .deposit(50)
      .send({ from: accounts[0], gas: 1500000 });

    // Don't forget to fund the redemption contract with FakeHEGIC
    await FakeHegicTokenInstance.methods
      .transfer(IOUTokenRedemptionInstance._address, 100)
      .send({ from: accounts[0], gas: 1500000 });
  });

  it('should deploy successfully', async () => {
    const { HegicAutoStakeInstance } = contracts;
    assert(HegicAutoStakeInstance, 'Contract object is null or undefined');
  });

  it('should set fee rate correctly', async () => {
    const { HegicAutoStakeInstance } = contracts;

    await HegicAutoStakeInstance.methods
      .setFeeRate(500)
      .send({ from: accounts[0], gas: 1500000 });

    const newFeeRate = await HegicAutoStakeInstance.methods
      .feeRate().call();
    assert(newFeeRate == 500, 'Fee rate not correctly set to 500');
  });

  it('should set fee recipient correctly', async () => {
    const { HegicAutoStakeInstance } = contracts;

    await HegicAutoStakeInstance.methods
      .setFeeRecipient(accounts[1])
      .send({ from: accounts[0], gas: 1500000 });

    const newFeeRecipient = await HegicAutoStakeInstance.methods
      .feeRecipient().call();
    assert(newFeeRecipient == accounts[1], 'Fee recipient not correctly set to accounts[1]');
  });

  it('should accept user deposit and correctly record data in state variable', async () => {
    const { FakeRHegicTokenInstance, HegicAutoStakeInstance } = contracts;

    const amountRHegicHeldByContract = await FakeRHegicTokenInstance.methods
      .balanceOf(HegicAutoStakeInstance._address).call();
    const depositData = await HegicAutoStakeInstance.methods
      .depositData(accounts[0]).call();

    assert(amountRHegicHeldByContract == 50, 'Contract did not correctly receive 50 rHEGIC');
    assert(
      depositData.amountDeposited == 50 && depositData.amountWithdrawn == 0,
      'Deposit data not correctly recorded in state variable'
    );
  });

  it('should allow user to claim refund and update state variable accordingly', async () => {
    const { FakeRHegicTokenInstance, HegicAutoStakeInstance } = contracts;

    await HegicAutoStakeInstance.methods
      .claimRefund()
      .send({ from: accounts[0], gas: 1500000 });

    const amountRHegicHeldByUser = await FakeRHegicTokenInstance.methods
      .balanceOf(accounts[0]).call();
    const amountRHegicHeldByContract = await FakeRHegicTokenInstance.methods
      .balanceOf(HegicAutoStakeInstance._address).call();
    const depositData = await HegicAutoStakeInstance.methods
      .depositData(accounts[0]).call();

    // console.log('amountRHegicHeldByUser:', amountRHegicHeldByUser);
    // console.log('amountRHegicHeldByContract:', amountRHegicHeldByContract);
    // console.log('depositData.amountDeposited:', depositData.amountDeposited);

    assert(
      amountRHegicHeldByUser == 100 && amountRHegicHeldByContract == 0,
      'Failed to correctly refund 50 rHEGIC to user'
    );
    assert(depositData.amountDeposited == 0, 'State variable not updated correctly');
  });

  it('should correctly transfer rHEGIC to redemption contract', async () => {
    const {
      FakeRHegicTokenInstance,
      HegicAutoStakeInstance,
      IOUTokenRedemptionInstance
    } = contracts;

    await HegicAutoStakeInstance.methods
      .depositToRedemptionContract()
      .send({ from: accounts[0], gas: 1500000 });

    const balanceInConverterAfterDeposit = await FakeRHegicTokenInstance.methods
      .balanceOf(HegicAutoStakeInstance._address).call();
    const balanceInRedemptionAfterDeposit = await FakeRHegicTokenInstance.methods
      .balanceOf(IOUTokenRedemptionInstance._address).call();

    assert(
      balanceInConverterAfterDeposit == 0 && balanceInRedemptionAfterDeposit == 50,
      'rHEGIC tokens not correctly transferred to redemption contract'
    );
  });

  it('should reject deposits and refunds after deposited to redemption contract', async () => {
    const { HegicAutoStakeInstance } = contracts;

    await HegicAutoStakeInstance.methods
      .depositToRedemptionContract()
      .send({ from: accounts[0], gas: 1500000 });

    var error = null;
    try {
      await HegicAutoStakeInstance.methods
        .deposit(50)
        .send({ from: accounts[0], gas: 1500000 });
    } catch (err) {
      error = err;
      // console.log(err);
    }
    assert.ok(error, 'Failed to throw an error if user attempts to deposit');

    error = null;
    try {
      await HegicAutoStakeInstance.methods
        .claimRefund()
        .send({ from: accounts[0], gas: 1500000 });
    } catch (err) {
      error = err;
      // console.log(err);
    }
    assert.ok(error, 'Failed to throw an error if user attempts to claim refund');
  });

  it('should correctly redeem HEGIC and depoist to staking pool', async () => {
    const { HegicAutoStakeInstance, FakeHegicStakingPoolInstance } = contracts;

    await HegicAutoStakeInstance.methods
      .depositToRedemptionContract()
      .send({ from: accounts[0], gas: 1500000 });

    // This will advance 1 block number, so amount should be
    // amountDeposited * 1 / blocksToRelease = 50 * 1 / 5 = 10
    await HegicAutoStakeInstance.methods
      .redeemAndStake()
      .send({ from: accounts[0], gas: 1500000 });

    const sHegicBalance = await FakeHegicStakingPoolInstance.methods
      .balanceOf(HegicAutoStakeInstance._address).call();
    assert(sHegicBalance == 10, 'Converter is not correctly credited 10 sHEGIC');
  });

  it('should let user withdraw fund and transfer fee to recipient', async () => {
    const {
      FakeRHegicTokenInstance,
      HegicAutoStakeInstance,
      FakeHegicStakingPoolInstance
    } = contracts;

    // Add two more depositors to obfuscate the problem a bit more
    await FakeRHegicTokenInstance.methods
      .transfer(accounts[1], 25)
      .send({ from: accounts[0], gas: 1500000 });
    await FakeRHegicTokenInstance.methods
      .transfer(accounts[2], 7)
      .send({ from: accounts[0], gas: 1500000 });

    await FakeRHegicTokenInstance.methods
      .approve(HegicAutoStakeInstance._address, 25)
      .send({ from: accounts[1], gas: 1500000 });
    await HegicAutoStakeInstance.methods
      .deposit(25)
      .send({ from: accounts[1], gas: 1500000 });

    await FakeRHegicTokenInstance.methods
      .approve(HegicAutoStakeInstance._address, 7)
      .send({ from: accounts[2], gas: 1500000 });
    await HegicAutoStakeInstance.methods
      .deposit(7)
      .send({ from: accounts[2], gas: 1500000 });

    await HegicAutoStakeInstance.methods
      .depositToRedemptionContract()
      .send({ from: accounts[0], gas: 1500000 });

    // A total of 50 + 25 + 7 = 82 rHEGIC tokens was added to redemption contract
    // One block have passed, so redeemable amount is 82 * 1 / 5 = 16 tokens
    // The three depositors can claim 16, 16, 7 tokens, respectively.
    await HegicAutoStakeInstance.methods
      .redeemAndStake()
      .send({ from: accounts[0], gas: 1500000 });

    var depositorZeroWithdrawable = await HegicAutoStakeInstance.methods
      .getUserWithdrawableAmount(accounts[0]).call()
    var depositorOneWithdrawable = await HegicAutoStakeInstance.methods
      .getUserWithdrawableAmount(accounts[1]).call()
    var depositorTwoWithdrawable = await HegicAutoStakeInstance.methods
      .getUserWithdrawableAmount(accounts[2]).call()
    var nonDepositorWithdrawable = await HegicAutoStakeInstance.methods
      .getUserWithdrawableAmount(accounts[3]).call()

    // console.log('depositorZeroWithdrawable:', depositorZeroWithdrawable);
    // console.log('depositorOneWithdrawable:', depositorOneWithdrawable);
    // console.log('depositorTwoWithdrawable:', depositorTwoWithdrawable);
    // console.log('nonDepositorWithdrawable:', nonDepositorWithdrawable);

    assert(
      depositorZeroWithdrawable == 16 &&
      depositorOneWithdrawable == 16 &&
      depositorTwoWithdrawable == 7 &&
      nonDepositorWithdrawable == 0,
      'Withdrawable amount not correctly calculated'
    );

    // Should withdraw 7 sHEGIC, 16 - 7 = 9 remaining
    await HegicAutoStakeInstance.methods
      .withdrawStakedHEGIC()
      .send({ from: accounts[2], gas: 1500000 });

    // Should withdraw 9 sHEGIC, zero remaining
    await HegicAutoStakeInstance.methods
      .withdrawStakedHEGIC()
      .send({ from: accounts[1], gas: 1500000 });

    const depositorTwoSHegicBalance = await FakeHegicStakingPoolInstance.methods
      .balanceOf(accounts[2]).call();
    var depositorOneSHegicBalance = await FakeHegicStakingPoolInstance.methods
      .balanceOf(accounts[1]).call();

    // console.log('depositorTwoSHegicBalance:', depositorTwoSHegicBalance);
    // console.log('depositorOneSHegicBalance:', depositorOneSHegicBalance);

    assert(
      depositorTwoSHegicBalance == 7 && depositorOneSHegicBalance == 9,
      'Depositors 2 and 1 did not receive correct amount of sHEGIC token'
    );

    // Send a transaction to advance 1 block
    await FakeRHegicTokenInstance.methods
      .transfer(accounts[3], 1)
      .send({ from: accounts[0], gas: 1500000 });

    // 5 blocks passed, all HEGIC should be released at this point
    await HegicAutoStakeInstance.methods
      .redeemAndStake()
      .send({ from: accounts[0], gas: 1500000 });

    await HegicAutoStakeInstance.methods
      .withdrawStakedHEGIC()
      .send({ from: accounts[0], gas: 1500000 });
    await HegicAutoStakeInstance.methods
      .withdrawStakedHEGIC()
      .send({ from: accounts[1], gas: 1500000 });

    const depositorZeroSHegicBalance = await FakeHegicStakingPoolInstance.methods
      .balanceOf(accounts[0]).call();
    depositorOneSHegicBalance = await FakeHegicStakingPoolInstance.methods
      .balanceOf(accounts[1]).call();

    // console.log('depositorZeroSHegicBalance:', depositorZeroSHegicBalance);
    // console.log('depositorOneSHegicBalance:', depositorOneSHegicBalance);

    assert(
      depositorZeroSHegicBalance == 50 && depositorOneSHegicBalance == 25,
      'Depositors 0 and 1 did not receive correct amount of sHEGIC token'
    );
  });
});
