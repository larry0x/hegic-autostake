const { ethers } = require('hardhat');

const addresses = {
  HEGIC:    '0x584bC13c7D411c00c01A62e8019472dE68768430',
  rHEGIC:   '0x47C0aD2aE6c0Ed4bcf7bc5b380D7205E89436e84',
  zHEGIC:   '0x837010619aeb2AE24141605aFC8f66577f6fb2e7',
  zLotPool: '0x6eC088B454d2dB7a2d8879A25d9ce015039E30FB',
  GTS:      '0x1F533aCf0C12D12997c49F4B64192030B6647c46'
};

const deploy = async () => {
  const [ deployer, recipient ] = await ethers.getSigners();
  console.log(`Using account ${deployer.address} as deployer`);
  console.log(`Using account ${recipient.address} as recipient`);

  const AutoStake = await ethers.getContractFactory('AutoStakeForZHegic');
  const AutoStakeInstance = await AutoStake.deploy(
    addresses.HEGIC,
    addresses.rHEGIC,
    addresses.zHEGIC,
    addresses.zLotPool,
    addresses.GTS,
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
