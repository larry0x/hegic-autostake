//------------------------------------------------------------------------------
// Initialize contract s
//------------------------------------------------------------------------------

const initContracts = async (web3) => {
  rHEGIC = new web3.eth.Contract(
    await $.getJSON('interfaces/HEGICTokenIOU.abi.json'),
    '0x47C0aD2aE6c0Ed4bcf7bc5b380D7205E89436e84'
  );
  AutoStake = new web3.eth.Contract(
    await $.getJSON('interfaces/AutoStake.abi.json'),
    '0xfe7621FF771dfeCF28A2037F6d7eB3605106ED39'
  );
  zHegic = new web3.eth.Contract(
    await $.getJSON('interfaces/zHegic.abi.json'),
    '0x837010619aeb2AE24141605aFC8f66577f6fb2e7'
  );
  zLotPool = new web3.eth.Contract(
    await $.getJSON('interfaces/zLotPoolV3.abi.json'),
    '0x6eC088B454d2dB7a2d8879A25d9ce015039E30FB'
  );
};

//------------------------------------------------------------------------------
// Read data from contracts
//------------------------------------------------------------------------------

const readFormsData = async (account) => {
  balance = await rHEGIC.methods.balanceOf(account).call();
  var balanceReadable = parseFloat(fromWei(balance));

  allowance = await rHEGIC.methods.allowance(account, AutoStake._address).call();
  var allowanceReadable = parseFloat(fromWei(allowance));

  var withdrawable = await AutoStake.methods.getUserWithdrawableAmount(account).call();
  var withdrawableReadable = parseFloat(fromWei(withdrawable));

  return {
    balance, balanceReadable,
    allowance, allowanceReadable,
    withdrawable, withdrawableReadable
  };
};

const readDepositTabData = async (prices) => {
  var allowDeposit = await AutoStake.methods.allowDeposit().call();
  var totalDepositors = await AutoStake.methods.totalDepositors().call();

  var totalDeposited = fromWei(await AutoStake.methods.totalDeposited().call());
  var totalDepositedUsd = totalDeposited * prices.rHEGIC;

  var totalRedeemed = fromWei(await AutoStake.methods.totalRedeemed().call());
  var totalRedeemedUsd = totalRedeemed * prices.HEGIC;

  var totalStaked = fromWei(await AutoStake.methods.totalStaked().call());
  var zLotTotalUnderlying = fromWei(await zLotPool.methods.totalUnderlying().call());
  var zHegicTotalSupply = fromWei(await zHegic.methods.totalSupply().call());
  var totalStakedEquivalent = totalStaked * zLotTotalUnderlying / zHegicTotalSupply;

  var totalWithdrawable = fromWei(await AutoStake.methods.totalWithdrawable().call());
  var totalWithdrawableUsd = totalWithdrawable * prices.zHEGIC;

  var earnings = totalStakedEquivalent - totalRedeemed;
  var earningsUsd = earnings * prices.HEGIC;

  var redemptionProgress = totalDeposited == 0 ? 0 : 100 * totalRedeemed / totalDeposited;

  return {
    allowDeposit, totalDepositors,
    totalDeposited, totalDepositedUsd,
    totalRedeemed, totalRedeemedUsd,
    totalStaked, totalStakedEquivalent,
    totalWithdrawable, totalWithdrawableUsd,
    earnings, earningsUsd,
    redemptionProgress
  };
};

const readWithdrawTabData = async (account, prices) => {
  var amountDeposited = fromWei(await AutoStake.methods.amountDeposited(account).call());
  var amountDepositedUsd = amountDeposited * prices.rHEGIC;

  var amountWithdrawn = fromWei(await AutoStake.methods.amountWithdrawn(account).call());
  var amountWithdrawnUsd = amountWithdrawn * prices.zHEGIC;

  var amountWithdrawable = fromWei(await AutoStake.methods.getUserWithdrawableAmount(account).call());
  var amountWithdrawableUsd = amountWithdrawable * prices.zHEGIC;

  return {
    amountDeposited, amountDepositedUsd,
    amountWithdrawn, amountWithdrawnUsd,
    amountWithdrawable, amountWithdrawableUsd
  };
};

const readDeveloperTabData = async () => {
  var redeemableAmount = fromWei(await AutoStake.methods.getRedeemableAmount().call());

  var lastRedeemed = await AutoStake.methods.lastRedemptionTimestamp().call();
  var lastRedeemedHoursAgo = lastRedeemed == 0 ? 'n/a' : ((Date.now() / 1000 - lastRedeemed) / 60 / 60).toFixed(1);

  return { redeemableAmount, lastRedeemedHoursAgo }
};
