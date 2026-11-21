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

let authMode = 'signin';

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
  if (!lock) return;
  if (!isAppleIOS() && sessionStorage.getItem('nf_ios_sim') !== '1') {
    lock.classList.remove('hidden');
  } else {
    lock.classList.add('hidden');
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const banner = document.getElementById('safariInstallBanner');
    if (!isStandalone && banner) {
      banner.classList.remove('hidden');
    }
  }
}

function enableSimulatorPreview() {
  sessionStorage.setItem('nf_ios_sim', '1');
  const lock = document.getElementById('iosLockScreen');
  if (lock) lock.classList.add('hidden');
  showToast('iOS Simulator Preview Enabled');
}

// 2. Helpers
function formatNaira(amount) {
  return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) {
    alert(msg);
    return;
  }
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

function getCurrentUserEmail() {
  if (state.user && state.user.email) return state.user.email.trim();
  const savedEmail = localStorage.getItem('userEmail') || localStorage.getItem('nairafly_email') || '';
  if (savedEmail) return savedEmail.trim();
  const emailInput = document.getElementById('authEmail') || document.querySelector('input[type="email"]');
  if (emailInput && emailInput.value) return emailInput.value.trim();
  return '';
}

function populateBankSelects() {
  ['withdrawBankCode', 'withdrawBank', 'profileBank'].forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML =
      '<option value="">Select bank</option>' +
      NIGERIAN_BANKS.map((b) => `<option value="${b.code}">${b.name}</option>`).join('');
  });
}

// 3. Sign In / Create Account Gate
function setAuthMode(mode) {
  authMode = mode === 'signup' ? 'signup' : 'signin';
  const heading = document.getElementById('authHeading');
  const subtext = document.getElementById('authSubtext');
  const nameGroup = document.getElementById('authNameGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const signInBtn = document.getElementById('modeSignInBtn');
  const signUpBtn = document.getElementById('modeSignUpBtn');

  if (authMode === 'signup') {
    if (heading) heading.textContent = 'Create NairaFly Account';
    if (subtext) subtext.textContent = 'Create your account to start claiming task rewards and managing your Naira wallet.';
    if (nameGroup) nameGroup.classList.remove('hidden');
    if (submitBtn) submitBtn.textContent = 'Create Account & Continue';
    if (signUpBtn) {
      signUpBtn.style.background = 'var(--emerald)';
      signUpBtn.style.color = '#fff';
      signUpBtn.style.border = 'none';
    }
    if (signInBtn) {
      signInBtn.style.background = 'var(--bg)';
      signInBtn.style.color = 'var(--text)';
      signInBtn.style.border = '1px solid var(--border)';
    }
  } else {
    if (heading) heading.textContent = 'Sign In to NairaFly';
    if (subtext) subtext.textContent = 'Sign in with your email to access your wallet, claim rewards, and withdraw Naira.';
    if (nameGroup) nameGroup.classList.add('hidden');
    if (submitBtn) submitBtn.textContent = 'Continue to Dashboard';
    if (signInBtn) {
      signInBtn.style.background = 'var(--emerald)';
      signInBtn.style.color = '#fff';
      signInBtn.style.border = 'none';
    }
    if (signUpBtn) {
      signUpBtn.style.background = 'var(--bg)';
      signUpBtn.style.color = 'var(--text)';
      signUpBtn.style.border = '1px solid var(--border)';
    }
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = (document.getElementById('authEmail')?.value || '').trim().toLowerCase();
  if (!email) return;

  const fullName =
    (document.getElementById('authName')?.value || '').trim() ||
    email.split('@')[0] ||
    'NairaFly User';
  const referralCode = 'NF' + Math.random().toString(36).substring(2, 8).toUpperCase();

  state.user = { full_name: fullName, email, referral_code: referralCode };
  localStorage.setItem('nf_user', JSON.stringify(state.user));
  localStorage.setItem('userEmail', email);
  localStorage.setItem('nairafly_email', email);

  try {
    await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_user',
        email,
        full_name: fullName,
        referral_code: referralCode
      })
    });
  } catch (_) {}

  renderApp();
  await syncWalletFromBackend();
}

// 4. Real NUBAN 10-Digit Account Name Verification via /api/resolve-account
async function verifyNubanAccount(accountNumber, bankCode, statusElId, onVerified) {
  const box = document.getElementById(statusElId);
  if (!box) return;

  if (accountNumber.length !== 10 || !bankCode) {
    box.className = 'hidden';
    box.textContent = '';
    onVerified('');
    return;
  }

  box.className = 'verified-box';
  box.textContent = 'Verifying 10-digit NUBAN with bank...';

  try {
    const params = new URLSearchParams({
      account_number: accountNumber,
      bank_code: bankCode
    });
    const res = await fetch(`/api/resolve-account?${params.toString()}`);
    const data = await res.json();
    const accountName = data.account_name || data.data?.account_name || '';

    if (res.ok && data.status && accountName) {
      box.className = 'verified-box';
      box.innerHTML = `✓ Verified Account: <strong>${accountName}</strong>`;
      onVerified(accountName);
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

async function verifyWithdrawAccount() {
  const bankCode = document.getElementById('withdrawBankCode')?.value || '';
  const accountNumber = (document.getElementById('withdrawAccountNumber')?.value || '').trim();
  const submitBtn = document.getElementById('submitWithdrawBtn');
  if (submitBtn) submitBtn.disabled = true;

  await verifyNubanAccount(accountNumber, bankCode, 'withdrawAccountStatus', (name) => {
    state.verifiedWithdrawName = name;
    if (submitBtn) submitBtn.disabled = !name;
  });
}

function handleWithdrawAccountInput() {
  const accInput = document.getElementById('withdrawAccountNumber');
  const countEl = document.getElementById('withdrawDigitCount');
  if (!accInput) return;
  accInput.value = accInput.value.replace(/\D/g, '').slice(0, 10);
  if (countEl) countEl.textContent = `${accInput.value.length}/10`;
  verifyWithdrawAccount();
}

// 5. Real Paystack Checkout Deposit via /api/init-deposit
async function submitDeposit() {
  const email = (document.getElementById('depositEmail')?.value || getCurrentUserEmail() || '').trim();
  const amount = Number(document.getElementById('depositAmount')?.value || 0);
  if (!email) {
    showToast('Enter a valid email address.');
    return;
  }
  if (!amount || amount < 100) {
    showToast('Enter at least ₦100 to deposit.');
    return;
  }

  const btn = document.getElementById('submitDepositBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Connecting to Paystack...';
  }

  try {
    const res = await fetch('/api/init-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount_ngn: amount,
        amount_kobo: Math.round(amount * 100),
        purpose: 'wallet_deposit'
      })
    });

    const data = await res.json();
    if (data.status && data.authorization_url) {
      window.location.href = data.authorization_url;
      return;
    }
    showToast(data.message || 'Set PAYSTACK_SECRET_KEY in Vercel first.');
  } catch (e) {
    showToast('Backend not reachable. Deploy to Vercel to process real NGN.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Continue to Deposit';
    }
  }
}

// 6. Check URL for Paystack Redirect Callback (?reference=NF_xxx)
async function checkPaystackCallback() {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get('reference') || params.get('trxref');
  if (!reference) return;

  showToast('Verifying Paystack payment...');
  try {
    const res = await fetch(`/api/verify-payment?reference=${encodeURIComponent(reference)}`);
    const data = await res.json();
    if (data.status) {
      const creditedNgn = Number(data.amount_ngn || 0);
      state.balanceNgn += creditedNgn;
      localStorage.setItem('nf_balance', String(state.balanceNgn));
      state.transactions.unshift({
        description: `Paystack Deposit (${reference})`,
        amount_kobo: Math.round(creditedNgn * 100),
        status: 'success',
        created_at: new Date().toISOString()
      });
      localStorage.setItem('nf_txs', JSON.stringify(state.transactions));
      showToast(`Deposit successful! +${formatNaira(creditedNgn)}`);
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

// 7. Sync Wallet with Supabase via /api/wallet
async function syncWalletFromBackend() {
  const email = getCurrentUserEmail();
  if (!email) return;

  try {
    const res = await fetch(`/api/wallet?email=${encodeURIComponent(email)}`);
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
        localStorage.setItem('nf_bank', JSON.stringify(state.savedBank));
      }
      localStorage.setItem('nf_balance', String(state.balanceNgn));
      localStorage.setItem('nf_txs', JSON.stringify(state.transactions));
      const badge = document.getElementById('connectionBadge');
      if (badge) badge.textContent = '● Live Paystack + Supabase';
    }
  } catch (_) {
    // Fallback to local state if env vars are not yet added
  }
  renderDashboard();
}

// 8. Withdrawal Submission with Verified Bank Account
async function submitWithdraw() {
  const email = (document.getElementById('withdrawEmail')?.value || getCurrentUserEmail() || '').trim();
  const bankSelect = document.getElementById('withdrawBankCode');
  const bankCode = bankSelect?.value || '';
  const bankName = bankSelect && bankSelect.selectedIndex > 0 ? bankSelect.options[bankSelect.selectedIndex].text : '';
  const accountNumber = (document.getElementById('withdrawAccountNumber')?.value || '').trim();
  const amount = Number(document.getElementById('withdrawAmount')?.value || 0);

  if (!email || !bankCode || accountNumber.length !== 10) {
    showToast('Select a bank and enter a 10-digit account number.');
    return;
  }

  if (!state.verifiedWithdrawName) {
    await verifyWithdrawAccount();
  }

  if (!state.verifiedWithdrawName) {
    showToast('Please verify a valid 10-digit account number first.');
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

  const btn = document.getElementById('submitWithdrawBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
  }

  try {
    const res = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_withdrawal',
        email,
        amount_ngn: amount,
        amount_kobo: Math.round(amount * 100),
        bank_code: bankCode,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: state.verifiedWithdrawName
      })
    });
    const data = await res.json();
    if (res.ok && data.status) {
      showToast(`Payout queued to ${state.verifiedWithdrawName}`);
      state.verifiedWithdrawName = '';
      closeAllSheets();
      await syncWalletFromBackend();
      return;
    }
    showToast(data.message || 'Could not process withdrawal.');
  } catch (_) {
    state.balanceNgn -= amount;
    localStorage.setItem('nf_balance', String(state.balanceNgn));
    state.transactions.unshift({
      description: `Payout to ${state.verifiedWithdrawName} (${bankName})`,
      amount_kobo: -Math.round(amount * 100),
      status: 'pending',
      created_at: new Date().toISOString()
    });
    localStorage.setItem('nf_txs', JSON.stringify(state.transactions));
    state.verifiedWithdrawName = '';
    closeAllSheets();
    renderDashboard();
    showToast(`Withdrawal queued for ${state.verifiedWithdrawName}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Request Withdrawal';
    }
  }
}

async function savePayoutBank() {
  const bankSelect = document.getElementById('profileBank');
  const bankCode = bankSelect?.value || '';
  const bankName = bankSelect && bankSelect.selectedIndex >= 0 ? bankSelect.options[bankSelect.selectedIndex].text : '';
  const accountNumber = (document.getElementById('profileAccount')?.value || '').trim();

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
        email: getCurrentUserEmail(),
        ...state.savedBank
      })
    });
  } catch (_) {}

  showToast(`Saved verified bank: ${state.verifiedProfileName}`);
  renderDashboard();
}

// 9. Earn Tasks Loader & Claim Flow (/api/tasks)
async function loadEarnTasks(userEmail) {
  const container = document.getElementById('earn-tasks-list');
  if (!container) return;

  try {
    const res = await fetch('/api/tasks');
    const data = await res.json();

    if (!data.status || !Array.isArray(data.tasks)) {
      container.innerHTML = '<p style="font-size:13px; color:var(--muted);">Could not load tasks right now.</p>';
      return;
    }

    container.innerHTML = '';

    data.tasks.forEach((task) => {
      const card = document.createElement('div');
      card.className = 'task-card';
      card.innerHTML = `
        <div>
          <div class="task-title">${task.title}</div>
          <div class="task-reward">+₦${Number(task.reward_ngn).toFixed(2)}</div>
        </div>
        <div class="task-actions">
          <a href="${task.url}" target="_blank" rel="noopener noreferrer">Open</a>
          <button type="button" data-task-id="${task.id}">Claim Reward</button>
        </div>
      `;

      const claimBtn = card.querySelector('button');
      claimBtn.addEventListener('click', async () => {
        const activeEmail = (userEmail || getCurrentUserEmail() || '').trim();
        if (!activeEmail) {
          showToast('Please sign in or enter your email first.');
          return;
        }

        claimBtn.disabled = true;
        claimBtn.textContent = 'Claiming...';

        try {
          const claimRes = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: activeEmail,
              task_id: task.id
            })
          });
          const claimData = await claimRes.json();

          if (!claimRes.ok || !claimData.status) {
            showToast(claimData.message || 'Could not claim task.');
            claimBtn.disabled = false;
            claimBtn.textContent = 'Claim Reward';
            return;
          }

          claimBtn.textContent = 'Claimed';
          if (typeof claimData.balance_kobo === 'number') {
            state.balanceNgn = claimData.balance_kobo / 100;
            localStorage.setItem('nf_balance', String(state.balanceNgn));
          } else if (task.reward_ngn) {
            state.balanceNgn += Number(task.reward_ngn);
            localStorage.setItem('nf_balance', String(state.balanceNgn));
          }
          renderDashboard();
        } catch (err) {
          showToast('Network error while claiming task.');
          claimBtn.disabled = false;
          claimBtn.textContent = 'Claim Reward';
        }
      });

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<p style="font-size:13px; color:var(--muted);">Error loading tasks.</p>';
  }
}

// 10. UI Rendering & Navigation
function renderDashboard() {
  const greetingEl = document.getElementById('userGreeting');
  if (greetingEl && state.user) {
    greetingEl.textContent = `Hi, ${state.user.full_name}`;
  }

  const balanceEl = document.getElementById('walletBalance');
  if (balanceEl) {
    balanceEl.textContent = state.hideBalance ? '₦ ••••••' : formatNaira(state.balanceNgn);
  }

  const txList = document.getElementById('txList');
  if (txList) {
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
              <div style="font-size:11px; color:var(--muted);">${String(tx.status || '').toUpperCase()}</div>
            </div>
            <div style="font-weight:800; color:${isCredit ? '#10B981' : '#EF4444'};">
              ${isCredit ? '+' : ''}${formatNaira(ngn)}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const savedBankEl = document.getElementById('savedBankSummary');
  if (savedBankEl && state.savedBank) {
    savedBankEl.textContent =
      `${state.savedBank.account_name} • ${state.savedBank.bank_name} (${state.savedBank.account_number})`;
  }
}

function renderApp() {
  const authView = document.getElementById('authView');
  const mainView = document.getElementById('mainView');
  if (!authView || !mainView) return;

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
    const tabEl = document.getElementById(id);
    if (tabEl) tabEl.classList.toggle('hidden', id !== tabName);
  });

  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const navMap = { homeTab: 'navHome', earnTab: 'navEarn' };
    if (navMap[tabName]) {
      document.getElementById(navMap[tabName])?.classList.add('active');
    }
  }

  if (tabName === 'earnTab') {
    loadEarnTasks();
  }
}

function openDeposit() {
  const email = getCurrentUserEmail();
  const input = document.getElementById('depositEmail');
  if (input && email) input.value = email;
  document.getElementById('depositSheet')?.classList.remove('hidden');
}

function openWithdraw() {
  const email = getCurrentUserEmail();
  const input = document.getElementById('withdrawEmail');
  if (input && email) input.value = email;

  document.getElementById('withdrawSheet')?.classList.remove('hidden');

  if (state.savedBank) {
    const bankSel = document.getElementById('withdrawBankCode');
    const accInput = document.getElementById('withdrawAccountNumber');
    const countEl = document.getElementById('withdrawDigitCount');
    const box = document.getElementById('withdrawAccountStatus');
    const submitBtn = document.getElementById('submitWithdrawBtn');

    if (bankSel) bankSel.value = state.savedBank.bank_code;
    if (accInput) accInput.value = state.savedBank.account_number;
    if (countEl) countEl.textContent = `${state.savedBank.account_number.length}/10`;
    state.verifiedWithdrawName = state.savedBank.account_name;

    if (box) {
      box.className = 'verified-box';
      box.innerHTML = `✓ Verified Account: <strong>${state.savedBank.account_name}</strong>`;
    }
    if (submitBtn) submitBtn.disabled = false;
  }
}

function closeAllSheets() {
  document.getElementById('depositSheet')?.classList.add('hidden');
  document.getElementById('withdrawSheet')?.classList.add('hidden');
}

function closeSheets(event) {
  if (event.target && event.target.classList.contains('sheet-backdrop')) {
    closeAllSheets();
  }
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
  renderDashboard();
  loadEarnTasks();

  const authForm = document.getElementById('authForm');
  if (authForm) authForm.addEventListener('submit', handleLogin);

  const withdrawAcc = document.getElementById('withdrawAccountNumber');
  const withdrawBank = document.getElementById('withdrawBankCode');
  if (withdrawAcc) withdrawAcc.addEventListener('input', handleWithdrawAccountInput);
  if (withdrawBank) withdrawBank.addEventListener('change', verifyWithdrawAccount);

  const profileAcc = document.getElementById('profileAccount');
  const profileBank = document.getElementById('profileBank');
  const triggerProfileVerify = () => {
    if (!profileAcc || !profileBank) return;
    profileAcc.value = profileAcc.value.replace(/\D/g, '').slice(0, 10);
    const countEl = document.getElementById('profileDigitCount');
    const saveBtn = document.getElementById('profileSaveBtn');
    if (countEl) countEl.textContent = `${profileAcc.value.length}/10`;
    if (saveBtn) saveBtn.disabled = true;
    verifyNubanAccount(profileAcc.value, profileBank.value, 'profileVerifyStatus', (name) => {
      state.verifiedProfileName = name;
      if (saveBtn) saveBtn.disabled = !name;
    });
  };
  if (profileAcc) profileAcc.addEventListener('input', triggerProfileVerify);
  if (profileBank) profileBank.addEventListener('change', triggerProfileVerify);

  if (state.user) {
    await checkPaystackCallback();
    await syncWalletFromBackend();
  }
});