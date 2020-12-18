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

  let FakeWBTCInstance;
  let FakeHegicInstance;
  let FakeRHegicInstance;
  let FakeSHegicInstance;
  let IOUTokenRedemptionInstance;
  let AutoStakeToSHegicInstance;

  beforeEach(async () => {
    [ owner, recipient, user1, user2 ] = await ethers.getSigners();

    const FakeWBTC = await ethers.getContractFactory('FakeWBTC');
    FakeWBTCInstance = await FakeWBTC.deploy();

    const FakeHegic = await ethers.getContractFactory('FakeHegic');
    FakeHegicInstance = await FakeHegic.deploy();

    const FakeRHegic = await ethers.getContractFactory('FakeRHegic');
    FakeRHegicInstance = await FakeRHegic.deploy();

    const FakeSHegic = await ethers.getContractFactory('FakeSHegic');
    FakeSHegicInstance = await FakeSHegic
      .deploy(FakeHegicInstance.address, FakeWBTCInstance.address);

    const IOUTokenRedemption = await ethers.getContractFactory('IOUTokenRedemption');
    IOUTokenRedemptionInstance = await IOUTokenRedemption
      .deploy(FakeRHegicInstance.address, FakeHegicInstance.address, 5);

    const AutoStakeToSHegic = await ethers.getContractFactory('AutoStakeToSHegic');
    AutoStakeToSHegicInstance = await AutoStakeToSHegic.deploy(
      FakeWBTCInstance.address,
      FakeHegicInstance.address,
      FakeRHegicInstance.address,
      FakeSHegicInstance.address,
      IOUTokenRedemptionInstance.address,
    );

    // Fund IOUTokenRedemption contract with HEGIC
    await FakeHegicInstance.connect(owner)
      .transfer(IOUTokenRedemptionInstance.address, '100000000000000000000');

    // Set fee rate & recipeint
    await AutoStakeToSHegicInstance.connect(owner).setFeeRate(250);

    await AutoStakeToSHegicInstance.connect(owner)
      .setFeeRecipient(recipient.address);

    // Transfer some rHEGIC tokens to users
    await FakeRHegicInstance.connect(owner)
      .transfer(user1.address, '25000000000000000000');

    await FakeRHegicInstance.connect(owner)
      .transfer(user2.address, '25000000000000000000');

    // Approve spending
    await FakeRHegicInstance.connect(owner)
      .approve(AutoStakeToSHegicInstance.address, '50000000000000000000');

    await FakeRHegicInstance.connect(user1)
      .approve(AutoStakeToSHegicInstance.address, '25000000000000000000');

    await FakeRHegicInstance.connect(user2)
      .approve(AutoStakeToSHegicInstance.address, '25000000000000000000');

    // Make deposits
    await AutoStakeToSHegicInstance.connect(owner).deposit('50000000000000000000');
    await AutoStakeToSHegicInstance.connect(user1).deposit('25000000000000000000');
    await AutoStakeToSHegicInstance.connect(user2).deposit('15000000000000000000');

    // Fund sHEGIC contract some ether for use in `claimAllProfit` function
    await owner.sendTransaction({
      to: FakeSHegicInstance.address,
      value: ethers.utils.parseEther('1')
    });
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
    const balance = await FakeRHegicInstance.balanceOf(AutoStakeToSHegicInstance.address);
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

    const userBalance = await FakeRHegicInstance.balanceOf(user2.address);
    expect(userBalance).to.equal('25000000000000000000');

    const contractBalance = await FakeRHegicInstance.balanceOf(AutoStakeToSHegicInstance.address);
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

    const autostakeContractBalance = await FakeRHegicInstance
      .balanceOf(AutoStakeToSHegicInstance.address);
    expect(autostakeContractBalance).to.equal('0');

    const redemptionContractBalance = await FakeRHegicInstance
      .balanceOf(IOUTokenRedemptionInstance.address);
    expect(redemptionContractBalance).to.equal('90000000000000000000');

    const allowDeposit = await AutoStakeToSHegicInstance.allowDeposit();
    expect(allowDeposit).to.be.false;

    const allowClaimRefund = await AutoStakeToSHegicInstance.allowClaimRefund();
    expect(allowClaimRefund).to.be.false;
  });

  it('should reject deposits & refund claims once rHEGIC have been transferred to redemption contract', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();

    await expect(AutoStakeToSHegicInstance.connect(user2).deposit('10000000000000000000'))
      .to.be.rejectedWith('New deposits no longer accepted');

    await expect(AutoStakeToSHegicInstance.connect(user2).claimRefund())
      .to.be.rejectedWith('Funds already transferred to the redemption contract');
  });

  it('should redeem HEGIC and deposit to staking pool, receiving sHEGIC', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();
    await AutoStakeToSHegicInstance.connect(owner).redeemAndStake();

    const balance = await FakeSHegicInstance.balanceOf(AutoStakeToSHegicInstance.address);
    expect(balance).to.equal('18000000000000000000');

    const totalRedeemed = await AutoStakeToSHegicInstance.totalRedeemed();
    expect(totalRedeemed).to.equal('18000000000000000000');

    const totalWithdrawable = await AutoStakeToSHegicInstance.totalWithdrawable();
    expect(totalWithdrawable).to.equal('18000000000000000000');

    const lastRedemptionTimestamp = await AutoStakeToSHegicInstance.lastRedemptionTimestamp();
    expect(lastRedemptionTimestamp).to.not.equal('0');
  });

  it('should reject withdrawals before redemption is completed', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();
    await AutoStakeToSHegicInstance.connect(owner).redeemAndStake();

    await expect(AutoStakeToSHegicInstance.connect(owner).withdrawStakedHEGIC())
      .to.be.rejectedWith('Withdrawal not opened yet')
  });

  it('should let user withdraw available sHEGIC', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();

    for (i = 0; i < 5; i++) {
      await AutoStakeToSHegicInstance.connect(owner).redeemAndStake();
    }

    // There should be 90 sHEGIC, 0.1 ETH, 0.01 WBTC available
    // User 2 should get 14.625 sHEGIC (after fee), 0.01667 ETH, 0.001667 WBTC
    await AutoStakeToSHegicInstance.connect(user2).withdrawStakedHEGIC();

    const user2WitndrawnAmount = await FakeSHegicInstance.balanceOf(user2.address);
    expect(user2WitndrawnAmount).to.equal('14625000000000000000');

    const user2WbtcAmount = await FakeWBTCInstance.balanceOf(user2.address);
    expect(user2WbtcAmount).to.equal('166666');

    // There should now be 75 sHEGIC, 0.01833334 WBTC
    // User 1 should get 24.375 sHEGIC, 0.00509259 WBTC
    await AutoStakeToSHegicInstance.connect(user1).withdrawStakedHEGIC();

    const user1WitndrawnAmount = await FakeSHegicInstance.balanceOf(user1.address);
    expect(user1WitndrawnAmount).to.equal('24375000000000000000');

    const user1WbtcAmount = await FakeWBTCInstance.balanceOf(user1.address);
    expect(user1WbtcAmount).to.equal('611111');

    // There should now be 50 sHEGIC, 0.02222223 WBTC
    // Owner should get 48.750 sHEGIC, 0.02222222 WBTC
    await AutoStakeToSHegicInstance.connect(owner).withdrawStakedHEGIC();

    const ownerWitndrawnAmount = await FakeSHegicInstance.balanceOf(owner.address);
    expect(ownerWitndrawnAmount).to.equal('48750000000000000000');

    const ownerWbtcAmount = await FakeWBTCInstance.balanceOf(owner.address);
    expect(ownerWbtcAmount).to.equal('2222222');

    // No more sHEGIC left for withdrawal; transaction should fail
    await expect(AutoStakeToSHegicInstance.connect(owner).withdrawStakedHEGIC())
      .to.be.rejectedWith('No sHEGIC token available for withdrawal');
  });

  it('should calculate amount of staking profit collected correctly', async () => {
    await AutoStakeToSHegicInstance.connect(owner).depositToRedemptionContract();

    for (i = 0; i < 5; i++) {
      await AutoStakeToSHegicInstance.connect(owner).redeemAndStake();
    }

    await AutoStakeToSHegicInstance.connect(user2).withdrawStakedHEGIC();
    await AutoStakeToSHegicInstance.connect(user1).withdrawStakedHEGIC();

    // At this point, the contract should have collected 0.2 ETH & 0.02 WBTC profit;
    // another 0.1 ETH & 0.01 WBTC to be collected
    const [ ethProfit, wbtcProfit ] = await AutoStakeToSHegicInstance.getStakingProfit();

    expect(ethProfit).to.equal('300000000000000000');
    expect(wbtcProfit).to.equal('3000000');
  });
});
