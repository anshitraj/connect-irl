# Connect IRL

A real conference contact app and public website, built with Next.js App Router, React, strict TypeScript, Tailwind, Radix Dialog, Motion, and Supabase. The phone PWA and desktop interface share one codebase and backend.

## Run locally

Requires Node.js 22.13+ (tested with 24.11) and npm.

`npm ci` also prepares the self-hosted MapLibre worker from the installed package. If your environment disables lifecycle scripts, run `node scripts/copy-map-worker.mjs` before starting or building.

```powershell
cd E:\mumbai-event
npm ci
npm run dev
```

Open **http://localhost:3000**. The application is at **/app**. It works without credentials as a private guest workspace. To explore illustrative content, explicitly open **/app?demo=1**. Sample records are stored separately and excluded from cloud sync. No imaginary users are seeded into public discovery.

To run the optimized build:

```powershell
npm run build
npm start
```

## Genuinely implemented

- One responsive marketing page, real generated QR showcase, interactive stepper, discovery filters, event cards, FAQ, and reduced-motion support.
- A focused sidebar and mobile navigation, top-bar **My QR**, and one-tap scan entry. Extra discovery/team/map tools are tucked under **Explore more**; contact import/export lives under **More options**.
- Profile creation, editing, visibility settings, public profile routes, vCard and QR downloads, native share and clipboard fallbacks.
- **Add connection opens the camera automatically.** Native BarcodeDetector decodes on-device with a lazy ZXing fallback; camera switching, supported torch controls, QR-image fallback, clear permission errors, and cleanup on leaving/backgrounding are included. Shared profiles save automatically without a blank entry form. An external QR stores its actual hostname and URL; no person's name is invented.
- **Tap NFC reads a shared NDEF profile URL** on supporting devices and uses the same immediate save flow. Unsupported browsers fall back to QR. Scanning no longer presents tag-writing setup.
- Google-first sign-in UI with other methods hidden until requested. New accounts complete three profile steps once; returning accounts bypass onboarding. GitHub, LinkedIn, X/Twitter, Website, and Telegram links remain editable through **Settings → Edit profile & links**. Live OAuth requires backend/provider configuration.
- Social logos, one-tap branded event choices, an original animated profile orbit, short step transitions, and a brief save celebration. Optional extra links (including Discord) stay tucked away during setup. Motion is finite and respects reduced-motion settings. The two-minute setup and sub-ten-second connection goals are UX targets, not guarantees for provider redirects, network conditions, permissions, or physical devices.
- A private, remembered current-event selector. Each new connection records that event and a UTC meeting timestamp automatically; the timeline displays the meeting time. Event selection does not publish a venue check-in. Migration `202610260004_current_event.sql` keeps this preference in the existing atomic sync transaction.
- Connect IRL branding for `https://connectirl.xyz`, verified-session redirects from the root into `/app`, and one design combining dark forest navigation/scanner panels with light editing areas. Existing device data keys remain compatible.
- Email sign-in through Supabase Auth, prepared for Resend SMTP: a one-tap sign-in link, with a six-digit code in the same email as backup (autofill/paste, invalid-code errors and resend cooldown). Setup and the branded email template are in [docs/resend-setup.md](docs/resend-setup.md).
- Immediate paired-profile/checkmark success animation for QR and NFC saves; controls stay usable during the animation. QR generation is warmed and bounded in-memory caching avoids repeated work.
- Private recipient connection activity after cloud sync. Migration `202610260005_connection_receipts.sql` creates one receipt per account pair, with bilateral blocks, public-profile checks, a sending limit, and no private meeting context. While sharing My QR, the recipient checks for new receipts every two seconds and gets a matching success animation. Other views check less frequently and on focus; this is not instant push delivery or automatic reciprocal contact saving.
- Persistent guest contacts, editable identities, safe record merging, private meeting timelines, editable notes, downloadable voice recordings, tags, starred/archived contacts, deletion, contextual deterministic search, CSV/vCard import, CSV/vCard/JSON exports.
- Contact deduplication by profile or exact supplied public link. Guest-to-account import merges context and remaps reminders. PostgreSQL reconciles separately saved profile IDs and preserves unseen meetings from stale offline copies.
- Real project creation/editing, private/public visibility, public resource URLs, paginated discovery, local/cloud bookmarks, founder links, and saving the founder as a contact.
- Private collaboration inbox with received/sent requests, acceptance/decline/withdrawal, consent-based team invitations, team rosters, owner-managed role labels/removal, and voluntary leaving. Accepted members can view private projects; editing stays with the owner.
- Verified event catalog, organizer links, directions, downloadable calendars, bookmarks, actual lazy MapLibre maps, opt-in expiring venue check-ins, event submissions awaiting moderation.
- Organizer logos for Devcon, India Blockchain Week, and Solana Summit across dashboard cards, the directory, event pages, landing examples, and map popups. Saved-event filtering, larger mobile text/touch targets, staggered card entrances, restrained hover/scan feedback, and dialog transitions respect reduced motion. Brand assets are self-hosted and cache after viewing.
- Venue discovery on event pages and **Discover → At a venue**, with event, search, ecosystem, role, and collaboration-goal filters, pagination, manual refresh, automatic expiry, and contextual contact saving. Only active, public, discoverable profiles appear; blocks apply in both directions.
- Follow-up creation, scheduling, completion/reopening, date changes, editable grounded message drafts, copying and external social links. No automatic messages are sent.
- Actual Supabase SSR auth, magic-link/Google/GitHub code, protected APIs, transaction-based sync outbox, per-account local caches, RLS, input validation, database rate limits, safe upload validation, private audio storage, report/block controls, server-only deletion and moderation workflows.
- Installable PWA manifest/icons, scoped service worker, cached data-free app shells/static assets, local offline saves, reconnection sync and explicit sync/error states. APIs and public-profile HTML are never cached by the service worker.

## Configure the shared backend

See [the Vercel + Supabase launch plan](docs/launch-plan.md) for the final service choices, setup order, and remaining hosted/phone checks.

1. Create a Supabase project. Do not put secrets in chat or source control.
2. In the project's SQL Editor, run every SQL file in `supabase/migrations/` in filename order, then `supabase/seed.sql`. Alternatively, apply them through your normal Supabase migration workflow. The seed contains only verified public events and venue coordinates.
3. Copy `.env.example` to `.env.local` and set:

| Variable                               | Use                                                           |
| -------------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | This site's exact origin, e.g. `https://your-domain.example`  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your Supabase project URL                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project publishable key; RLS protects all data                |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server only, used exclusively by account/file deletion        |
| `NEXT_PUBLIC_MAP_STYLE`                | Optional MapLibre style URL; defaults to OpenFreeMap Positron |
| `NEXT_PUBLIC_CONTACT_EMAIL`            | Operator's public support/privacy address                     |

4. In Supabase Auth, set the Site URL to `https://connectirl.xyz`. Add `http://localhost:3000/auth/callback` and `https://connectirl.xyz/auth/callback` to allowed redirect URLs. OAuth and email sign-in links use the PKCE callback; the backup email code is entered directly in the app.
5. Enable Email sign-in. Configure Resend SMTP, six-digit OTPs, the supplied email template (in both the Magic Link and Confirm signup slots), and appropriate email/auth limits using [the Resend setup guide](docs/resend-setup.md).
6. Enable Google and GitHub providers with credentials from their respective developer consoles. The OAuth callback registered **with each provider** is `https://YOUR_PROJECT.supabase.co/auth/v1/callback`. Supabase redirects back to this app's `/auth/callback` afterward.
7. Restart the development server after changing environment variables. Rebuild when public environment variables change.
8. Sign in, publish a profile, wait for **All changes synced**, then open its URL in a separate private browser to verify cross-device publication.
9. To migrate existing guest records, explicitly choose **Settings → Import device records**. Guest data is not silently uploaded.

The avatar bucket is public and limited to 2 MB JPEG/PNG/WebP images; the upload API checks file signatures. The voice-note bucket is private and limited to 8 MB. Voice recording works locally without a transcription service. Cloud audio requires its parent contact to have synced; signed URLs expire after an hour and are refreshed when the view reloads.

## Deploy on Vercel

1. Put this directory in a Git repository and import it into Vercel as a Next.js project.
2. Set the environment variables above in the Vercel project. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only, with no `NEXT_PUBLIC_` prefix.
3. Apply the migration and seed to the production Supabase project before enabling cloud mode.
4. Set the production domain in Supabase Auth and both OAuth provider consoles, then deploy with build command `npm run build`.
5. Use HTTPS. Camera, microphone, NFC, clipboard, and service-worker support depend on secure browser contexts. `localhost` is suitable for local testing; plain HTTP LAN IP addresses usually are not suitable for camera testing on a phone.
6. Test two independent accounts, public profile publication, private-note isolation, QR scans on real phones, upload permissions, and offline reconnection against that deployment.
7. Add the actual operator identity, support email, jurisdiction, and reviewed legal wording to the privacy/terms pages before inviting the public.

No deployment was made and no Supabase project or OAuth credentials were provisioned during this build.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

`npm test` runs real PostgreSQL semantics in PGlite plus unit tests. Its harness supplies Supabase-compatible auth/storage schemas so the actual migration, RLS policies, ownership checks, transaction rollback, private audio paths, identity reconciliation, and rate limit can run without cloud credentials. This does not substitute for testing hosted Supabase Auth or Storage.

The collaboration and presence browser tests use explicit API fixtures to verify interface transitions without inventing live users in the app. Separate PostgreSQL tests execute the actual collaboration and presence functions with different authenticated roles, including forged-write rejection, consent before membership, private-project access, invitation revocation, bilateral blocks, expiry, and discovery filters.

Playwright covers desktop and phone layouts, onboarding, top-bar QR display, real QR image decoding, automatic external-link saves, notes surviving reload, grounded search, duplicate prevention, projects/editing/bookmarks, event directions, unsupported NFC, local offline saves, and route health. Camera/NFC API fixtures additionally verify automatic startup, tag reading, duplicate callback suppression, permission denial, and cleanup of late camera permission. These fixtures do not replace physical-device testing. Axe checks the landing, dashboard, profile editor, scanner, login, and new success states for automated WCAG A/AA violations.

`npm run test:auth` starts local Supabase HTTP fixtures and a separate Next.js development server to check email-code verification, invalid codes, returning-account redirects, new-user onboarding, and two-account synced connection confirmations. It uses isolated test accounts and no real email delivery; hosted Supabase and Resend still need verification.

For a **production** service-worker/offline check, keep an optimized server running on port 4000:

```powershell
npm run build
npm start -- --port 4000
# In another terminal:
npx playwright test --config playwright.production.config.ts
```

To run the main journeys against that optimized server:

```powershell
$env:TEST_BASE_URL = 'http://localhost:4000'
npm run test:e2e
```

## Operational details and limits

- Guest records are browser-local, not an account or publicly hosted profile. Clearing site data can remove them. Local storage is not encrypted; use a trusted device. Account caches are separated by user ID.
- Sync batches are authenticated, ownership checked and atomic. The client queues changed records and explicit deletions, never claims sync before acknowledgement, and retains failed changes for retry. Scalar edits to the same record use last accepted write; meeting histories merge by stable meeting ID. Team-based real-time co-editing is not implemented.
- The service worker caches an explicit allowlist of data-free app shell routes and static files only. Previously visited views/chunks can reopen offline; features not previously loaded, fresh public-profile lookups, fresh map tiles, publishing, and authentication require a connection. Local audio made offline is device-only; it is **not** silently migrated into cloud audio.
- Maps show approximate public venue locations, not attendee GPS positions, indoor routes, or fabricated travel times. `event_zones` is deliberately unseeded without authoritative floor-plan/zone data. A provider URL can be changed; attribution is retained.
- Venue check-ins are opt-in, require a public discoverable profile, expire in two hours and can be turned off. Browsing requires sign-in. There is no background tracking; refresh shows early departures, while expiry removes visible results automatically. The map locates venues rather than individual builders.
- Event submissions and reports persist with pending status. `supabase/admin.sql` describes the protected SQL-Editor moderation workflow; regular clients cannot approve them. To publish an approved event, verify organizer details and update both the database and the shared `src/lib/events.ts` catalog in a deployment. The event catalog is versioned, not an automatic third-party feed.
- IBW Connect and Devcon are external links only. No ticket-gated attendee data is scraped, no accounts are falsely marked connected, and no messaging integrations are claimed.
- Collaboration is available at **/app/collaboration** and on project pages after Supabase setup. Apply `202610250003_collaboration_presence.sql` after the first two migrations. Requests require a public builder profile; invitations target a public username. Invitations intentionally share a small project summary before acceptance. Inbox history shows up to 200 recent records. Roles describe affiliation and grant no editing privileges. Notifications remain inside the app; email/social messages are never sent automatically.
- Semantic/LLM search, voice transcription, email/push reminders, authorized third-party attendee APIs, native phone apps, and indoor routing are not enabled. Search and message drafts are deterministic and grounded in saved data.
- Camera/NFC/torch/recording functionality needs verification on actual Android/iOS devices. Hardware support varies; QR image upload is the scanner fallback. Automated browser tests use Chromium desktop/mobile viewports, not physical iPhones. Safari/Firefox manual QA remains.
- Hosted OAuth, real two-account Supabase journeys, production file deletion and hosted storage policies remain unverified until credentials are configured. The app does not pretend those services are live.
- `src/instrumentation.ts` is a sanitized server error adapter. Attach your monitoring provider there without sending private note bodies, auth cookies, or request payloads.

## Sources and asset rights

Event organizer sources and asset details are recorded in `docs/sources.md`. Ecosystems are audiences, not sponsors or partners. People and projects in the sample workspace are explicitly fictional product examples. Their stock portraits do not identify actual event attendees.
