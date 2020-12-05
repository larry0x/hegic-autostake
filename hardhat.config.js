require('@nomiclabs/hardhat-etherscan');
require('@nomiclabs/hardhat-waffle');

const {
  INFURA_PROJECT_ID,
  MNEMONIC,
  ETHERSCAN_API_KEY
} = require('./secrets.json');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: { mnemonic: MNEMONIC }
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: { mnemonic: MNEMONIC }
    },
  },
  etherscan: { apiKey: ETHERSCAN_API_KEY },
  solidity: "0.7.5"
};
