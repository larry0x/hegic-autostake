// Libraries
const { toBN, toWei, fromWei } = Web3.utils;
const Web3Modal = window.Web3Modal.default;

// Utility for connecting to wallet
const web3Modal = new Web3Modal({
  providerOptions: {},
  cachedProvider: false,
  disableInjectedProvider: false
});

// Default web3 instance
const INFURA_URL = '5a8f3929bd4049b19aa183fc15827b48';
const defaultProvider = new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${INFURA_URL}`);
const defaultWeb3 = new Web3(defaultProvider);

// Contract instances
let rHEGICInstance = null;
let AutoStakeInstance = null;
let zHegicInstance = null;
let zLotPoolInstance = null;

// Web3 instance using MetaMask provider
let provider = null;
let chainId = null;
let account = null;

// User data
let balance = null;
let allowance = null;
