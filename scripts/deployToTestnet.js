const { ethers } = require('hardhat');

const deploy = async () => {
  const [ deployer, recipient ] = await ethers.getSigners();
  console.log(`Using account ${deployer.address} as deployer`);
  console.log(`Using account ${recipient.address} as recipient`);

  //--------------------
  // Fake tokens
  //--------------------

  const FakeWBTC = await ethers.getContractFactory('FakeWBTC');
  const FakeWBTCInstance = await FakeWBTC.deploy();
  console.log('FakeWBTC deployed to', FakeWBTCInstance.address);

  const FakeHegic = await ethers.getContractFactory('FakeHegic');
  const FakeHegicInstance = await FakeHegic.deploy();
  console.log('FakeHegic deployed to', FakeHegicInstance.address);

  const FakeRHegic = await ethers.getContractFactory('FakeRHegic');
  const FakeRHegicInstance = await FakeRHegic.deploy();
  console.log('FakeRHegic deployed to', FakeRHegicInstance.address);

  //--------------------
  // Fake staking pools
  //--------------------

  const FakeSHegic = await ethers.getContractFactory('FakeSHegic');
  const FakeSHegicInstance = await FakeSHegic
    .deploy(FakeHegicInstance.address, FakeWBTCInstance.address);
  console.log('FakeSHegic deployed to', FakeSHegicInstance.address);

  const FakeZHegic = await ethers.getContractFactory('FakeZHegic');
  const FakeZHegicInstance = await FakeZHegic.deploy();
  console.log('FakeZHegic deployed to', FakeZHegicInstance.address);

  const FakeZLotPool = await ethers.getContractFactory('FakeZLotPool');
  const FakeZLotPoolInstance = await FakeZLotPool.deploy(
    FakeHegicInstance.address,
    FakeZHegicInstance.address,
    1
  );
  console.log('FakeZLotPool deployed to', FakeZLotPoolInstance.address);

  //--------------------
  // GTS
  //--------------------

  const GradualTokenSwap = await ethers.getContractFactory('GradualTokenSwapUpgradable');
  const GradualTokenSwapInstance = await GradualTokenSwap
    .deploy(
      await ethers.provider.getBlockNumber() + 14,
      1000,
      FakeRHegicInstance.address,
      FakeHegicInstance.address
    );
  console.log('GradualTokenSwap deployed to', GradualTokenSwapInstance.address);

  //--------------------
  // AutoStake contract
  //--------------------

  const AutoStakeForSHegic = await ethers.getContractFactory('AutoStakeForSHegic');
  const AutoStakeForSHegicInstance = await AutoStakeForSHegic.deploy(
    FakeWBTCInstance.address,
    FakeHegicInstance.address,
    FakeRHegicInstance.address,
    FakeSHegicInstance.address,
    GradualTokenSwapInstance.address,
    200,
    recipient.address
  );
  console.log('AutoStakeForSHegic deployed to', AutoStakeForSHegicInstance.address);

  const AutoStakeForZHegic = await ethers.getContractFactory('AutoStakeForZHegic');
  const AutoStakeForZHegicInstance = await AutoStakeForZHegic.deploy(
    FakeHegicInstance.address,
    FakeRHegicInstance.address,
    FakeZHegicInstance.address,
    FakeZLotPoolInstance.address,
    GradualTokenSwapInstance.address,
    200,
    recipient.address
  );
  console.log('AutoStakeForZHegic deployed to', AutoStakeForZHegicInstance.address);
};

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
