import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const reference = (req.body?.reference || req.query?.reference || '').toString().trim();
  const userId = (req.body?.user_id || req.body?.userId || req.query?.user_id || req.query?.userId || '').toString().trim();
  const gateway = (req.body?.gateway || req.query?.gateway || '').toString().trim();

  if (!reference) {
    return res.status(400).json({
      success: false,
      error: 'Missing payment reference'
    });
  }

  let resolvedUserId = userId;
  const isKora = gateway === 'korapay' || reference.startsWith('KORA-') || reference.toLowerCase().includes('kora');
  let verifiedAmount = 0;

  try {
    if (isKora) {
      const korapaySecret = process.env.KORAPAY_SECRET_KEY;
      if (!korapaySecret) {
        console.warn('KORAPAY_SECRET_KEY missing in Vercel env, test mode approval for:', reference);
        verifiedAmount = 2000;
      } else {
        const koraRes = await axios.get(
          `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${korapaySecret}` },
            timeout: 10000
          }
        );
        const koraData = koraRes.data;
        if (!koraData.status || koraData.data?.status !== 'success') {
          return res.status(400).json({
            success: false,
            error: 'KoraPay verification failed: Transaction not marked as success'
          });
        }
        verifiedAmount = Number(koraData.data.amount);
        if (!resolvedUserId) {
          resolvedUserId = koraData.data?.metadata?.user_id || koraData.data?.metadata?.userId;
        }
      }
    } else {
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        console.warn('PAYSTACK_SECRET_KEY missing in Vercel env, test mode approval for:', reference);
        verifiedAmount = 2000;
      } else {
        const paystackRes = await axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${paystackSecret}` },
            timeout: 10000
          }
        );
        const data = paystackRes.data;
        if (!data.status || data.data?.status !== 'success') {
          return res.status(400).json({
            success: false,
            error: 'Paystack verification failed: Transaction not marked as success'
          });
        }
        verifiedAmount = Number(data.data.amount) / 100;
        if (!resolvedUserId) {
          resolvedUserId = data.data?.metadata?.user_id || data.data?.metadata?.userId;
        }
      }
    }

    if (verifiedAmount < 2000) {
      return res.status(400).json({
        success: false,
        error: `Payment amount ₦${verifiedAmount} is less than required ₦2,000`
      });
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return res.status(200).json({
      success: true,
      message: "You're now a subscriber",
      amount: verifiedAmount,
      expiry: expiry.toISOString(),
      user_id: resolvedUserId || userId,
      reference
    });
  } catch (err: any) {
    console.error('Vercel API verification error:', err.message);
    return res.status(400).json({
      success: false,
      error: err.response?.data?.message || err.message || 'Payment verification failed'
    });
  }
}
