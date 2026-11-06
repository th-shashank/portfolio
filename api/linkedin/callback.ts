import type { VercelRequest, VercelResponse } from '@vercel/node';

function cookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  return cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function sendPopup(res: VercelResponse, status: number, type: string, payload: unknown, targetOrigin: string) {
  const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const safeType = JSON.stringify(type);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>LinkedIn connection</title></head><body><p>Finishing LinkedIn connection…</p><script>try{if(window.opener){window.opener.postMessage({type:${safeType},profile:${safePayload}},${JSON.stringify(targetOrigin)});}}catch(e){}window.close();</script></body></html>`;
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8').setHeader('Cache-Control', 'no-store').send(html);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const expectedState = cookieValue(req.headers.cookie, 'li_oauth_state');
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const origin = redirectUri ? new URL(redirectUri).origin : `https://${req.headers.host}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `li_oauth_state=; HttpOnly; SameSite=Lax; Path=/api/linkedin/callback; Max-Age=0${secure}`);

  if (req.query.error) return sendPopup(res, 400, 'linkedin-auth-error', { message: 'LinkedIn authorization was cancelled or denied.' }, origin);
  if (!code || !state || !expectedState || state !== expectedState) return sendPopup(res, 400, 'linkedin-auth-error', { message: 'The LinkedIn sign-in state could not be verified. Please try again.' }, origin);
  if (!redirectUri || !clientId || !clientSecret) return sendPopup(res, 503, 'linkedin-auth-error', { message: 'LinkedIn OAuth is not fully configured.' }, origin);

  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
    });
    if (!tokenResponse.ok) throw new Error('LinkedIn token exchange failed. Check the app credentials and redirect URI.');
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new Error('LinkedIn did not return an access token.');

    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!userResponse.ok) throw new Error('Could not read the basic LinkedIn identity. Confirm the OpenID Connect product is enabled.');
    const user = await userResponse.json() as Record<string, unknown>;
    const profile = {
      sub: typeof user.sub === 'string' ? user.sub : undefined,
      name: typeof user.name === 'string' ? user.name : undefined,
      headline: typeof user.headline === 'string' ? user.headline : undefined,
      given_name: typeof user.given_name === 'string' ? user.given_name : undefined,
      family_name: typeof user.family_name === 'string' ? user.family_name : undefined,
      picture: typeof user.picture === 'string' ? user.picture : undefined,
      email: typeof user.email === 'string' ? user.email : undefined,
      email_verified: typeof user.email_verified === 'boolean' ? user.email_verified : undefined,
    };
    return sendPopup(res, 200, 'linkedin-auth-success', profile, origin);
  } catch (error) {
    return sendPopup(res, 502, 'linkedin-auth-error', { message: error instanceof Error ? error.message : 'LinkedIn connection failed.' }, origin);
  }
}
