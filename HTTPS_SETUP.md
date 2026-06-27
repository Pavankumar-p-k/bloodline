# HTTPS Setup for Geolocation

The live location system (Phase 6) and map features (Phase 5) rely on the Geolocation API, which requires a **secure context (HTTPS)** in production.

## Local Development

For local dev with HTTPS, use the `--experimental-https` flag (Next.js 13+):

```bash
npx next dev --experimental-https
```

This generates a self-signed certificate automatically. Your browser will show a warning — proceed past it.

## Production (Vercel)

Vercel provides HTTPS automatically for all deployments. No additional setup is needed.

## Production (Self-hosted)

If hosting elsewhere:

1. Obtain an SSL certificate (Let's Encrypt via Certbot, or a commercial CA)
2. Configure your reverse proxy (Nginx, Caddy) to terminate TLS
3. Ensure all API calls to Supabase use `https://` (they use `NEXT_PUBLIC_SUPABASE_URL`)

## Verifying

After HTTPS is configured:

1. Open browser DevTools → Console
2. Run `navigator.geolocation.getCurrentPosition(() => console.log("OK"), (e) => console.error(e))`
3. If you see a permission prompt, HTTPS is working correctly

## Why HTTPS is Required

Browsers block the Geolocation API on insecure origins (`http://`) for privacy reasons. All modern browsers enforce this.
