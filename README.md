# Shashank Kumar — Portfolio

A responsive React + TypeScript portfolio with a private editor, Supabase persistence, optional LinkedIn OpenID Connect identity, CSV/JSON import, and Vercel deployment support.

## What's included

- Public portfolio: hero, about, education, skills, projects, experience, certificates, achievements, contact, LinkedIn/GitHub links, and résumé link.
- Admin dashboard at `/admin`: profile editor plus add/edit/delete for skills, projects, experience, certificates, and achievements.
- Supabase Auth + Postgres + Storage support. Public visitors can read portfolio data; only manually allowlisted admin accounts can change it. Supabase Realtime refreshes open portfolio pages after an admin saves.
- Browser-only local editor for development when `VITE_LOCAL_ADMIN=true` is set. This is intentionally disabled in production and is not a secure production admin system.
- LinkedIn OAuth 2.0 / OpenID Connect routes under `/api/linkedin/*`. The server handles the client secret and returns only basic OIDC identity fields to the admin popup.
- CSV import for skills, projects, certificates, and experience; JSON import for the complete portfolio. Imports are staged for review and do not publish until Save changes is clicked.
- Vercel-ready configuration and a Supabase SQL schema.

## 1. Run locally

Install Node.js 20.19+ or 22.12+ and npm. From this folder:

```bash
npm install
copy .env.example .env
npm run dev
```

On Windows PowerShell, `copy .env.example .env` works. If you use Command Prompt, use `copy .env.example .env` there too.

Open the local URL printed by Vite, usually `http://localhost:5173`.

For a quick local-only edit preview, keep Supabase variables blank and set this in `.env`:

```env
VITE_LOCAL_ADMIN=true
```

Then open `/admin`. Changes are saved in this browser's local storage only. They do not sync to another device and they disappear if that browser's site data is cleared. The local editor is not enabled in production builds.

## 2. Configure Supabase for live content and secure admin access

1. Create a Supabase project.
2. Open **Project Settings → API** and copy the Project URL and anon/public key.
3. Add these to `.env` for local work and to Vercel Environment Variables for production:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

4. Open the Supabase **SQL Editor** and run all of `supabase/schema.sql`.
5. In Supabase **Authentication → Users**, create/invite your admin user. Disable public sign-up unless you intentionally need it.
6. Copy the user's UUID from the Users table. Run this in the SQL Editor, replacing the value:

   ```sql
   insert into public.admin_users (user_id)
   values ('YOUR-AUTH-USER-UUID');
   ```

   This manual allowlist is deliberate. Do not add an admin signup feature that lets a visitor grant themselves admin rights.
7. Sign in at `/admin` using the Supabase user's email and password. If the account is not allowlisted, it will be authenticated but will not receive edit access.

The Supabase anon key is designed to be used in the browser when Row Level Security is correctly configured. **Never put a Supabase service-role key or LinkedIn client secret in a `VITE_` variable or frontend code.**

## 3. Configure LinkedIn identity connection (optional)

The LinkedIn button uses the official OAuth 2.0 Authorization Code flow and OpenID Connect `openid profile email` scopes. It does not scrape the LinkedIn website and does not use a password, cookie, or unofficial API.

1. In the [LinkedIn Developer Portal](https://www.linkedin.com/developers/), create an app and associate it with your organization/page as LinkedIn requires.
2. Add the **Sign In with LinkedIn using OpenID Connect** product to the app and complete any required verification/review.
3. Under the app's Auth settings, add this exact redirect URL:

   `https://YOUR_DOMAIN/api/linkedin/callback`

4. Add these server-side environment variables in Vercel (not prefixed with `VITE_`):

   ```env
   LINKEDIN_CLIENT_ID=your-client-id
   LINKEDIN_CLIENT_SECRET=your-client-secret
   LINKEDIN_REDIRECT_URI=https://YOUR_DOMAIN/api/linkedin/callback
   ```

5. Redeploy after setting the variables. The `/admin` → LinkedIn & import tab opens the OAuth popup.

**Important limitation:** LinkedIn's generally available self-serve OpenID Connect permissions provide basic member identity details (name, profile picture, and email when authorized). They do not provide a full personal-profile feed of skills, projects, work history, education, or certificates. Broader Profile API access is restricted to approved developers/programs. This implementation does not claim that those sections auto-sync. Use the secure dashboard or your own JSON/CSV import for the complete portfolio. LinkedIn does not provide a supported general-purpose webhook for every personal profile edit, so this project does not poll or scrape your profile in the background.

For the official scope/access details, see:

- [Getting access to LinkedIn APIs](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)
- [Sign in with LinkedIn using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [LinkedIn API Terms](https://developer.linkedin.com/legal)

## 4. Import templates

### Full JSON

The JSON structure matches `PortfolioData`. You may paste only the sections you want to update, for example:

```json
{
  "skills": [
    { "id": "skill-sql", "name": "SQL", "category": "Data & ML" }
  ],
  "projects": [
    {
      "id": "project-portfolio",
      "title": "Personal Portfolio",
      "summary": "A React and TypeScript portfolio.",
      "description": "Built with React, TypeScript, and Supabase.",
      "tech": ["React", "TypeScript", "Supabase"],
      "githubUrl": "https://github.com/YOUR_USERNAME/portfolio",
      "liveUrl": "https://YOUR_DOMAIN",
      "imageUrl": "",
      "status": "In progress",
      "featured": true
    }
  ]
}
```

### CSV columns

- Skills: `name,category`
- Projects: `title,summary,description,tech,github_url,live_url` (`tech` may be separated with semicolons)
- Certificates: `title,issuer,issue_date,credential_url`
- Experience: `role,company,location,start_date,end_date,description`

Imports append rows for CSV datasets. Review all staged values, then press Save changes to publish them.

## 5. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Vercel detects Vite automatically. Build command: `npm run build`; output directory: `dist`.
4. Add the environment variables from the Supabase and LinkedIn steps above.
5. Deploy. Add your production domain to `LINKEDIN_REDIRECT_URI` and to the LinkedIn app's authorized redirect URLs, then redeploy.

The project uses Vercel serverless functions for LinkedIn OAuth. Use `npm run vercel:dev` (after installing the Vercel CLI with `npm i -g vercel`) to test those `/api` routes locally. Plain `npm run dev` runs the Vite frontend; the LinkedIn popup will not work against Vite's dev server alone.

## 6. Before publishing

- Replace the starter biography, headline, education details, and starter skills if you want different wording.
- Add only projects, certificates, dates, metrics, and experience you can verify. Empty sections intentionally show clean empty states.
- Add your GitHub URL, contact email, and résumé link in `/admin`.
- Test the public site and `/admin` in a private/incognito window to confirm that editing is protected.
- Keep `LINKEDIN_CLIENT_SECRET` private and rotate it if it is ever exposed.

## Tech stack

React 19 · TypeScript · Vite · React Router · Supabase Auth/Postgres/Storage · Vercel Functions · LinkedIn OpenID Connect
