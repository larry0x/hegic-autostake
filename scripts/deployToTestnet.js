const { ethers } = require('hardhat');

const deploy = async () => {
  const [ deployer, recipient ] = await ethers.getSigners();
  console.log('Using account', deployer.address);

  const FakeHegicToken = await ethers.getContractFactory('FakeHegicToken');
  const FakeHegicTokenInstance = await FakeHegicToken.deploy();
  console.log('FakeHegicToken deployed to', FakeHegicTokenInstance.address);

  const FakeRHegicToken = await ethers.getContractFactory('FakeRHegicToken');
  const FakeRHegicTokenInstance = await FakeRHegicToken.deploy();
  console.log('FakeRHegicToken deployed to', FakeRHegicTokenInstance.address);

  const FakeHegicStakingPool = await ethers.getContractFactory('FakeHegicStakingPool');
  const FakeHegicStakingPoolInstance = await FakeHegicStakingPool.deploy(
    FakeHegicTokenInstance.address
  );
  console.log('FakeHegicStakingPool deployed to', FakeHegicStakingPoolInstance.address);

  const FakeZHegicToken = await ethers.getContractFactory('FakeZHegicToken');
  const FakeZHegicTokenInstance = await FakeZHegicToken.deploy();
  console.log('FakeZHegicToken deployed to', FakeZHegicTokenInstance.address);

  const FakeHegicPoolV2 = await ethers.getContractFactory('FakeHegicPoolV2');
  const FakeHegicPoolV2Instance = await FakeHegicPoolV2.deploy(
    FakeHegicTokenInstance.address,
    FakeZHegicTokenInstance.address,
    1
  );
  console.log('FakeHegicPoolV2 deployed to', FakeHegicPoolV2Instance.address);

  const IOUTokenRedemption = await ethers.getContractFactory('IOUTokenRedemption');
  const IOUTokenRedemptionInstance = await IOUTokenRedemption.deploy(
    FakeRHegicTokenInstance.address,
    FakeHegicTokenInstance.address,
    200  // ~50 min for 15 sec block time
  );
  console.log('IOUTokenRedemption deployed to', IOUTokenRedemptionInstance.address);

  const AutoStakeToSHegic = await ethers.getContractFactory('AutoStakeToSHegic');
  const AutoStakeToSHegicInstance = await AutoStakeToSHegic.deploy(
    FakeHegicTokenInstance.address,
    FakeRHegicTokenInstance.address,
    FakeHegicStakingPoolInstance.address,
    IOUTokenRedemptionInstance.address,
  );
  console.log('AutoStakeToSHegic deployed to', AutoStakeToSHegicInstance.address);

  const AutoStakeToZHegic = await ethers.getContractFactory('AutoStakeToZHegic');
  const AutoStakeToZHegicInstance = await AutoStakeToZHegic.deploy(
    FakeHegicTokenInstance.address,
    FakeRHegicTokenInstance.address,
    FakeZHegicTokenInstance.address,
    FakeHegicPoolV2Instance.address,
    IOUTokenRedemptionInstance.address,
  );
  console.log('AutoStakeToZHegic deployed to', AutoStakeToZHegicInstance.address);

  // Set fee rate and recipient
  await AutoStakeToSHegicInstance.connect(deployer)
    .setFeeRate(200);  // 2%

  await AutoStakeToSHegicInstance.connect(deployer)
    .setFeeRecipient(recipient.address);

  await AutoStakeToZHegicInstance.connect(deployer)
    .setFeeRate(200);

  await AutoStakeToZHegicInstance.connect(deployer)
    .setFeeRecipient(recipient.address);

  // Set pool address for Fake zHEGIC token
  await FakeZHegicTokenInstance.connect(deployer)
    .setPool(FakeHegicPoolV2Instance.address);

  // Fund redemption contract with Fake HEGIC token
  await FakeHegicTokenInstance.connect(deployer)
    .transfer(IOUTokenRedemptionInstance.address, '100000000000000000000');
};

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
