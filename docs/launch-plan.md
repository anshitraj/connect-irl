# Connect IRL launch plan

Brand and production domain: **Connect IRL**, **https://connectirl.xyz**. Agreed foundation: Vercel + Supabase + Resend for verification email. Reviewed 26 October 2026 (Asia/Kolkata).

## Services

| Part | Choice | Status |
| --- | --- | --- |
| Website, desktop app, mobile PWA, Next.js API | Vercel | Code builds locally; deployment pending |
| Login, PostgreSQL database, private workspace sync | Supabase | Implemented; project/environment configuration pending |
| Avatars and private audio files | Supabase Storage | Buckets and ownership policies included in migrations |
| Continue with Google | Google OAuth through Supabase | Google Cloud OAuth client and provider setup pending |
| Email verification/sign-in | Supabase six-digit OTP through Resend SMTP | Flow and branded template implemented; domain/SMTP setup pending |
| Map renderer and map tiles | MapLibre + OpenFreeMap | Implemented; provider credits remain visible below the map |
| QR decoding | On-device browser APIs with lazy ZXing fallback | Implemented; real-phone performance validation pending |
| Public URL | https://connectirl.xyz on Vercel | Domain purchased; Vercel/DNS mapping pending |

This app's existing Next.js route handlers run with the Vercel deployment. There is no separate Go/Python scanning service to operate. Google sign-in uses Supabase's OAuth flow; it does not require application access to users' Gmail or contacts. Social profile URLs are ordinary shared links and need no social-network API keys.

## Required configuration, in order

1. Put the source in a Git repository and connect it to Vercel, or deploy through Vercel CLI. Set the framework to Next.js with the default build output. `npm ci` runs the existing postinstall script that prepares the map worker. Choose a Vercel function region near the Supabase database when configuring hosting.
2. Create the Supabase project. Apply all five files in `supabase/migrations/` in filename order, then `supabase/seed.sql`. Migrations include the avatar/audio buckets, private-record RLS, rate limits, collaboration, venue presence, current-event preferences, and private connection receipts. The seed contains public events, not attendee accounts. If the first four were already applied, apply only the new `202610260005_connection_receipts.sql` migration.
3. Set Vercel environment variables from `.env.example`: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_CONTACT_EMAIL`. `NEXT_PUBLIC_MAP_STYLE` is optional. The service-role key is only used for deleting the signed-in user's account/files; never prefix it with `NEXT_PUBLIC_`.
4. In Google Auth Platform, configure branding/audience, a web OAuth client, and the callback URL shown by Supabase: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`. Put the Google client ID and secret in Supabase's Google provider settings. Prepare the consent app for the intended public audience rather than leaving access limited to development testers.
5. In Supabase Auth, set Site URL to the stable production origin and allow `https://YOUR_DOMAIN/auth/callback`. Add exact localhost/staging callbacks only where needed. Rebuild/redeploy after changing public environment variables. Confirm login returns to the same origin and the first profile goes through onboarding only once.
   Configure Resend using [resend-setup.md](resend-setup.md). Use the branded token template in `supabase/templates/magic-link.html`. Signed-in visits to `/`, `/login`, and `/signup` redirect to `/app` after server-side user verification, preserving refreshed session cookies. Signed-out visitors see the landing page.
6. Supply the actual operator identity, support/privacy email, and applicable jurisdiction for the existing privacy/terms pages; review those pages for the real deployment. Review database backup/restore arrangements and file retention in Supabase before inviting attendees.
7. Test the deployed HTTPS app with two independent accounts on real phones: Google login, three-step setup, public QR display, cross-account QR save, event/time persistence, private-note isolation, offline save/reconnect, and later profile edits. Test NFC on a compatible browser/device and verify the QR fallback elsewhere. Measure the two-minute setup and ten-second connection targets here; local fixtures cannot establish those timings.

## Add only when needed

- **Email reminders:** Resend is the chosen verification-mail provider. Scheduled follow-up email reminders would require additional scheduling/delivery work; they are not sent by the current in-app reminder feature. Google OAuth does not require a separate email-code step.
- **GitHub OAuth:** configure a GitHub OAuth client only if enabling the alternate GitHub sign-in method. A GitHub profile URL does not require OAuth.
- **Error monitoring:** start with Vercel/Supabase logs; add a service such as Sentry if needed. Keep private notes, tokens, and contact records out of logs.
- **Scheduled email/push reminders or realtime presence:** separate future work. Current follow-ups are in-app, and venue discovery uses explicit refresh/expiry. Extra messaging, queue, and realtime services are not launch dependencies for the current behavior.

No deployment, hosted migration, cloud project provisioning, or OAuth setup has been performed in this workspace. Local verification is recorded in [verification.md](verification.md).

## Official references

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Google sign-in with Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [OpenFreeMap setup and attribution](https://openfreemap.org/quick_start/)
