// Vercel Serverless Function: POST /api/paystack-webhook
// Set this URL in Paystack Dashboard -> Settings -> API Keys & Webhooks:
// https://your-vercel-app.vercel.app/api/paystack-webhook

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).send('Missing secret key');
  }

  // Verify Paystack HMAC SHA-512 signature
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid Paystack signature');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const tx = event.data;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.rpc('credit_wallet_by_reference', {
        p_reference: tx.reference,
        p_email: tx.customer.email.toLowerCase(),
        p_amount_kobo: tx.amount,
        p_type: 'deposit',
        p_description: `Paystack Webhook Deposit (${tx.channel || 'transfer'})`
      });
    }
  }

  return res.status(200).json({ received: true });
}
