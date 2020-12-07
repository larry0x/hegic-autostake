const { ethers } = require('hardhat');

const deploy = async () => {
  const [ deployer ] = await ethers.getSigners();
  console.log('Using account', deployer.address);

  //pass
};

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
