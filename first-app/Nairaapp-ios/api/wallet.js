import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === 'GET') {
    const email = String(req.query?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ status: false, message: 'Email is required.' });
    }

    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (walletErr) {
      return res.status(500).json({ status: false, message: walletErr.message });
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .limit(20);

    return res.status(200).json({
      status: true,
      wallet: wallet || { email, balance_kobo: 0 },
      transactions: transactions || []
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ status: false, message: 'Email is required.' });
  }

  if (body.action === 'upsert_user') {
    const fullName = String(body.full_name || email.split('@')[0] || 'NairaFly User').trim();
    const referralCode =
      String(body.referral_code || '').trim() ||
      'NF' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: existing } = await supabase
      .from('wallets')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await supabase.from('wallets').insert({
        email,
        full_name: fullName,
        referral_code: referralCode,
        balance_kobo: 0
      });
      if (insertErr) {
        return res.status(500).json({ status: false, message: insertErr.message });
      }
    }

    return res.status(200).json({ status: true });
  }

  if (body.action === 'request_withdrawal') {
    const amountNgn = Number(body.amount_ngn || 0);
    const amountKobo = Math.round(amountNgn * 100);
    const bankCode = String(body.bank_code || '').trim();
    const accountNumber = String(body.account_number || '').trim();
    const accountName = String(body.account_name || '').trim();

    if (!amountNgn || amountNgn < 500) {
      return res.status(400).json({ status: false, message: 'Minimum withdrawal is ₦500.' });
    }

    if (!bankCode || accountNumber.length !== 10 || !accountName) {
      return res.status(400).json({ status: false, message: 'Verified bank details are required.' });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ status: false, message: 'PAYSTACK_SECRET_KEY is not configured.' });
    }

    const { data: wallet, error: fetchErr } = await supabase
      .from('wallets')
      .select('email, balance_kobo')
      .eq('email', email)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ status: false, message: fetchErr.message });
    }

    const currentKobo = Number(wallet?.balance_kobo || 0);
    if (amountKobo > currentKobo) {
      return res.status(400).json({
        status: false,
        message: `Insufficient Naira balance. Available: ₦${(currentKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
      });
    }

    // 1. Create Paystack Transfer Recipient
    const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN'
      })
    });
    const recipientData = await recipientRes.json();

    if (!recipientRes.ok || !recipientData.status || !recipientData.data?.recipient_code) {
      return res.status(400).json({
        status: false,
        message: recipientData.message || 'Could not create Paystack transfer recipient.'
      });
    }

    // 2. Initiate Paystack Transfer (reference must be 16-50 lowercase chars/digits/_/-)
    const ref = `nf_wd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amountKobo,
        recipient: recipientData.data.recipient_code,
        reference: ref,
        reason: 'NairaFly Wallet Withdrawal'
      })
    });
    const transferData = await transferRes.json();

    if (!transferRes.ok || !transferData.status) {
      return res.status(400).json({
        status: false,
        message: transferData.message || 'Paystack transfer failed. Check your Paystack balance.'
      });
    }

    // 3. Deduct wallet balance and log transaction in Supabase
    const nextKobo = currentKobo - amountKobo;
    const { error: updateErr } = await supabase
      .from('wallets')
      .update({
        balance_kobo: nextKobo,
        bank_code: bankCode,
        bank_name: body.bank_name || null,
        account_number: accountNumber,
        account_name: accountName
      })
      .eq('email', email);

    if (updateErr) {
      return res.status(500).json({ status: false, message: updateErr.message });
    }

    await supabase.from('transactions').insert({
      reference: ref,
      user_email: email,
      type: 'withdrawal',
      amount_kobo: -amountKobo
    });

    return res.status(200).json({
      status: true,
      reference: ref,
      transfer_code: transferData.data?.transfer_code || null,
      transfer_status: transferData.data?.status || 'pending',
      balance_kobo: nextKobo
    });
  }

  return res.status(400).json({ status: false, message: 'Unsupported action.' });
}