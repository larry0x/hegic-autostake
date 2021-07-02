const { ethers } = require('hardhat');
const BN = ethers.BigNumber.from;

const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

describe('AutoStake', () => {
  let owner;
  let recipient;
  let user1;
  let user2;

  let MockHegicInstance;
  let MockRHegicInstance;
  let MockZHegicInstance;
  let MockZLotPoolInstance;
  let MockGTSInstance;
  let AutoStakeInstance;

  beforeEach(async () => {
    [ owner, recipient, user1, user2 ] = await ethers.getSigners();

    const MockHegic = await ethers.getContractFactory('MockHegic');
    MockHegicInstance = await MockHegic.deploy();

    const MockRHegic = await ethers.getContractFactory('MockRHegic');
    MockRHegicInstance = await MockRHegic.deploy();

    const MockGradualTokenSwap = await ethers.getContractFactory('MockGradualTokenSwap');
    MockGTSInstance = await MockGradualTokenSwap.deploy(
      (await ethers.provider.getBlockNumber()) + 15,
      5,
      MockRHegicInstance.address,
      MockHegicInstance.address
    );

    const MockZHegic = await ethers.getContractFactory('MockZHegic');
    MockZHegicInstance = await MockZHegic.deploy();

    const MockZLotPool = await ethers.getContractFactory('MockZLotPool');
    MockZLotPoolInstance = await MockZLotPool.deploy(
      MockHegicInstance.address,
      MockZHegicInstance.address,
      1
    );

    const AutoStake = await ethers.getContractFactory('AutoStake');
    AutoStakeInstance = await AutoStake.deploy(
      MockHegicInstance.address,
      MockRHegicInstance.address,
      MockZHegicInstance.address,
      MockZLotPoolInstance.address,
      MockGTSInstance.address,
      200,
      recipient.address
    );

    // Set pool address parameter for Mock zHEGIC token
    await MockZHegicInstance.connect(owner).setPool(MockZLotPoolInstance.address);

    // Fund GradualTokenSwap contract with HEGIC
    await MockHegicInstance.connect(owner).mint('100000000000000000000');

    await MockHegicInstance.connect(owner)
      .transfer(MockGTSInstance.address, '100000000000000000000');

    // Transfer some rHEGIC tokens to users
    await MockRHegicInstance.connect(owner).mint('100000000000000000000');

    await MockRHegicInstance.connect(owner)
      .transfer(user1.address, '25000000000000000000');

    await MockRHegicInstance.connect(owner)
      .transfer(user2.address, '25000000000000000000');

    // Approve spending
    await MockRHegicInstance.connect(owner)
      .approve(AutoStakeInstance.address, '50000000000000000000');

    await MockRHegicInstance.connect(user1)
      .approve(AutoStakeInstance.address, '25000000000000000000');

    await MockRHegicInstance.connect(user2)
      .approve(AutoStakeInstance.address, '25000000000000000000');

    // Make deposits
    await AutoStakeInstance.connect(owner).deposit('50000000000000000000');
    await AutoStakeInstance.connect(user1).deposit('25000000000000000000');
    await AutoStakeInstance.connect(user2).deposit('15000000000000000000');
  });

  it('should accept user deposit and record data in state variables correctly', async () => {
    const balance = await MockRHegicInstance.balanceOf(AutoStakeInstance.address);
    expect(balance).to.equal('90000000000000000000');

    const totalDepositors = await AutoStakeInstance.totalDepositors();
    expect(totalDepositors).to.equal('3');

    const totalDeposited = await AutoStakeInstance.totalDeposited();
    expect(totalDeposited).to.equal('90000000000000000000');

    const amountDeposited = await AutoStakeInstance.amountDeposited(user2.address);
    expect(amountDeposited).to.equal('15000000000000000000');

    const amountWithdrawn = await AutoStakeInstance.amountWithdrawn(user2.address);
    expect(amountWithdrawn).to.equal('0');
  });

  it('should allow user to claim refund and update state variables accordingly', async () => {
    await AutoStakeInstance.connect(user2).claimRefund();

    const userBalance = await MockRHegicInstance.balanceOf(user2.address);
    expect(userBalance).to.equal('25000000000000000000');

    const contractBalance = await MockRHegicInstance.balanceOf(AutoStakeInstance.address);
    expect(contractBalance).to.equal('75000000000000000000');

    const amountDeposited = await AutoStakeInstance.amountDeposited(user2.address);
    expect(amountDeposited).to.equal('0');

    const totalDepositors = await AutoStakeInstance.totalDepositors();
    expect(totalDepositors).to.equal('2');

    const totalDeposited = await AutoStakeInstance.totalDeposited();
    expect(totalDeposited).to.equal('75000000000000000000');
  });

  it('should correctly transfer rHEGIC tokens to redemption contract', async () => {
    await AutoStakeInstance.connect(owner).provideToGTS();

    const autostakeContractBalance = await MockRHegicInstance
      .balanceOf(AutoStakeInstance.address);
    expect(autostakeContractBalance).to.equal('0');

    const redemptionContractBalance = await MockRHegicInstance
      .balanceOf(MockGTSInstance.address);
    expect(redemptionContractBalance).to.equal('90000000000000000000');

    const allowDeposit = await AutoStakeInstance.allowDeposit();
    expect(allowDeposit).to.be.false;

    const allowClaimRefund = await AutoStakeInstance.allowClaimRefund();
    expect(allowClaimRefund).to.be.false;
  });

  it('should reject deposits & refund claims once rHEGIC have been provided to GTS', async () => {
    await AutoStakeInstance.connect(owner).provideToGTS();

    await expect(AutoStakeInstance.connect(user2).deposit('10000000000000000000'))
      .to.be.rejectedWith('NOT_ALLOWED');

    await expect(AutoStakeInstance.connect(user2).claimRefund())
      .to.be.rejectedWith('NOT_ALLOWED');
  });

  it('should redeem HEGIC and deposit to the staking pool, receiving zHEGIC', async () => {
    await AutoStakeInstance.connect(owner).provideToGTS();

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
      await AutoStakeInstance.connect(owner).redeemAndStake();
    }
    const balance = await MockZHegicInstance.balanceOf(AutoStakeInstance.address);
    expect(balance).to.equal('77858378503056164224');
  });

  it('should let user withdraw correct amount of zHEGIC', async () => {
    await AutoStakeInstance.connect(owner).provideToGTS();

    //--------------------
    // 1st redemption
    //--------------------

    // 1 zHEGIC = 1.15 HEGIC
    // Redeem 54e18 HEGIC, get 46956521739130434782 zHEGIC
    await AutoStakeInstance.connect(owner).redeemAndStake();

    // User2 withdraws 7826086956521739130 zHEGIC, pays 156521739130434782 zHEGIC fee,
    // gets 7669565217391304348 zHEGIC;
    await AutoStakeInstance.connect(user2).withdraw();

    // User1 withdraws 13043478260869565217 zHEGIC, pays 260869565217391304 zHEGIC fee,
    // gets 12782608695652173913 zHEGIC;
    await AutoStakeInstance.connect(user1).withdraw();

    var user2WitndrawnAmount = await MockZHegicInstance.balanceOf(user2.address);
    expect(user2WitndrawnAmount).to.equal('7669565217391304348');

    var user1WitndrawnAmount = await MockZHegicInstance.balanceOf(user1.address);
    expect(user1WitndrawnAmount).to.equal('12782608695652173913');

    //--------------------
    // 2nd redemption
    //--------------------

    // 1 zHEGIC = 1.18 HEGIC
    // Redeem 36e18 HEGIC, get 30508474576271186440 zHEGIC
    // Total staked 77464996315401621222 zHEGIC
    await AutoStakeInstance.connect(owner).redeemAndStake();

    // Owner withdraws 43036109064112011790 zHEGIC, pays 860722181282240235 zHEGIC fee,
    // gets 42175386882829771555 zHEGIC
    await AutoStakeInstance.connect(owner).withdraw();

    // User1 withdraws 8474576271186440678 zHEGIC, pays 169491525423728813 zHEGIC fee,
    // gets 8305084745762711865 zHEGIC, total 21087693441414885778 zHEGIC
    await AutoStakeInstance.connect(user1).withdraw();

    // User 2 withdraws 5084745762711864407 zHEGIC, pays 101694915254237288 zHEGIC fee,
    // gets 4983050847457627119 zHEGIC, total 12652616064848931467 zHEGIC
    await AutoStakeInstance.connect(user2).withdraw();

    var ownerWitndrawnAmount = await MockZHegicInstance.balanceOf(owner.address);
    expect(ownerWitndrawnAmount).to.equal('42175386882829771555');

    user1WitndrawnAmount = await MockZHegicInstance.balanceOf(user1.address);
    expect(user1WitndrawnAmount).to.equal('21087693441414885778');

    user2WitndrawnAmount = await MockZHegicInstance.balanceOf(user2.address);
    expect(user2WitndrawnAmount).to.equal('12652616064848931467');

    // Initial deposit ratio 50:25:15 = 1:0.5:0.3
    // Final zHEGIC ratio is also 1:0.5:0.3. Fair distribution!

    //--------------------
    // Finally
    //--------------------

    const recipientBalance = await MockZHegicInstance.balanceOf(recipient.address);
    expect(recipientBalance).to.equal('1549299926308032422');

    // There will be a small amount of dust left over due to precision of integers,
    // but this number should be so small that it's negligible
    const totalWithdrawable = await AutoStakeInstance.totalWithdrawable();
    expect(totalWithdrawable).to.be.below('10');
  });
});
