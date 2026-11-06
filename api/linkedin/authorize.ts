import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'node:crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (!clientId || !redirectUri) return res.status(503).send('LinkedIn connection is not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_REDIRECT_URI in your Vercel environment variables.');

  const state = randomBytes(24).toString('hex');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `li_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/api/linkedin/callback; Max-Age=600${secure}`);
  const authorizeUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email',
  }).toString();
  return res.redirect(302, authorizeUrl.toString());
}
