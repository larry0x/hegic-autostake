const { ethers } = require('hardhat');
const BN = ethers.BigNumber.from;

const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

describe('AutoStakeToZHegic', () => {
  let owner;
  let recipient;
  let user1;
  let user2;

  let FakeHegicInstance;
  let FakeRHegicInstance;
  let IOUTokenRedemptionInstance;
  let FakeZHegicInstance;
  let FakeZLotPoolInstance;
  let AutoStakeToZHegicInstance;

  beforeEach(async () => {
    [ owner, recipient, user1, user2 ] = await ethers.getSigners();

    const FakeHegic = await ethers.getContractFactory('FakeHegic');
    FakeHegicInstance = await FakeHegic.deploy();

    const FakeRHegic = await ethers.getContractFactory('FakeRHegic');
    FakeRHegicInstance = await FakeRHegic.deploy();

    const IOUTokenRedemption = await ethers.getContractFactory('IOUTokenRedemption');
    IOUTokenRedemptionInstance = await IOUTokenRedemption
      .deploy(FakeRHegicInstance.address, FakeHegicInstance.address, 5);

    const FakeZHegic = await ethers.getContractFactory('FakeZHegic');
    FakeZHegicInstance = await FakeZHegic.deploy();

    const FakeZLotPool = await ethers.getContractFactory('FakeZLotPool');
    FakeZLotPoolInstance = await FakeZLotPool.deploy(
      FakeHegicInstance.address,
      FakeZHegicInstance.address,
      5
    );

    const AutoStakeToZHegic = await ethers.getContractFactory('AutoStakeToZHegic');
    AutoStakeToZHegicInstance = await AutoStakeToZHegic.deploy(
      FakeHegicInstance.address,
      FakeRHegicInstance.address,
      FakeZHegicInstance.address,
      FakeZLotPoolInstance.address,
      IOUTokenRedemptionInstance.address,
    );

    // Set pool address parameter for Fake zHEGIC token
    await FakeZHegicInstance.connect(owner).setPool(FakeZLotPoolInstance.address);

    // Fund IOUTokenRedemption contract with HEGIC
    await FakeHegicInstance.connect(owner)
      .transfer(IOUTokenRedemptionInstance.address, '100000000000000000000');

    // Set fee rate & recipeint
    await AutoStakeToZHegicInstance.connect(owner).setFeeRate(250);

    await AutoStakeToZHegicInstance.connect(owner)
      .setFeeRecipient(recipient.address);

    // Transfer some rHEGIC tokens to users
    await FakeRHegicInstance.connect(owner)
      .transfer(user1.address, '25000000000000000000');

    await FakeRHegicInstance.connect(owner)
      .transfer(user2.address, '25000000000000000000');

    // Approve spending
    await FakeRHegicInstance.connect(owner)
      .approve(AutoStakeToZHegicInstance.address, '50000000000000000000');

    await FakeRHegicInstance.connect(user1)
      .approve(AutoStakeToZHegicInstance.address, '25000000000000000000');

    await FakeRHegicInstance.connect(user2)
      .approve(AutoStakeToZHegicInstance.address, '25000000000000000000');

    // Make deposits
    await AutoStakeToZHegicInstance.connect(owner).deposit('50000000000000000000');
    await AutoStakeToZHegicInstance.connect(user1).deposit('25000000000000000000');
    await AutoStakeToZHegicInstance.connect(user2).deposit('15000000000000000000');

    // Deposit to redemption contract
    await AutoStakeToZHegicInstance.connect(owner).depositToRedemptionContract();
  });

  it('should redeem HEGIC and deposit to staking pool, receiving zHEGIC', async () => {
    for (i = 0; i < 5; i++) {
      await AutoStakeToZHegicInstance.connect(owner).redeemAndStake();
    }
    const balance = await FakeZHegicInstance.balanceOf(AutoStakeToZHegicInstance.address);
    expect(balance).to.equal('48719897456739562001');
  });

  it('should let user withdraw available zHEGIC', async () => {
    // 1 zHEGIC = 1.75 HEGIC
    // Redeem 18 HEGIC, get 10.286 zHEGIC
    await AutoStakeToZHegicInstance.connect(owner).redeemAndStake();

    // User2 withdraw 1.671 zHEGIC, minus fee 0.04286 zHEGIC
    // User1 withdraw 2.786 zHEGIC, minus fee 0.07143 zHEGIC
    // Owner withdraw 5.714 zHEGIC, minus fee 0.1429 zHEGIC
    await AutoStakeToZHegicInstance.connect(user2).withdrawStakedHEGIC();
    await AutoStakeToZHegicInstance.connect(user1).withdrawStakedHEGIC();
    await AutoStakeToZHegicInstance.connect(owner).withdrawStakedHEGIC();

    const user2WitndrawnAmount = await FakeZHegicInstance.balanceOf(user2.address);
    expect(user2WitndrawnAmount).to.equal('1671428571428571428');

    const user1WitndrawnAmount = await FakeZHegicInstance.balanceOf(user1.address);
    expect(user1WitndrawnAmount).to.equal('2785714285714285714');

    const ownerWitndrawnAmount = await FakeZHegicInstance.balanceOf(owner.address);
    expect(ownerWitndrawnAmount).to.equal('5571428571428571428');

    // 1 zHEGIC = 1.95 HEGIC
    // Redeem 72 HEGIC, get 36.923 zHEGIC
    // Total redeemed 90 HEGIC, total staked 47.209 zHEGIC
    await AutoStakeToZHegicInstance.connect(owner).redeemAndStake();

    // Owner withdraw 20.656 zHEGIC, minus fee 0.5164 zHEGIC
    // User1 withdraw 10.328 zHEGIC, minus fee 0.2582 zHEGIC
    // User1 withdraw  6.197 zHEGIC, minus fee 0.1549 zHEGIC
    await AutoStakeToZHegicInstance.connect(owner).withdrawStakedHEGIC();
    await AutoStakeToZHegicInstance.connect(user1).withdrawStakedHEGIC();
    await AutoStakeToZHegicInstance.connect(user2).withdrawStakedHEGIC();

    const recipientBalance = await FakeZHegicInstance.balanceOf(recipient.address);
    expect(recipientBalance).to.equal('1180219780219780218');

    // There will be a small amount of dust left over due to precision of integers,
    // but this number should be so small that it's negligible
    const totalWithdrawable = await AutoStakeToZHegicInstance.totalWithdrawable();
    expect(totalWithdrawable).to.be.below('10');
  });
});
