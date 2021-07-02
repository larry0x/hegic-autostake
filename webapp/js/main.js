//------------------------------------------------------------------------------
// Togglers
//------------------------------------------------------------------------------

$('#depositToggler').click(function () {
  checkToggler('deposit');
  showTab('deposit');
});

$('#withdrawToggler').click(function () {
  checkToggler('withdraw');
  showTab('withdraw');
});

$('#readMeToggler').click(function () {
  checkToggler('readMe');
  showTab('readMe');
});

$('#developerToggler').click(function () {
  checkToggler('developer');
  showTab('developer');
});

//------------------------------------------------------------------------------
// Display data in data panels
//------------------------------------------------------------------------------

const updateFormsData = () => {
  if (account) {
    readFormsData(account).then((data) => {
      $('#userWalletAmount').html(
        `You have <b>${formatNumber(data.balanceReadable, 4)} rHEGIC</b><br>` +
        `You have approved the contract to spend <b>${formatNumber(data.allowanceReadable, 4)} rHEGIC</b>`
      );
      $('#userReceiveAmount').html(
        `You will receive <b>${formatNumber(1.00 * data.withdrawableReadable, 4)} zHEGIC</b>; ` +
        `the developer will receive <b>${formatNumber(0.00 * data.withdrawableReadable, 4)} zHEGIC</b> fee`
      );
    });
  }
};

const updateDepositTabData = () => {
  getPrices().then((prices) => {
    readDepositTabData(prices).then(data => {
      if (data.allowDeposit) {
        $('#depositAmountInput').prop('disabled', false).attr('placeholder', 'Amount to deposit');
        $('#depositMaxBtn').prop('disabled', false);
        $('#allowDeposit')
          .removeClass('text-danger').addClass('text-success').html('Yes')
          .parent().parent().removeClass('border-dark').removeClass('border-danger').addClass('border-success');
      } else {
        $('#allowDeposit')
          .removeClass('text-success').addClass('text-danger').html('No')
          .parent().parent().removeClass('border-dark').removeClass('border-success').addClass('border-danger');
      }

      $('#totalDepositors').html(formatNumber(data.totalDepositors));
      $('#totalDeposited').html(formatNumber(data.totalDeposited));
      $('#totalDepositedUsd').html(formatMoney(data.totalDepositedUsd));
      $('#totalRedeemed').html(formatNumber(data.totalRedeemed));
      $('#totalRedeemedUsd').html(formatMoney(data.totalRedeemedUsd));
      $('#totalStaked').html(formatNumber(data.totalStaked));
      $('#totalStakedEquivalent').html(formatNumber(data.totalStakedEquivalent));
      $('#totalWithdrawable').html(formatNumber(data.totalWithdrawable));
      $('#totalWithdrawableUsd').html(formatMoney(data.totalWithdrawableUsd));
      $('#earnings').html(formatNumber(data.earnings));
      $('#earningsUsd').html(formatMoney(data.earningsUsd));
      $('#redemptionProgress').html(data.redemptionProgress.toFixed(1));
    });
  });
};

const updateWithdrawTabData = () => {
  if (account) {
    getPrices().then((prices) => {
      readWithdrawTabData(account, prices).then(data => {
        $('#userDeposited').html(formatNumber(data.amountDeposited));
        $('#userDepositedUsd').html(formatMoney(data.amountDepositedUsd));
        $('#userWithdrawn').html(formatNumber(data.amountWithdrawn));
        $('#userWithdrawnUsd').html(formatMoney(data.amountWithdrawnUsd));
        $('#userWithdrawable').html(formatNumber(data.amountWithdrawable));
        $('#userWithdrawableUsd').html(formatMoney(data.amountWithdrawableUsd));
      });
    });
  }
};

const updateDeveloperTabData = () => {
  readDeveloperTabData().then(data => {
    $('#redeemableAmount').html(formatNumber(data.redeemableAmount));
    $('#lastRedeemed').html(data.lastRedeemedHoursAgo);
  });
};

//------------------------------------------------------------------------------
// Navbar buttons
//------------------------------------------------------------------------------

$('#connectWalletBtn').click(async () => {
  if (!window.ethereum) {
    return alert('Cannot detect injected Web3. Are you sure MetaMask is installed?');
  }

  try {
    provider = await web3Modal.connect();
    console.log('connectWalletBtn/WALLET_CONNECTED');
  } catch (err) {
    console.log('connectWalletBtn/WALLET_CONNECTION_FAILED');
  }

  updateWalletData();
  $('#connectWalletBtn').hide();
  $('#networkName').show();
  $('#walletAddress').show();

  provider.on('accountsChanged', () => {
    console.log('provider/ACCOUNT_CHANGE_DETECTED');
    updateWalletData();
  });

  provider.on('chainChanged', () => {
    console.log('provider/CHAIN_CHANGE_DETECTED');
    updateWalletData();
  });
});

$('#refreshBtn').click(() => {
  showSpinner();
  Promise.all([
    updateFormsData(),
    updateDepositTabData(),
    updateWithdrawTabData(),
    updateDeveloperTabData()
  ])
  .then(hideSpinner);
});

//------------------------------------------------------------------------------
// Inputs & buttons - behaviors
//------------------------------------------------------------------------------

$('#depositAmountInput').keyup(function () {
  var amountToDeposit = $(this).val();
  var amountToApprove = toBN(toWei(amountToDeposit)).sub(toBN(allowance));

  if (amountToApprove.gt(toBN('0'))) {
    $('#approveBtn').prop('disabled', false);
    $('#depositBtn').prop('disabled', true);
  } else {
    $('#approveBtn').prop('disabled', true);
    $('#depositBtn').prop('disabled', false);
  }
});

//------------------------------------------------------------------------------
// Inputs & buttons - send transactions
//------------------------------------------------------------------------------

$('#depositMaxBtn').click(() => {
  $('#depositAmountInput').val(fromWei(balance)).trigger('keyup');
});

$('#approveBtn').click(() => {
  var amountToDeposit = $('#depositAmountInput').val();
  var amountToApprove = toBN(toWei(amountToDeposit)).sub(toBN(allowance));

  rHEGIC.methods
    .approve(AutoStake._address, amountToApprove)
    .send({ from: account })
    .on('transactionHash', (hash) => {
      newTxSubmittedToast(hash);
    })
    .on('confirmation', (confirmationNumber, receipt) => {
      if (confirmationNumber == 0) {
        newTxConfirmedToast(receipt.transactionHash);

        $('#approveBtn').prop('disabled', true);
        $('#depositBtn').prop('disabled', false);

        updateFormsData();
      }
    });
});

$('#depositBtn').click(() => {
  var amount = toWei($('#depositAmountInput').val());

  AutoStake.methods
    .deposit(amount)
    .send({ from: account })
    .on('transactionHash', (hash) => {
      newTxSubmittedToast(hash);
    })
    .on('confirmation', (confirmationNumber, receipt) => {
      if (confirmationNumber == 0) {
        newTxConfirmedToast(receipt.transactionHash);
        $('#refreshBtn').trigger('click');
      }
    });
});

$('#withdrawBtn').click(() => {
  AutoStake.methods
    .withdraw()
    .send({ from: account })
    .on('transactionHash', (hash) => {
      newTxSubmittedToast(hash);
    })
    .on('confirmation', (confirmationNumber, receipt) => {
      if (confirmationNumber == 0) {
        newTxConfirmedToast(receipt.transactionHash);
        $('#refreshBtn').trigger('click');
      }
    });
});

$('#callFunctionBtn').click(() => {
  AutoStake.methods
    .redeemAndStake()
    .send({ from: account })
    .on('transactionHash', (hash) => {
      newTxSubmittedToast(hash);
    })
    .on('confirmation', (confirmationNumber, receipt) => {
      if (confirmationNumber == 0) {
        newTxConfirmedToast(receipt.transactionHash);
        $('#refreshBtn').trigger('click');
      }
    });
});

//------------------------------------------------------------------------------
// On page load
//------------------------------------------------------------------------------

$(() => {
  initContracts(defaultWeb3).then(() => {
    $('#refreshBtn').trigger('click');
  });
});
