const { ethers } = require('hardhat');
const BN = ethers.BigNumber.from;

const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;


describe('AutoStakeToSHegic', () => {
  let owner;
  let recipient;
  let user1;
  let user2;

  let FakeHegicTokenInstance;
  let FakeRHegicTokenInstance;
  let IOUTokenRedemptionInstance;
  let FakeHegicStakingPoolInstance;
  let AutoStakeToSHegicInstance;

  beforeEach(async () => {
    [ owner, recipient, user1, user2 ] = await ethers.getSigners();

    const FakeHegicToken = await ethers.getContractFactory('FakeHegicToken');
    FakeHegicTokenInstance = await FakeHegicToken.deploy();

    const FakeRHegicToken = await ethers.getContractFactory('FakeRHegicToken');
    FakeRHegicTokenInstance = await FakeRHegicToken.deploy();

    const IOUTokenRedemption = await ethers.getContractFactory('IOUTokenRedemption');
    IOUTokenRedemptionInstance = await IOUTokenRedemption
      .deploy(FakeRHegicTokenInstance.address, FakeHegicTokenInstance.address, 5);

    const FakeHegicStakingPool = await ethers.getContractFactory('FakeHegicStakingPool');
    FakeHegicStakingPoolInstance = await FakeHegicStakingPool
      .deploy(FakeHegicTokenInstance.address);

    const AutoStakeToSHegic = await ethers.getContractFactory('AutoStakeToSHegic');
    AutoStakeToSHegicInstance = await AutoStakeToSHegic.deploy(
      FakeHegicTokenInstance.address,
      FakeRHegicTokenInstance.address,
      IOUTokenRedemptionInstance.address,
      FakeHegicStakingPoolInstance.address
    );

    // Fund IOUTokenRedemption contract with HEGIC
    await FakeHegicTokenInstance.connect(owner)
      .transfer(IOUTokenRedemptionInstance.address, '100000000000000000000');

    // Set fee rate & recipeint
    await AutoStakeToSHegicInstance.connect(owner).setFeeRate(250);

    await AutoStakeToSHegicInstance.connect(owner)
      .setFeeRecipient(recipient.address);

    // Transfer some rHEGIC tokens to users
    await FakeRHegicTokenInstance.connect(owner)
      .transfer(user1.address, '25000000000000000000');

    await FakeRHegicTokenInstance.connect(owner)
      .transfer(user2.address, '25000000000000000000');

    // Approve spending
    await FakeRHegicTokenInstance.connect(owner)
      .approve(AutoStakeToSHegicInstance.address, '50000000000000000000');

    await FakeRHegicTokenInstance.connect(user1)
      .approve(AutoStakeToSHegicInstance.address, '25000000000000000000');

    await FakeRHegicTokenInstance.connect(user2)
      .approve(AutoStakeToSHegicInstance.address, '25000000000000000000');

    // Make deposits
    await AutoStakeToSHegicInstance.connect(owner).deposit('50000000000000000000');
    await AutoStakeToSHegicInstance.connect(user1).deposit('25000000000000000000');
    await AutoStakeToSHegicInstance.connect(user2).deposit('15000000000000000000');
  });

  it('should set fee rate successfully', async () => {
    const feeRate = await AutoStakeToSHegicInstance.feeRate();
    expect(feeRate).to.equal('250');
  });

  it('should set fee recipient correctly', async () => {
    const feeRecipient = await AutoStakeToSHegicInstance.feeRecipient();
    expect(feeRecipient).to.equal(recipient.address);
  });

  it('should accept user deposit and record data in state variables correctly', async () => {
    const balance = await FakeRHegicTokenInstance.balanceOf(AutoStakeToSHegicInstance.address);
    expect(balance).to.equal('90000000000000000000');

    const totalDepositors = await AutoStakeToSHegicInstance.totalDepositors();
    expect(totalDepositors).to.equal('3');

    const totalDeposited = await AutoStakeToSHegicInstance.totalDeposited();
    expect(totalDeposited).to.equal('90000000000000000000');

    const userData = await AutoStakeToSHegicInstance.userData(user2.address);
    expect(userData.amountDeposited).to.equal('15000000000000000000');
    expect(userData.amountWithdrawn).to.equal('0');
  });

  it('should allow user to claim refund and update state variables accordingly', async () => {
    await AutoStakeToSHegicInstance.connect(user2).claimRefund();

    const userBalance = await FakeRHegicTokenInstance.balanceOf(user2.address);
    expect(userBalance).to.equal('25000000000000000000');

    const contractBalance = await FakeRHegicTokenInstance.balanceOf(AutoStakeToSHegicInstance.address);
    expect(contractBalance).to.equal('75000000000000000000');

    const userData = await AutoStakeToSHegicInstance.userData(user2.address);
    expect(userData.amountDeposited).to.equal('0');

    const totalDepositors = await AutoStakeToSHegicInstance.totalDepositors();
    expect(totalDepositors).to.equal('2');

    const totalDeposited = await AutoStakeToSHegicInstance.totalDeposited();
    expect(totalDeposited).to.equal('75000000000000000000');
  });

  it('should correctly transfer rHEGIC tokens to redemption contract', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();

    const autostakeContractBalance = await FakeRHegicTokenInstance
      .balanceOf(AutoStakeToSHegicInstance.address);
    expect(autostakeContractBalance).to.equal('0');

    const redemptionContractBalance = await FakeRHegicTokenInstance
      .balanceOf(IOUTokenRedemptionInstance.address);
    expect(redemptionContractBalance).to.equal('90000000000000000000');

    const allowDeposit = await AutoStakeToSHegicInstance.allowDeposit();
    expect(allowDeposit).to.be.false;

    const allowClaimRefund = await AutoStakeToSHegicInstance.allowClaimRefund();
    expect(allowClaimRefund).to.be.false;
  });

  it('should reject deposits & refund claims once rHEGIC tokens have been transferred to redemption contract', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();

    await expect(AutoStakeToSHegicInstance.connect(user2).deposit('10000000000000000000'))
      .to.be.rejectedWith('New deposits no longer accepted');

    await expect(AutoStakeToSHegicInstance.connect(user2).claimRefund())
      .to.be.rejectedWith('Funds already transferred to the redemption contract');
  });

  it('should redeem HEGIC and deposit to staking pool, receiving sHEGIC', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();
    await AutoStakeToSHegicInstance.connect(owner).redeemAndStake();

    const balance = await FakeHegicStakingPoolInstance.balanceOf(AutoStakeToSHegicInstance.address);
    expect(balance).to.equal('18000000000000000000');

    const totalRedeemed = await AutoStakeToSHegicInstance.totalRedeemed();
    expect(totalRedeemed).to.equal('18000000000000000000');

    const totalWithdrawable = await AutoStakeToSHegicInstance.totalWithdrawable();
    expect(totalWithdrawable).to.equal('18000000000000000000');

    const lastRedemptionTimestamp = await AutoStakeToSHegicInstance.lastRedemptionTimestamp();
    expect(lastRedemptionTimestamp).to.not.equal('0');
  });

  it('should let user withdraw available sHEGIC', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();
    await AutoStakeToSHegicInstance.connect(owner).redeemAndStake();

    // Should have 18 sHEGIC available; user 2 can withdraw 15 sHEGIC, minus fees
    await AutoStakeToSHegicInstance.connect(user2).withdrawStakedHEGIC();

    const user2WitndrawnAmount = await FakeHegicStakingPoolInstance.balanceOf(user2.address);
    expect(user2WitndrawnAmount).to.equal('14625000000000000000');

    // 3 sHEGIC available after this withdrawl; user 1 should be able to withdraw these
    await AutoStakeToSHegicInstance.connect(user1).withdrawStakedHEGIC();

    const user1WitndrawnAmount = await FakeHegicStakingPoolInstance.balanceOf(user1.address);
    expect(user1WitndrawnAmount).to.equal('2925000000000000000');

    // Recipient should have received 18 * 2.5% = 0.45 sHEGIC fee
    const recipientBalance = await FakeHegicStakingPoolInstance.balanceOf(recipient.address);
    expect(recipientBalance).to.equal('450000000000000000');

    // No more sHEGIC left for withdrawal; transaction should fail
    await expect(AutoStakeToSHegicInstance.connect(owner).withdrawStakedHEGIC())
      .to.be.rejectedWith('No sHEGIC token available for withdrawal');
  });

  it('should update state variables correctly after user withdrawals', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();
    await AutoStakeToSHegicInstance.connect(owner).redeemAndStake();
    await AutoStakeToSHegicInstance.connect(user2).withdrawStakedHEGIC();

    const totalWithdrawable = await AutoStakeToSHegicInstance.totalWithdrawable();
    expect(totalWithdrawable).to.equal('3000000000000000000');

    const totalWithdrawn = await AutoStakeToSHegicInstance.totalWithdrawn();
    expect(totalWithdrawn).to.equal('14625000000000000000');

    const totalFeeCollected = await AutoStakeToSHegicInstance.totalFeeCollected();
    expect(totalFeeCollected).to.equal('375000000000000000');

    const userData = await AutoStakeToSHegicInstance.userData(user2.address);
    expect(userData.amountWithdrawn).to.equal('15000000000000000000');
  });
});
