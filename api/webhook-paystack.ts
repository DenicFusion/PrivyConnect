import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers['x-paystack-signature'];

  if (secret && signature) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      console.warn('Paystack Webhook: Signature verification skipped or mismatch');
    }
  }

  const event = req.body;
  if (event?.event === 'charge.success') {
    const { reference, amount, metadata } = event.data || {};
    const userId = metadata?.user_id || metadata?.userId;
    console.log(`Paystack Webhook: Received charge.success for ref ${reference}, amount ${amount}, user ${userId}`);
  }

  return res.status(200).send('OK');
}
