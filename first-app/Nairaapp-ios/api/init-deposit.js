// Vercel Serverless Function: POST /api/init-deposit
// Initializes a real Paystack NGN checkout session and returns authorization_url + reference

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const { email, amount_ngn, purpose = 'deposit' } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ status: false, message: 'Valid user email is required.' });
  }

  const amountNum = Number(amount_ngn);
  if (!amountNum || amountNum < 100) {
    return res.status(400).json({ status: false, message: 'Minimum amount is ₦100.' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ status: false, message: 'Server missing PAYSTACK_SECRET_KEY.' });
  }

  const amountKobo = Math.round(amountNum * 100);
  const reference = `NF_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const callbackUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.host}`;

  try {
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        amount: amountKobo,
        currency: 'NGN',
        reference,
        callback_url: `${callbackUrl}/?reference=${reference}`,
        metadata: {
          app: 'NairaFly iOS',
          purpose
        }
      })
    });

    const data = await paystackRes.json();

    if (!paystackRes.ok || !data.status) {
      return res.status(400).json({ status: false, message: data.message || 'Paystack initialization failed.' });
    }

    return res.status(200).json({
      status: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      public_key: process.env.PAYSTACK_PUBLIC_KEY || ''
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Payment initialization error.' });
  }
}
