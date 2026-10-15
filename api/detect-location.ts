import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || '';
    const ip = rawIp.replace(/^::ffff:/, '');

    const isLocal = !ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
    if (isLocal) {
      return res.json({
        state: 'Lagos',
        city: 'Lagos',
        lat: 6.52,
        lng: 3.37,
        country: 'Nigeria',
        isDetected: false
      });
    }

    const geoRes = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon`, { timeout: 3500 });
    if (geoRes.data?.status === 'success') {
      const lat = Math.round(Number(geoRes.data.lat) * 100) / 100;
      const lng = Math.round(Number(geoRes.data.lon) * 100) / 100;
      return res.json({
        state: geoRes.data.regionName || 'Lagos',
        city: geoRes.data.city || 'Lagos',
        lat,
        lng,
        country: geoRes.data.country || 'Nigeria',
        isDetected: true
      });
    }
  } catch (err: any) {
    console.warn('IP location detection error:', err.message);
  }

  return res.json({
    state: 'Lagos',
    city: 'Lagos',
    lat: 6.52,
    lng: 3.37,
    country: 'Nigeria',
    isDetected: false
  });
}
