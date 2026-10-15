import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  const secret = process.env.KORAPAY_SECRET_KEY;
  const signature = req.headers['x-korapay-signature'];

  if (secret && signature) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      console.warn('KoraPay Webhook: Signature verification skipped or mismatch');
    }
  }

  const event = req.body;
  const data = event?.data || event;
  const reference = data?.reference;
  console.log(`KoraPay Webhook: Received charge notification for ref ${reference}`);

  return res.status(200).send('OK');
}
