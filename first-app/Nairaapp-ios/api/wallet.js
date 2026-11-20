// Vercel Serverless Function: GET & POST /api/wallet
// Syncs user profile, wallet balance, daily streak check-ins, and withdrawal requests with Supabase

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({
      status: false,
      demo_fallback: true,
      message: 'Supabase environment variables not configured yet.'
    });
  }

  if (req.method === 'GET') {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ status: false, message: 'Email required.' });

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('email', email)
      .single();

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .limit(25);

    return res.status(200).json({ status: true, wallet, transactions: transactions || [] });
  }

  if (req.method === 'POST') {
    const { action, email, full_name, bank_code, bank_name, account_number, account_name, amount_ngn } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ status: false, message: 'Email required.' });

    if (action === 'upsert_user') {
      const refCode = 'NF-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const { data: existing } = await supabase.from('wallets').select('*').eq('email', cleanEmail).single();
      if (existing) {
        return res.status(200).json({ status: true, wallet: existing });
      }
      const { data: created, error } = await supabase
        .from('wallets')
        .insert({
          email: cleanEmail,
          full_name: full_name || cleanEmail.split('@')[0],
          referral_code: refCode
        })
        .select()
        .single();

      if (error) return res.status(400).json({ status: false, message: error.message });
      return res.status(200).json({ status: true, wallet: created });
    }

    if (action === 'save_bank') {
      const { data, error } = await supabase
        .from('wallets')
        .update({ bank_code, bank_name, account_number, account_name, updated_at: new Date().toISOString() })
        .eq('email', cleanEmail)
        .select()
        .single();
      if (error) return res.status(400).json({ status: false, message: error.message });
      return res.status(200).json({ status: true, wallet: data });
    }

    if (action === 'request_withdrawal') {
      const amountKobo = Math.round(Number(amount_ngn) * 100);
      const { data: wallet } = await supabase.from('wallets').select('*').eq('email', cleanEmail).single();
      if (!wallet || wallet.balance_kobo < amountKobo) {
        return res.status(400).json({ status: false, message: 'Insufficient wallet balance.' });
      }

      const ref = `WD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await supabase
        .from('wallets')
        .update({ balance_kobo: wallet.balance_kobo - amountKobo, updated_at: new Date().toISOString() })
        .eq('email', cleanEmail);

      await supabase.from('transactions').insert({
        reference: ref,
        user_email: cleanEmail,
        type: 'withdrawal',
        amount_kobo: -amountKobo,
        status: 'pending',
        description: `Payout to ${account_name} (${bank_name} • ${account_number})`
      });

      return res.status(200).json({ status: true, reference: ref, message: 'Withdrawal queued for payout.' });
    }
  }

  return res.status(405).json({ status: false, message: 'Unsupported request.' });
}
