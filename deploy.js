const { ethers } = require('hardhat');

const deploy = async () => {
  const [ deployer ] = await ethers.getSigners();
  console.log('Using account', deployer.address);

  const FakeHegicToken = await ethers.getContractFactory('FakeHegicToken');
  const FakeHegicTokenInstance = await FakeHegicToken.deploy();
  console.log('FakeHegicToken', FakeHegicTokenInstance.address);

  const FakeRHegicToken = await ethers.getContractFactory('FakeRHegicToken');
  const FakeRHegicTokenInstance = await FakeRHegicToken.deploy();
  console.log('FakeRHegicToken', FakeRHegicTokenInstance.address);

  const IOUTokenRedemption = await ethers.getContractFactory('IOUTokenRedemption');
  const IOUTokenRedemptionInstance = await IOUTokenRedemption
    .deploy(
      FakeRHegicTokenInstance.address,
      FakeHegicTokenInstance.address,
      120
    );
  console.log('IOUTokenRedemption', IOUTokenRedemptionInstance.address);

  const FakeHegicStakingPool = await ethers.getContractFactory('FakeHegicStakingPool');
  const FakeHegicStakingPoolInstance = await FakeHegicStakingPool
    .deploy(FakeHegicTokenInstance.address);
  console.log('FakeHegicStakingPool', FakeHegicStakingPoolInstance.address);

  const AutoStakeToSHegic = await ethers.getContractFactory('AutoStakeToSHegic');
  const AutoStakeToSHegicInstance = await AutoStakeToSHegic
    .deploy(
      FakeHegicTokenInstance.address,
      FakeRHegicTokenInstance.address,
      IOUTokenRedemptionInstance.address,
      FakeHegicStakingPoolInstance.address
    );
  console.log('AutoStakeToSHegic', AutoStakeToSHegicInstance.address);
};

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
