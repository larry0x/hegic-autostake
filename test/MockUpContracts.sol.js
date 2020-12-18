const { ethers } = require('hardhat');
const BN = ethers.BigNumber.from;

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));

//------------------------------------------------------------------------------
// Test FakeWBTC
//------------------------------------------------------------------------------

describe('FakeWBTC', () => {
  let owner;
  let user;
  let FakeWBTCInstance;

  beforeEach(async () => {
    [ owner, user ] = await ethers.getSigners();

    const FakeWBTC = await ethers.getContractFactory('FakeWBTC');
    FakeWBTCInstance = await FakeWBTC.deploy();
  });

  it('should mint the user 100 WBTC', async () => {
    FakeWBTCInstance.connect(owner).mint(user.address, '10000000000');

    const balance = await FakeWBTCInstance.balanceOf(user.address);
    expect(balance).to.equal('10000000000');
  });
});

//------------------------------------------------------------------------------
// Test FakeHegic
//------------------------------------------------------------------------------

describe('FakeHegic', () => {
  let owner;
  let user;
  let FakeHegicInstance;

  beforeEach(async () => {
    [ owner, user ] = await ethers.getSigners();

    const FakeHegic = await ethers.getContractFactory('FakeHegic');
    FakeHegicInstance = await FakeHegic.deploy();
  })

  it('should mint the owner 100 tokens when deployed, and have 100 total supply', async () => {
    const ownerBalance = await FakeHegicInstance.balanceOf(owner.address);
    expect(ownerBalance).to.equal('100000000000000000000');

    const totalSupply = await FakeHegicInstance.totalSupply();
    expect(totalSupply).to.equal('100000000000000000000');
  });

  it('should transfer 50 tokens from owner to user', async () => {
    await FakeHegicInstance.connect(owner)
      .transfer(user.address, '50000000000000000000');

    const ownerBalance = await FakeHegicInstance.balanceOf(owner.address);
    expect(ownerBalance).to.equal('50000000000000000000');

    const userBalance = await FakeHegicInstance.balanceOf(user.address);
    expect(userBalance).to.equal('50000000000000000000');
  });
});

//------------------------------------------------------------------------------
// Test FakeRHegic
//------------------------------------------------------------------------------

describe('FakeRHegic', () => {
  let FakeRHegicInstance;

  beforeEach(async () => {
    const FakeRHegic = await ethers.getContractFactory('FakeRHegic');
    FakeRHegicInstance = await FakeRHegic.deploy();
  });

  it('should return the correct token name', async () => {
    const tokenName = await FakeRHegicInstance.getTokenName();
    expect(tokenName).to.equal('Fake rHEGIC');
  });
});

//------------------------------------------------------------------------------
// Test IOUTokenRedemption
//------------------------------------------------------------------------------

describe('IOUTokenRedemption', () => {
  let owner;
  let FakeHegicInstance;
  let FakeRHegicInstance;
  let IOUTokenRedemptionInstance;

  beforeEach(async () => {
    [ owner ] = await ethers.getSigners();

    const FakeHegic = await ethers.getContractFactory('FakeHegic');
    FakeHegicInstance = await FakeHegic.deploy();

    const FakeRHegic = await ethers.getContractFactory('FakeRHegic');
    FakeRHegicInstance = await FakeRHegic.deploy();

    const IOUTokenRedemption = await ethers.getContractFactory('IOUTokenRedemption');
    IOUTokenRedemptionInstance = await IOUTokenRedemption
      .deploy(FakeRHegicInstance.address, FakeHegicInstance.address, 5);

    await FakeHegicInstance.connect(owner)
      .transfer(IOUTokenRedemptionInstance.address, '100000000000000000000');

    await FakeRHegicInstance.connect(owner)
      .approve(IOUTokenRedemptionInstance.address, '100000000000000000000');

    await IOUTokenRedemptionInstance.connect(owner).deposit('50000000000000000000');
  });

  it('should take rHEGIC deposit and record relevant data in state variables', async () => {
    const balance = await FakeRHegicInstance.balanceOf(IOUTokenRedemptionInstance.address);
    expect(balance).to.equal('50000000000000000000');

    const depositData = await IOUTokenRedemptionInstance.deposits(owner.address);
    expect(depositData.amountDeposited).to.equal('50000000000000000000');
  });

  it('should reject if user attempts to make more than one deposit', async () => {
    await expect(IOUTokenRedemptionInstance.connect(owner).deposit('50000000000000000000'))
      .to.be.rejectedWith('This account has already deposited');
  });

  it('should transfer correct amount of output token user redeems', async () => {
    await IOUTokenRedemptionInstance.connect(owner).redeem();
    const amountRedeemed = await FakeHegicInstance.balanceOf(owner.address);

    const blocksToRelease = await IOUTokenRedemptionInstance.blocksToRelease();
    const currentBlock = await ethers.provider.getBlockNumber();
    const userDeposit = await IOUTokenRedemptionInstance.deposits(owner.address);

    const correctRedeemableAmount = BN(userDeposit.amountDeposited)
      .mul(BN(currentBlock).sub(userDeposit.blockDeposited)).div(blocksToRelease);

    expect(amountRedeemed).to.equal(correctRedeemableAmount);
  });
});

//------------------------------------------------------------------------------
// Test FakeSHegic
//------------------------------------------------------------------------------

describe('FakeSHegic', () => {
  let owner;
  let FakeWBTCInstance;
  let FakeHegicInstance;
  let FakeSHegicInstance;

  beforeEach(async () => {
    [ owner ] = await ethers.getSigners();

    const FakeWBTC = await ethers.getContractFactory('FakeWBTC');
    FakeWBTCInstance = await FakeWBTC.deploy();

    const FakeHegic = await ethers.getContractFactory('FakeHegic');
    FakeHegicInstance = await FakeHegic.deploy();

    const FakeSHegic = await ethers.getContractFactory('FakeSHegic');
    FakeSHegicInstance = await FakeSHegic
      .deploy(FakeHegicInstance.address, FakeWBTCInstance.address);

    // Fund sHEGIC contract some ether for use in `claimAllProfit` function
    await owner.sendTransaction({
      to: FakeSHegicInstance.address,
      value: ethers.utils.parseEther('1')
    });
  });

  it('should take 50 HEGIC deposit and issue 50 sHEGIC back', async () => {
    await FakeHegicInstance.connect(owner)
      .approve(FakeSHegicInstance.address, '50000000000000000000');

    await FakeSHegicInstance.connect(owner)
      .deposit('50000000000000000000');

    const poolBalance = await FakeHegicInstance.balanceOf(FakeSHegicInstance.address);
    expect(poolBalance).to.equal('50000000000000000000');

    const userBalance = await FakeSHegicInstance.balanceOf(owner.address);
    expect(userBalance).to.equal('50000000000000000000');
  });

  it('should transfer 0.1 ETH and 0.01 WBTC when claimAllProfit is called', async () => {
    const ethBalanceBefore = await owner.getBalance();

    const tx = await FakeSHegicInstance.connect(owner).claimAllProfit();
    const receipt = await tx.wait();
    const gas = tx.gasPrice.mul(receipt.gasUsed);

    const ethBalanceAfter = await owner.getBalance();
    expect(ethBalanceAfter.sub(ethBalanceBefore).add(gas)).to.equal('100000000000000000');

    const wbtcBalance = await FakeWBTCInstance.balanceOf(owner.address);
    expect(wbtcBalance).to.equal('1000000');
  });
});

//------------------------------------------------------------------------------
// Test Fake zLOT contracts
//------------------------------------------------------------------------------

describe('FakeZHegic & FakeZLotPool', () => {
  let owner;
  let FakeHegicInstance;
  let FakeZHegicInstance;
  let FakeZLotPoolInstance;

  beforeEach(async () => {
    [ owner ] = await ethers.getSigners();

    const FakeHegic = await ethers.getContractFactory('FakeHegic');
    FakeHegicInstance = await FakeHegic.deploy();

    const FakeZHegic = await ethers.getContractFactory('FakeZHegic');
    FakeZHegicInstance = await FakeZHegic.deploy();

    const FakeZLotPool = await ethers.getContractFactory('FakeZLotPool');
    FakeZLotPoolInstance = await FakeZLotPool
      .deploy(FakeHegicInstance.address, FakeZHegicInstance.address, 5);

    await FakeZHegicInstance.connect(owner).setPool(FakeZLotPoolInstance.address);

    await FakeHegicInstance.connect(owner)
      .approve(FakeZLotPoolInstance.address, '100000000000000000000');
  });

  it('should take HEGIC deposit and mint correct amount of zHEGIC token', async () => {
    for (i = 0; i < 4; i++) {
      await FakeZLotPoolInstance.connect(owner).deposit('25000000000000000000');
    }

    const balance = await FakeZHegicInstance.balanceOf(owner.address);
    expect(balance).to.equal('81803232998885172797');
  });
})
