// Vercel Serverless Function: GET /api/verify-payment?reference=NF_xxx
// Verifies a Paystack transaction and credits the user's Supabase wallet atomically

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const { reference } = req.query;
  if (!reference) {
    return res.status(400).json({ status: false, message: 'Transaction reference is required.' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    return res.status(500).json({ status: false, message: 'Server missing PAYSTACK_SECRET_KEY.' });
  }

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.status || verifyData.data.status !== 'success') {
      return res.status(400).json({
        status: false,
        message: 'Payment not completed or verification failed.'
      });
    }

    const tx = verifyData.data;
    const customerEmail = tx.customer.email.toLowerCase();
    const amountKobo = tx.amount;

    // Credit wallet in Supabase if configured
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.rpc('credit_wallet_by_reference', {
        p_reference: tx.reference,
        p_email: customerEmail,
        p_amount_kobo: amountKobo,
        p_type: 'deposit',
        p_description: `Paystack Deposit (${tx.channel || 'card/bank'})`
      });
    }

    return res.status(200).json({
      status: true,
      reference: tx.reference,
      amount_ngn: amountKobo / 100,
      email: customerEmail,
      message: 'Payment verified and wallet credited.'
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Error verifying payment.' });
  }
}
