const FakeHegicToken = artifacts.require('FakeHegicToken');
const FakeRHegicToken = artifacts.require('FakeRHegicToken');
const IOUTokenRedemption = artifacts.require('IOUTokenRedemption');
const FakeHegicStakingPool = artifacts.require('FakeHegicStakingPool');

contract('FakeHegicToken', (accounts) => {
  const ownerAccount = accounts[0];
  const userAccount = accounts[1];

  it('should mint the owner 100 token when deployed, and have 100 total supply', async () => {
    const FakeHegicTokenInstance = await FakeHegicToken.deployed();

    const ownerBalance = await FakeHegicTokenInstance.balanceOf(ownerAccount);
    assert(ownerBalance == 100, 'Owner has a balance that is not 100');

    const totalSupply = await FakeHegicTokenInstance.totalSupply();
    assert(totalSupply == 100, 'Total supply is not 100');
  });

  it('should successfully transfer 40 tokens from owner to user', async () => {
    const FakeHegicTokenInstance = await FakeHegicToken.deployed();
    await FakeHegicTokenInstance.transfer(userAccount, 40);

    const ownerBalance = await FakeHegicTokenInstance.balanceOf(ownerAccount);
    assert(ownerBalance == 60, 'Owner has a balance that is not 50');

    const userBalance = await FakeHegicTokenInstance.balanceOf(userAccount);
    assert(userBalance == 40, 'User has a balance that is not 50');
  })
});

contract('FakeRHegicToken', (accounts) => {
  it('should deploy successfully', async () => {
    const FakeRHegicTokenInstance = await FakeRHegicToken.deployed();
    assert(FakeRHegicTokenInstance, 'Returned value from deployed() call is null or undefined');
  });
});

contract('IOUTokenRedemption', (accounts) => {

});

contract('FakeHegicStakingPool', (accounts) => {
  it('should accept 50 HEGIC and issue 50 sHEGIC back', async () => {
    const FakeHegicTokenInstance = await FakeHegicToken.deployed();
    const FakeHegicStakingPoolInstance = await FakeHegicStakingPool.deployed();
  })
});
