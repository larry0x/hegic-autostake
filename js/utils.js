//------------------------------------------------------------------------------
// Fetching prices from CoinGecko
//------------------------------------------------------------------------------

const getPrices = async () => {
  var response = await $.get('https://api.coingecko.com/api/v3/simple/price?ids=hegic%2Crhegic%2Czhegic&vs_currencies=usd');
  return {
    HEGIC:  response.hegic.usd,
    rHEGIC: response.rhegic.usd,
    zHEGIC: response.zhegic.usd
  };
};

//------------------------------------------------------------------------------
// Number formatting
//------------------------------------------------------------------------------

const formatNumber = (number, decPlaces = 0) => {
  if (typeof number == 'string') {
      number = number.replace(/,/gi, '');
      number = parseFloat(number);
  }

  decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces;
  var sign = number < 0 ? '-' : '';
  var i = String(parseInt(number = Math.abs(Number(number) || 0).toFixed(decPlaces)));
  var j = (j = i.length) > 3 ? j % 3 : 0;

  var formattedNumber = sign +
      (j ? i.substr(0, j) + ',' : '') +
      i.substr(j).replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
      (decPlaces ? '.' + Math.abs(number - i).toFixed(decPlaces).slice(2) : '');

  console.log('Number formatted:', number, '<>', formattedNumber);
  return formattedNumber;
};

const formatMoney = (amount) => {
  if (amount < 1) {
    return formatNumber(amount, 4);
  } else if (amount < 1000) {
    return formatNumber(amount, 2);
  } else {
    return formatNumber(amount, 0);
  }
}

//------------------------------------------------------------------------------
// Toasts
//------------------------------------------------------------------------------

const _newToast = (msg, hash, color = 'primary') => {
  $('#toastContainer').prepend(`
    <div class="toast" role="alert" data-bs-autohide="false" aria-live="assertive" aria-atomic="true">
      <div class="toast-header bg-${color}">
        <strong class="me-auto text-dark">${msg}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        <a href="https://etherscan.io/tx/${hash}" target="_blank" rel="noopener noreferrer">
          ${hash}
          <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-link-45deg" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.715 6.542L3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.001 1.001 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/>
            <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 0 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 0 0-4.243-4.243L6.586 4.672z"/>
          </svg>
        </a>
      </div>
    </div>
  `)
  .children().first().toast('show');
};

const newTxSubmittedToast = (hash) => {
  return _newToast('Transaction submitted!', hash, 'warning');
};

const newTxConfirmedToast = (hash) => {
  return _newToast('Transaction confirmed!', hash, 'info');
};

//------------------------------------------------------------------------------
// Spinner
//------------------------------------------------------------------------------

const showSpinner = () => {
  $('#spinnerContainer').fadeIn();
};

const hideSpinner = () => {
  $('#spinnerContainer').fadeOut();
};

//------------------------------------------------------------------------------
// Togglers
//------------------------------------------------------------------------------

const _uncheckAllTogglers = () => {
  $('#depositToggler').prop('checked', false);
  $('#withdrawToggler').prop('checked', false);
  $('#readMeToggler').removeClass('btn-success').addClass('btn-outline-success');
  $('#developerToggler').removeClass('btn-danger').addClass('btn-outline-danger');
};

const checkToggler = (id) => {
  _uncheckAllTogglers();
  if (id == 'deposit') {
    $('#depositToggler').prop('checked', true);
  } else if (id == 'withdraw') {
    $('#withdrawToggler').prop('checked', true);
  } else if (id == 'readMe') {
    $('#readMeToggler').addClass('btn-success').removeClass('btn-outline-success');
  } else if (id == 'developer') {
    $('#developerToggler').addClass('btn-danger').removeClass('btn-outline-danger');
  }
};

//------------------------------------------------------------------------------
// Tabs
//------------------------------------------------------------------------------

const _hideAllTabs = () => {
  $('#depositTab').hide();
  $('#withdrawTab').hide();
  $('#readMeTab').hide();
  $('#developerTab').hide();
};

const showTab = (id) => {
  _hideAllTabs();
  $(`#${id}Tab`).show();
};
