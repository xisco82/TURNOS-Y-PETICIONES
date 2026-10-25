import { app } from '../server';

export default function handler(req: any, res: any) {
  // CORS support for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure /api prefix in req.url for Express router matching
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/@') && !req.url.startsWith('/src')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  // Safely parse body if Vercel passed it as string
  if (req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // keep as is
    }
  }

  return app(req, res);
}
