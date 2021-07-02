const updateWalletData = async () => {
  const _chainIdToName = {
    1: 'Mainnet',
    3: 'Ropsten',
    4: 'Rinkeby',
    5: 'Görli',
    42: 'Kovan'
  }
  const web3 = new Web3(provider);

  chainId = await web3.eth.getChainId();
  account = (await web3.eth.getAccounts())[0];

  console.log('ChainId:', chainId);
  console.log('Account:', account);

  $('#networkName').html(_chainIdToName[chainId]);
  $('#walletAddress').html(account);

  // Overwrite default web3 instance using MetaMask web3
  initContracts(web3).then(() => {
    updateFormsData();
    updateWithdrawTabData();
    $('#withdrawBtn').prop('disabled', false);
    $('#callFunctionBtn').prop('disabled', false);
  });
};
