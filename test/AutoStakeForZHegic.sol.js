const { ethers } = require('hardhat');
const BN = ethers.BigNumber.from;

const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

describe('AutoStakeForZHegic', () => {
  let owner;
  let recipient;
  let user1;
  let user2;

  let FakeHegicInstance;
  let FakeRHegicInstance;
  let GradualTokenSwapInstance;
  let FakeZHegicInstance;
  let FakeZLotPoolInstance;
  let AutoStakeForZHegicInstance;

  beforeEach(async () => {
    [ owner, recipient, user1, user2 ] = await ethers.getSigners();

    const FakeHegic = await ethers.getContractFactory('FakeHegic');
    FakeHegicInstance = await FakeHegic.deploy();

    const FakeRHegic = await ethers.getContractFactory('FakeRHegic');
    FakeRHegicInstance = await FakeRHegic.deploy();

    const GradualTokenSwap = await ethers.getContractFactory('GradualTokenSwap');
    GradualTokenSwapInstance = await GradualTokenSwap
      .deploy(
        (await ethers.provider.getBlockNumber()) + 15,  // start after 15 blocks
        5,  // duration (number of blocks)
        FakeRHegicInstance.address,
        FakeHegicInstance.address
      );

    const FakeZHegic = await ethers.getContractFactory('FakeZHegic');
    FakeZHegicInstance = await FakeZHegic.deploy();

    const FakeZLotPool = await ethers.getContractFactory('FakeZLotPool');
    FakeZLotPoolInstance = await FakeZLotPool.deploy(
      FakeHegicInstance.address,
      FakeZHegicInstance.address,
      1
    );

    const AutoStakeForZHegic = await ethers.getContractFactory('AutoStakeForZHegic');
    AutoStakeForZHegicInstance = await AutoStakeForZHegic.deploy(
      FakeHegicInstance.address,
      FakeRHegicInstance.address,
      FakeZHegicInstance.address,
      FakeZLotPoolInstance.address,
      GradualTokenSwapInstance.address,
      200,  // fee rate, 2.0% in this case
      recipient.address  // fee recipient
    );

    // Set pool address parameter for Fake zHEGIC token
    await FakeZHegicInstance.connect(owner).setPool(FakeZLotPoolInstance.address);

    // Fund GradualTokenSwap contract with HEGIC
    await FakeHegicInstance.connect(owner).mint('100000000000000000000');

    await FakeHegicInstance.connect(owner)
      .transfer(GradualTokenSwapInstance.address, '100000000000000000000');

    // Transfer some rHEGIC tokens to users
    await FakeRHegicInstance.connect(owner).mint('100000000000000000000');

    await FakeRHegicInstance.connect(owner)
      .transfer(user1.address, '25000000000000000000');

    await FakeRHegicInstance.connect(owner)
      .transfer(user2.address, '25000000000000000000');

    // Approve spending
    await FakeRHegicInstance.connect(owner)
      .approve(AutoStakeForZHegicInstance.address, '50000000000000000000');

    await FakeRHegicInstance.connect(user1)
      .approve(AutoStakeForZHegicInstance.address, '25000000000000000000');

    await FakeRHegicInstance.connect(user2)
      .approve(AutoStakeForZHegicInstance.address, '25000000000000000000');

    // Make deposits
    await AutoStakeForZHegicInstance.connect(owner).deposit('50000000000000000000');
    await AutoStakeForZHegicInstance.connect(user1).deposit('25000000000000000000');
    await AutoStakeForZHegicInstance.connect(user2).deposit('15000000000000000000');

    // Deposit to redemption contract
    await AutoStakeForZHegicInstance.connect(owner).provideToGTS();
  });

  it('should redeem HEGIC and deposit to staking pool, receiving zHEGIC', async () => {
    // 1st redemption: 60% of initial deposit (54e18 HEGIC), exchange rate 115%
    // Get 46956521739130434782 zHEGIC
    //
    // 2nd redemption: 20% of initial deposit (18e18 HEGIC), exchange rate 116%
    // Get 15517241379310344827 zHEGIC
    //
    // 3rd redemption: 18e18 HEGIC --> 15384615384615384615 zHEGIC
    //
    // Total: 77858378503056164224 zHEGIC
    for (i = 0; i < 3; i++) {
      await AutoStakeForZHegicInstance.connect(owner).redeemAndStake();
    }
    const balance = await FakeZHegicInstance.balanceOf(AutoStakeForZHegicInstance.address);
    expect(balance).to.equal('77858378503056164224');
  });

  it('should let user withdraw available zHEGIC', async () => {
    //--------------------
    // 1st redemption
    //--------------------

    // 1 zHEGIC = 1.15 HEGIC
    // Redeem 54e18 HEGIC, get 46956521739130434782 zHEGIC
    await AutoStakeForZHegicInstance.connect(owner).redeemAndStake();

    // User2 withdraws 7826086956521739130 zHEGIC, pays 156521739130434782 zHEGIC fee,
    // gets 7669565217391304348 zHEGIC;
    await AutoStakeForZHegicInstance.connect(user2).withdraw();

    // User1 withdraws 13043478260869565217 zHEGIC, pays 260869565217391304 zHEGIC fee,
    // gets 12782608695652173913 zHEGIC;
    await AutoStakeForZHegicInstance.connect(user1).withdraw();

    var user2WitndrawnAmount = await FakeZHegicInstance.balanceOf(user2.address);
    expect(user2WitndrawnAmount).to.equal('7669565217391304348');

    var user1WitndrawnAmount = await FakeZHegicInstance.balanceOf(user1.address);
    expect(user1WitndrawnAmount).to.equal('12782608695652173913');

    //--------------------
    // 2nd redemption
    //--------------------

    // 1 zHEGIC = 1.18 HEGIC
    // Redeem 36e18 HEGIC, get 30508474576271186440 zHEGIC
    // Total staked 77464996315401621222 zHEGIC
    await AutoStakeForZHegicInstance.connect(owner).redeemAndStake();

    // Owner withdraws 43036109064112011790 zHEGIC, pays 860722181282240235 zHEGIC fee,
    // gets 42175386882829771555 zHEGIC
    await AutoStakeForZHegicInstance.connect(owner).withdraw();

    // User1 withdraws 8474576271186440678 zHEGIC, pays 169491525423728813 zHEGIC fee,
    // gets 8305084745762711865 zHEGIC, total 21087693441414885778 zHEGIC
    await AutoStakeForZHegicInstance.connect(user1).withdraw();

    // User 2 withdraws 5084745762711864407 zHEGIC, pays 101694915254237288 zHEGIC fee,
    // gets 4983050847457627119 zHEGIC, total 12652616064848931467 zHEGIC
    await AutoStakeForZHegicInstance.connect(user2).withdraw();

    var ownerWitndrawnAmount = await FakeZHegicInstance.balanceOf(owner.address);
    expect(ownerWitndrawnAmount).to.equal('42175386882829771555');

    user1WitndrawnAmount = await FakeZHegicInstance.balanceOf(user1.address);
    expect(user1WitndrawnAmount).to.equal('21087693441414885778');

    user2WitndrawnAmount = await FakeZHegicInstance.balanceOf(user2.address);
    expect(user2WitndrawnAmount).to.equal('12652616064848931467');

    // Initial deposit ratio 50:25:15 = 1:0.5:0.3
    // Final zHEGIC ratio is also 1:0.5:0.3. Fair distribution!

    //--------------------
    // Finally
    //--------------------

    const recipientBalance = await FakeZHegicInstance.balanceOf(recipient.address);
    expect(recipientBalance).to.equal('1549299926308032422');

    // There will be a small amount of dust left over due to precision of integers,
    // but this number should be so small that it's negligible
    const totalWithdrawable = await AutoStakeForZHegicInstance.totalWithdrawable();
    expect(totalWithdrawable).to.be.below('10');
  });
});
