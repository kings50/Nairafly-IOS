// NairaFly iOS Frontend Controller — Wired to Vercel Serverless APIs (/api/*)

const NIGERIAN_BANKS = [
  { name: 'OPay Digital Services', code: '999992' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'GTBank (Guaranty Trust)', code: '058' },
  { name: 'Access Bank', code: '044' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Fidelity Bank', code: '070' }
];

let state = {
  user: JSON.parse(localStorage.getItem('nf_user') || 'null'),
  balanceNgn: Number(localStorage.getItem('nf_balance') || '0'),
  transactions: JSON.parse(localStorage.getItem('nf_txs') || '[]'),
  savedBank: JSON.parse(localStorage.getItem('nf_bank') || 'null'),
  hideBalance: false,
  verifiedWithdrawName: '',
  verifiedProfileName: '',
  backendLive: false
};

// 1. Strict iOS-Only Enforcement & Android Install Block
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  showToast('Installation is restricted to Apple iOS devices.');
});

function isAppleIOS() {
  const ua = navigator.userAgent || '';
  const isIPhoneIPad = /iPhone|iPad|iPod/i.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIPhoneIPad || isIPadOS;
}

function initPlatformGate() {
  const lock = document.getElementById('iosLockScreen');
  if (!isAppleIOS() && sessionStorage.getItem('nf_ios_sim') !== '1') {
    lock.classList.remove('hidden');
  } else {
    lock.classList.add('hidden');
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) {
      document.getElementById('safariInstallBanner').classList.remove('hidden');
    }
  }
}

function enableSimulatorPreview() {
  sessionStorage.setItem('nf_ios_sim', '1');
  document.getElementById('iosLockScreen').classList.add('hidden');
  showToast('iOS Simulator Preview Enabled');
}

// 2. Helpers
function formatNaira(amount) {
  return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

function populateBankSelects() {
  ['withdrawBank', 'profileBank'].forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = NIGERIAN_BANKS.map((b) => `<option value="${b.code}">${b.name}</option>`).join('');
  });
}

// 3. Real NUBAN 10-Digit Account Name Verification via /api/resolve-account
async function verifyNubanAccount(accountNumber, bankCode, statusElId, onVerified) {
  const box = document.getElementById(statusElId);
  if (accountNumber.length !== 10) {
    box.className = 'hidden';
    onVerified('');
    return;
  }

  box.className = 'verified-box';
  box.textContent = 'Verifying 10-digit NUBAN with bank...';

  try {
    const res = await fetch(`/api/resolve-account?account_number=${accountNumber}&bank_code=${bankCode}`);
    const data = await res.json();

    if (data.status && data.account_name) {
      box.className = 'verified-box';
      box.innerHTML = `✓ Verified Account: <strong>${data.account_name}</strong>`;
      onVerified(data.account_name);
    } else {
      box.className = 'error-box';
      box.textContent = data.message || 'Unable to verify account name.';
      onVerified('');
    }
  } catch (err) {
    box.className = 'error-box';
    box.textContent = 'Network error verifying account. Deploy to Vercel with PAYSTACK_SECRET_KEY.';
    onVerified('');
  }
}

// 4. Real Paystack Checkout Deposit via /api/init-deposit
async function startPaystackDeposit() {
  const amount = Number(document.getElementById('depositAmount').value);
  if (!amount || amount < 100) {
    showToast('Enter at least ₦100 to deposit.');
    return;
  }

  const btn = document.getElementById('depositSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Connecting to Paystack...';

  try {
    const res = await fetch('/api/init-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: state.user.email,
        amount_ngn: amount,
        purpose: 'wallet_deposit'
      })
    });

    const data = await res.json();
    if (data.status && data.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      showToast(data.message || 'Set PAYSTACK_SECRET_KEY in Vercel first.');
      btn.disabled = false;
      btn.textContent = 'Proceed to Paystack Checkout';
    }
  } catch (e) {
    showToast('Backend not reachable. Deploy to Vercel to process real NGN.');
    btn.disabled = false;
    btn.textContent = 'Proceed to Paystack Checkout';
  }
}

// 5. Check URL for Paystack Redirect Callback (?reference=NF_xxx)
async function checkPaystackCallback() {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get('reference') || params.get('trxref');
  if (!reference) return;

  showToast('Verifying Paystack payment...');
  try {
    const res = await fetch(`/api/verify-payment?reference=${encodeURIComponent(reference)}`);
    const data = await res.json();
    if (data.status) {
      state.balanceNgn += Number(data.amount_ngn || 0);
      localStorage.setItem('nf_balance', String(state.balanceNgn));
      state.transactions.unshift({
        description: `Paystack Deposit (${reference})`,
        amount_kobo: Math.round(data.amount_ngn * 100),
        status: 'success',
        created_at: new Date().toISOString()
      });
      localStorage.setItem('nf_txs', JSON.stringify(state.transactions));
      showToast(`Deposit successful! +${formatNaira(data.amount_ngn)}`);
      await syncWalletFromBackend();
    } else {
      showToast(data.message || 'Payment verification failed.');
    }
  } catch (err) {
    showToast('Could not verify payment reference.');
  } finally {
    window.history.replaceState({}, document.title, window.location.pathname);
    renderDashboard();
  }
}

// 6. Sync Wallet with Supabase via /api/wallet
async function syncWalletFromBackend() {
  if (!state.user || !state.user.email) return;
  try {
    const res = await fetch(`/api/wallet?email=${encodeURIComponent(state.user.email)}`);
    const data = await res.json();
    if (data.status && data.wallet) {
      state.backendLive = true;
      state.balanceNgn = Number(data.wallet.balance_kobo || 0) / 100;
      state.transactions = data.transactions || [];
      if (data.wallet.account_number) {
        state.savedBank = {
          bank_code: data.wallet.bank_code,
          bank_name: data.wallet.bank_name,
          account_number: data.wallet.account_number,
          account_name: data.wallet.account_name
        };
      }
      localStorage.setItem('nf_balance', String(state.balanceNgn));
      localStorage.setItem('nf_txs', JSON.stringify(state.transactions));
      document.getElementById('connectionBadge').textContent = '● Live Paystack + Supabase';
    }
  } catch (_) {
    // Fallback to local state if env vars are not yet added
  }
  renderDashboard();
}

async function handleLogin(e) {
  e.preventDefault();
  const fullName = document.getElementById('authName').value.trim() || 'NairaFly User';
  const email = document.getElementById('authEmail').value.trim().toLowerCase();
  if (!email) return;

  state.user = { full_name: fullName, email };
  localStorage.setItem('nf_user', JSON.stringify(state.user));

  try {
    await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert_user', email, full_name: fullName })
    });
  } catch (_) {}

  renderApp();
  await syncWalletFromBackend();
}

async function submitWithdrawal() {
  const amount = Number(document.getElementById('withdrawAmount').value);
  const bankSelect = document.getElementById('withdrawBank');
  const bankCode = bankSelect.value;
  const bankName = bankSelect.options[bankSelect.selectedIndex].text;
  const accountNumber = document.getElementById('withdrawAccount').value.trim();

  if (!state.verifiedWithdrawName) {
    showToast('Please verify a 10-digit account number first.');
    return;
  }
  if (!amount || amount < 500) {
    showToast('Minimum withdrawal is ₦500.');
    return;
  }
  if (amount > state.balanceNgn) {
    showToast('Insufficient Naira balance.');
    return;
  }

  try {
    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_withdrawal',
        email: state.user.email,
        amount_ngn: amount,
        bank_code: bankCode,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: state.verifiedWithdrawName
      })
    });
    const data = await res.json();
    if (data.status) {
      showToast(`Payout queued to ${state.verifiedWithdrawName}`);
      closeSheet('withdrawSheet');
      await syncWalletFromBackend();
      return;
    }
  } catch (_) {}

  // Local fallback update
  state.balanceNgn -= amount;
  localStorage.setItem('nf_balance', String(state.balanceNgn));
  state.transactions.unshift({
    description: `Payout to ${state.verifiedWithdrawName} (${bankName})`,
    amount_kobo: -Math.round(amount * 100),
    status: 'pending',
    created_at: new Date().toISOString()
  });
  localStorage.setItem('nf_txs', JSON.stringify(state.transactions));
  closeSheet('withdrawSheet');
  renderDashboard();
  showToast(`Withdrawal queued for ${state.verifiedWithdrawName}`);
}

async function savePayoutBank() {
  const bankSelect = document.getElementById('profileBank');
  const bankCode = bankSelect.value;
  const bankName = bankSelect.options[bankSelect.selectedIndex].text;
  const accountNumber = document.getElementById('profileAccount').value.trim();

  if (!state.verifiedProfileName) {
    showToast('Enter a valid 10-digit account number to verify first.');
    return;
  }

  state.savedBank = {
    bank_code: bankCode,
    bank_name: bankName,
    account_number: accountNumber,
    account_name: state.verifiedProfileName
  };
  localStorage.setItem('nf_bank', JSON.stringify(state.savedBank));

  try {
    await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_bank',
        email: state.user.email,
        ...state.savedBank
      })
    });
  } catch (_) {}

  showToast(`Saved verified bank: ${state.verifiedProfileName}`);
  renderDashboard();
}

function renderDashboard() {
  if (!state.user) return;
  document.getElementById('userGreeting').textContent = `Hi, ${state.user.full_name}`;
  document.getElementById('walletBalance').textContent = state.hideBalance ? '₦ ••••••' : formatNaira(state.balanceNgn);

  const txList = document.getElementById('txList');
  if (!state.transactions.length) {
    txList.innerHTML = `<div style="color: var(--muted); font-size: 13px; padding: 8px 0;">No transactions yet. Tap Deposit to fund via Paystack.</div>`;
  } else {
    txList.innerHTML = state.transactions.slice(0, 10).map((tx) => {
      const ngn = Number(tx.amount_kobo || 0) / 100;
      const isCredit = ngn >= 0;
      return `
        <div class="tx-item">
          <div>
            <div style="font-weight:700;">${tx.description || 'Transaction'}</div>
            <div style="font-size:11px; color:var(--muted);">${tx.status.toUpperCase()}</div>
          </div>
          <div style="font-weight:800; color:${isCredit ? '#10B981' : '#EF4444'};">
            ${isCredit ? '+' : ''}${formatNaira(ngn)}
          </div>
        </div>
      `;
    }).join('');
  }

  if (state.savedBank) {
    document.getElementById('savedBankSummary').textContent =
      `${state.savedBank.account_name} • ${state.savedBank.bank_name} (${state.savedBank.account_number})`;
  }
}

function renderApp() {
  const authView = document.getElementById('authView');
  const mainView = document.getElementById('mainView');
  if (!state.user) {
    authView.classList.remove('hidden');
    mainView.classList.add('hidden');
  } else {
    authView.classList.add('hidden');
    mainView.classList.remove('hidden');
    renderDashboard();
  }
}

function switchTab(tabName, btn) {
  ['homeTab', 'earnTab', 'referTab', 'profileTab'].forEach((id) => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(tabName).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function openSheet(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'withdrawSheet' && state.savedBank) {
    document.getElementById('withdrawBank').value = state.savedBank.bank_code;
    document.getElementById('withdrawAccount').value = state.savedBank.account_number;
    document.getElementById('withdrawDigitCount').textContent = `${state.savedBank.account_number.length}/10`;
    state.verifiedWithdrawName = state.savedBank.account_name;
    const box = document.getElementById('withdrawVerifyStatus');
    box.className = 'verified-box';
    box.innerHTML = `✓ Verified Account: <strong>${state.savedBank.account_name}</strong>`;
    document.getElementById('withdrawSubmitBtn').disabled = false;
  }
}

function closeSheet(id) {
  document.getElementById(id).classList.add('hidden');
}

function logoutUser() {
  localStorage.removeItem('nf_user');
  state.user = null;
  renderApp();
}

document.addEventListener('DOMContentLoaded', async () => {
  initPlatformGate();
  populateBankSelects();
  renderApp();

  document.getElementById('authForm').addEventListener('submit', handleLogin);

  // Live 10-digit NUBAN verification on Withdraw input
  const withdrawAcc = document.getElementById('withdrawAccount');
  const withdrawBank = document.getElementById('withdrawBank');
  const triggerWithdrawVerify = () => {
    withdrawAcc.value = withdrawAcc.value.replace(/\D/g, '').slice(0, 10);
    document.getElementById('withdrawDigitCount').textContent = `${withdrawAcc.value.length}/10`;
    document.getElementById('withdrawSubmitBtn').disabled = true;
    verifyNubanAccount(withdrawAcc.value, withdrawBank.value, 'withdrawVerifyStatus', (name) => {
      state.verifiedWithdrawName = name;
      document.getElementById('withdrawSubmitBtn').disabled = !name;
    });
  };
  withdrawAcc.addEventListener('input', triggerWithdrawVerify);
  withdrawBank.addEventListener('change', triggerWithdrawVerify);

  // Live 10-digit NUBAN verification on Profile input
  const profileAcc = document.getElementById('profileAccount');
  const profileBank = document.getElementById('profileBank');
  const triggerProfileVerify = () => {
    profileAcc.value = profileAcc.value.replace(/\D/g, '').slice(0, 10);
    document.getElementById('profileDigitCount').textContent = `${profileAcc.value.length}/10`;
    document.getElementById('profileSaveBtn').disabled = true;
    verifyNubanAccount(profileAcc.value, profileBank.value, 'profileVerifyStatus', (name) => {
      state.verifiedProfileName = name;
      document.getElementById('profileSaveBtn').disabled = !name;
    });
  };
  profileAcc.addEventListener('input', triggerProfileVerify);
  profileBank.addEventListener('change', triggerProfileVerify);

  if (state.user) {
    await checkPaystackCallback();
    await syncWalletFromBackend();
  }
});
