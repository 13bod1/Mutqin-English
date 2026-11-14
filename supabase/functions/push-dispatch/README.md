# Supabase Edge Function: push-dispatch

Web Push notification dispatcher service for Mr. Adel Mostafa Academy.

## Architecture & Security Contracts
- **Runtime**: Deno runtime on Supabase Edge Functions with pinned `npm:web-push@3.6.7`.
- **Authentication**: Caller must pass `Authorization: Bearer <JWT>`. Verified via GoTrue (`supabase.auth.getUser`).
- **Authorization**: Caller profile must have role `'admin'` or `'super_admin'`. Students and assistants are rejected with `403 Forbidden`.
- **SSRF Prevention**: Subscriptions are validated against strict allowed Web Push gateways:
  - `fcm.googleapis.com` (Google FCM)
  - `updates.push.services.mozilla.com` (Mozilla WebPush)
  - `notify.windows.com` (Microsoft WNS)
  - `web.push.apple.com` and `*.push.apple.com` (Apple WebPush)
  - Loopbacks, private subnets (RFC 1918), link-local (`169.254.*`), and plain HTTP are strictly rejected.
- **Cleanup**: Push endpoints returning `410 Gone` or `404 Not Found` are automatically deleted from `public.push_subscriptions`.
- **Secrets Isolation**: `VAPID_PRIVATE_KEY` resides strictly on the server and is never exposed to the client or browser.

## Required Environment Variables
Configure these in Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service_role secret key
- `VAPID_PUBLIC_KEY`: VAPID application public key
- `VAPID_PRIVATE_KEY`: VAPID application private key
- `VAPID_SUBJECT`: `mailto:admin@adelmostafa.com`

## Deployment
```bash
supabase functions deploy push-dispatch
```
