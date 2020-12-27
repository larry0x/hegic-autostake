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

    await FakeHegicInstance.connect(owner).mint('100000000000000000000');
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
    const tokenName = await FakeRHegicInstance.name();
    expect(tokenName).to.equal('Fake rHEGIC');
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

    // Mint the owner 100 HEGIC
    await FakeHegicInstance.connect(owner).mint('100000000000000000000');

    // Deposit 50 HEGIC, get 50 sHEGIC
    await FakeHegicInstance.connect(owner)
      .approve(FakeSHegicInstance.address, '50000000000000000000');

    await FakeSHegicInstance.connect(owner)
      .deposit('50000000000000000000');

    // Fund sHEGIC contract some ether for use in `claimAllProfit` function
    await owner.sendTransaction({
      to: FakeSHegicInstance.address,
      value: ethers.utils.parseEther('1')
    });
  });

  it('should take 50 HEGIC deposit and issue 50 sHEGIC back', async () => {
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
      .deploy(FakeHegicInstance.address, FakeZHegicInstance.address, 1);  // exchange rate goes up 1% every block

    await FakeHegicInstance.connect(owner).mint('100000000000000000000');

    await FakeZHegicInstance.connect(owner).setPool(FakeZLotPoolInstance.address);

    await FakeHegicInstance.connect(owner)
      .approve(FakeZLotPoolInstance.address, '100000000000000000000');
  });

  it('should take HEGIC deposit and mint correct amount of zHEGIC token', async () => {
    for (i = 0; i < 4; i++) {
      await FakeZLotPoolInstance.connect(owner).deposit('25000000000000000000');
    }

    // 1st deposit: 25e18 * 100 / 104 = 24038461538461538461
    // 2nd deposit: 25e18 * 100 / 105 = 23809523809523809523
    // 3rd deposit: 25e18 * 100 / 106 = 23584905660377358490
    // 4th deposit: 25e18 * 100 / 107 = 23364485981308411214
    // Sum: 94797376989671117688 (94.80 zHEGIC)
    const balance = await FakeZHegicInstance.balanceOf(owner.address);
    expect(balance).to.equal('94797376989671117688');
  });
})
