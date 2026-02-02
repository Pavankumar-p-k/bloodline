Vercel deployment steps

1. Connect GitHub repo to Vercel (https://vercel.com).
2. In Vercel project settings, set environment variables:
   - For backend (if deploying separately): set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service role) securely.
   - For frontend: set `NEXT_PUBLIC_API_URL` to your backend URL.
3. Build & output:
   - Frontend: framework `Next.js` (Next 16), build command: `npm run build`, output directory: (default for Next)
4. If you prefer CLI deployment, install Vercel CLI and run `vercel --prod` and follow the interactive prompts.

Notes:
- Do NOT commit secret keys to the repo. Use Vercel Environment Variables or GitHub Secrets.
- If you want me to run the Vercel CLI here, provide a Vercel token or run the CLI interactively in your terminal and paste any prompts/output you want me to act on.
