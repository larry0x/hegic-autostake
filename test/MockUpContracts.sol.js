const { expect } = require('chai');
const { ethers } = require('hardhat');
const BN = ethers.BigNumber.from;

describe('FakeHegicToken', () => {
  let owner
  let user;
  let FakeHegicTokenInstance;

  beforeEach(async () => {
    [ owner, user ] = await ethers.getSigners();

    const FakeHegicToken = await ethers.getContractFactory('FakeHegicToken');
    FakeHegicTokenInstance = await FakeHegicToken.deploy();
  })

  it('should mint the owner 100 tokens when deployed, and have 100 total supply', async () => {
    const ownerBalance = await FakeHegicTokenInstance.balanceOf(owner.address);
    expect(ownerBalance).to.equal('100000000000000000000');

    const totalSupply = await FakeHegicTokenInstance.totalSupply();
    expect(totalSupply).to.equal('100000000000000000000');
  });

  it('should transfer 50 tokens from owner to user', async () => {
    await FakeHegicTokenInstance.connect(owner).transfer(user.address, '50000000000000000000');

    const ownerBalance = await FakeHegicTokenInstance.balanceOf(owner.address);
    expect(ownerBalance).to.equal('50000000000000000000');

    const userBalance = await FakeHegicTokenInstance.balanceOf(user.address);
    expect(userBalance).to.equal('50000000000000000000');
  });

  it('should return the corrent token name', async () => {
    const tokenName = await FakeHegicTokenInstance.getTokenName();
    expect(tokenName).to.equal('Fake HEGIC');
  });
});

describe('FakeRHegicToken', () => {
  it('should return the correct token name', async () => {
    const FakeRHegicToken = await ethers.getContractFactory('FakeRHegicToken');
    const FakeRHegicTokenInstance = await FakeRHegicToken.deploy();

    const tokenName = await FakeRHegicTokenInstance.getTokenName();
    expect(tokenName).to.equal('Fake rHEGIC');
  });
});

describe('IOUTokenRedemption', () => {

});

describe('FakeHegicStakingPool', () => {

});
