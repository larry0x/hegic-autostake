const { ethers } = require('hardhat');

const deploy = async () => {
  const [ deployer, recipient ] = await ethers.getSigners();
  console.log(`Using account ${deployer.address} as deployer`);
  console.log(`Using account ${recipient.address} as recipient`);

  const MockHegic = await ethers.getContractFactory('MockHegic');
  const MockHegicInstance = await MockHegic.deploy();
  console.log('MockHegic deployed to', MockHegicInstance.address);

  const MockRHegic = await ethers.getContractFactory('MockRHegic');
  const MockRHegicInstance = await MockRHegic.deploy();
  console.log('MockRHegic deployed to', MockRHegicInstance.address);

  const MockZHegic = await ethers.getContractFactory('MockZHegic');
  const MockZHegicInstance = await MockZHegic.deploy();
  console.log('MockZHegic deployed to', MockZHegicInstance.address);

  const MockZLotPool = await ethers.getContractFactory('MockZLotPool');
  const MockZLotPoolInstance = await MockZLotPool.deploy(
    MockHegicInstance.address,
    MockZHegicInstance.address,
    1
  );
  console.log('MockZLotPool deployed to', MockZLotPoolInstance.address);

  const start = await ethers.provider.getBlockNumber();
  console.log(`Using ${start} as start block number`);

  const MockGradualTokenSwap = await ethers.getContractFactory('MockGradualTokenSwap');
  const MockGTSInstance = await MockGradualTokenSwap.deploy(
    start,
    2000,
    MockRHegicInstance.address,
    MockHegicInstance.address
  );
  console.log('MockGTS deployed to', MockGTSInstance.address);

  const AutoStake = await ethers.getContractFactory('AutoStake');
  const AutoStakeInstance = await AutoStake.deploy(
    MockHegicInstance.address,
    MockRHegicInstance.address,
    MockZHegicInstance.address,
    MockZLotPoolInstance.address,
    MockGTSInstance.address,
    200,
    recipient.address
  );
  console.log('AutoStake deployed to', AutoStakeInstance.address);
};

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
