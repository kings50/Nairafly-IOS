// Vercel Serverless Function: GET /api/resolve-account?account_number=0123456789&bank_code=058
// Calls Paystack's official NUBAN Resolve Account endpoint securely on the server

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const { account_number, bank_code } = req.query;

  if (!account_number || !/^\d{10}$/.test(account_number)) {
    return res.status(400).json({ status: false, message: 'A valid 10-digit NUBAN account number is required.' });
  }

  if (!bank_code) {
    return res.status(400).json({ status: false, message: 'Bank code is required.' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ status: false, message: 'Server missing PAYSTACK_SECRET_KEY environment variable.' });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return res.status(400).json({
        status: false,
        message: data.message || 'Could not resolve account name. Check bank and account number.'
      });
    }

    return res.status(200).json({
      status: true,
      account_number: data.data.account_number,
      account_name: data.data.account_name,
      bank_code
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: 'Bank verification service unreachable.' });
  }
}
