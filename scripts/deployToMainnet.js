const { ethers } = require('hardhat');

const addresses = {
  WBTC:     '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  HEGIC:    '0x584bC13c7D411c00c01A62e8019472dE68768430',
  rHEGIC:   '0x47C0aD2aE6c0Ed4bcf7bc5b380D7205E89436e84',
  sHEGIC:   '0xf4128B00AFdA933428056d0F0D1d7652aF7e2B35',
  zHEGIC:   '0x837010619aeb2AE24141605aFC8f66577f6fb2e7',
  zLotPool: '0x9E4E091fC8921FE3575eab1c9a6446114f3b5Ef2',
  GST:      ''  // TBD
}

const deploy = async () => {
  const [ deployer, recipient ] = await ethers.getSigners();
  console.log(`Using account ${deployer.address} as deployer`);
  console.log(`Using account ${recipient.address} as recipient`);

  const AutoStakeForSHegic = await ethers.getContractFactory('AutoStakeForSHegic');
  const AutoStakeForSHegicInstance = await AutoStakeForSHegic.deploy(
    addresses.WBTC,
    addresses.HEGIC,
    addresses.rHEGIC,
    addresses.sHEGIC,
    addresses.GST,
    200,
    recipient.address
  );
  console.log('AutoStakeForSHegic deployed to', AutoStakeForSHegicInstance.address);

  const AutoStakeForZHegic = await ethers.getContractFactory('AutoStakeForZHegic');
  const AutoStakeForZHegicInstance = await AutoStakeForZHegic.deploy(
    addresses.HEGIC,
    addresses.rHEGIC,
    addresses.zHEGIC,
    addresses.zLotPool,
    addresses.GST,
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
