# Easy onboarding and profile photos

Connect IRL setup is **You → Your links → Your event**. Only a name, one or more roles, a valid X username, and an event choice are required for a new profile. “Not attending an event yet” is an explicit valid event choice. LinkedIn, GitHub, company details, Website, Telegram and Discord are optional. Company fields appear for founders; GitHub appears directly for developers/engineers and is available under extra links for others. The profile address is generated from the X handle plus a stable account suffix, rather than asking a second username question. Existing profiles still load and can edit the address/details in Settings.

Profiles retain the legacy `role` field as their primary role and add an optional `roles` array. Migration `202610260006_multi_role_profiles.sql` makes venue discovery match any selected role while preserving old single-role profiles. Apply this after migrations 001–005. Company data is an optional object inside the existing owner-controlled profile JSON; it needs no additional table/bucket.

## X / Twitter photo

Set **`X_BEARER_TOKEN`** in `.env.local` for local development or Vercel's server environment for deployment. Use the app bearer token from your X developer project with access to user lookup, rather than exposing a consumer API key in a `NEXT_PUBLIC_` variable. Restart/redeploy after changing environment values. No credential has been provisioned in this workspace.

After sign-in, the social step debounces a valid handle and calls the authenticated, rate-limited `POST /api/profile-lookup` endpoint. The server calls X's official `GET https://api.x.com/2/users/by/username/{username}?user.fields=profile_image_url` using bearer authentication. Only the matching username and its HTTPS `pbs.twimg.com/profile_images/` image URL are returned. The server caches bounded public-photo results for ten minutes and never sends the bearer token to the browser. Changing the handle cancels stale client requests. A failed lookup or failed image load leaves a usable initials/previous-photo fallback and does not block finishing.

Photo lookup is **not** X OAuth or proof of account ownership. Social links and photos remain user-supplied public profile information. The app does not label them verified. Existing manually uploaded photos are retained unless the person chooses to use the X photo.

## Company website icon

For founders, a public HTTPS company website triggers a best-effort lookup of conventional favicon/apple-touch-icon paths. Supported PNG/JPEG/WebP images, including PNG entries inside ICO files, are saved to the signed-in account's folder in the existing public `avatars` bucket. The preview and public company card label this as a website icon, rather than claiming it is an official brand logo. A LinkedIn-only company address uses initials; no LinkedIn account data or logo is fetched.

Requests reject credentials, custom ports, IP literals, local/private/special-use DNS answers, oversized bodies, and executable SVG/HTML. The TLS request pins the validated public DNS address and does not follow redirects. It has byte, dimension, and time limits. Missing/unsupported icons use company initials. Auth, origin validation, and the existing database rate limit run before lookup or upload. This is a best-effort feature and cannot guarantee an icon for every website.

## Verification

Unit tests cover handle normalization, role compatibility, generated addresses, API authentication, secret handling, unconfigured X access, public-address checks, DNS pinning, icon formats and account-owned image uploads. PostgreSQL tests exercise the actual multi-role migration. Local browser fixtures verify conditional fields, automatic photo previews, optional fields left blank, persistence, and unavailable-photo completion. Real X API access and hosted company-icon storage still need verification with configured credentials and Supabase.

Primary reference checked 26 October 2026: [X user lookup API](https://docs.x.com/x-api/users/get-user-by-username).
