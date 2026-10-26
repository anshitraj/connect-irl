# Verification — 26 October 2026

Verified locally with Node.js 24.11.0, Next.js 16.4.3, React 19.3.1, and the locked dependencies.

| Check | Result |
| --- | --- |
| Optimized production build | Passed |
| Strict TypeScript check | Passed |
| ESLint application and test sources | Passed |
| Vitest unit/PostgreSQL tests | 62 passed |
| Playwright desktop/mobile journeys and Axe checks against optimized server | 48 passed |
| Production map/offline/loading tests | 3 passed |
| Email/session/two-account confirmation tests with local HTTP fixtures | 3 passed |
| npm production dependency audit (26 October) | 0 known vulnerabilities reported |

The PostgreSQL tests execute the actual migrations in PGlite with a Supabase-compatible auth/storage harness. They verify private record isolation, transactional rollback, stable contact identity, merging stale meeting histories, reminder remapping, safe cloud merges, storage folder ownership, public/private visibility, and database-backed rate limits.

The third migration is exercised with multiple authenticated identities. Tests verify pending requests, deduplicated updates, owner-only acceptance/decline, sender withdrawal, participant inbox isolation, rejection of forged direct writes, private-project summary limits before invitation acceptance, member read access without editing, role changes, leaving, revoked/declined invitations, anonymous denial, and blocks in both directions. Venue tests cover active/expired check-ins, public/discoverable visibility, search/ecosystem/role/goal filters, bounded pagination, and unknown-event rejection.

The fourth migration preserves the original SECURITY INVOKER transaction and stores the current event in private profile preferences. PostgreSQL tests verify event persistence, isolation from another account, unknown-event rejection, and atomic rollback.

The fifth migration verifies recipient-only, deduplicated connection receipts after a profile save, protection against forged inserts/direct updates, marking only your own receipt read, private-sender/import exclusion, and bilateral blocking. No private meeting notes or chosen event are included in a receipt. Unit tests also cover authenticated root redirects, refreshed-cookie preservation, forged/expired cookie rejection, anonymous landing entry without an auth round trip, and reuse of generated QR images.

The browser journeys cover real QR image decoding, generated profile QR display, profile onboarding, external contact saving, private note persistence after reload, grounded search, repeated saves without duplicate contacts, follow-up completion, project creation/editing/bookmarks, verified event links, unsupported NFC, guest offline saving, CSV import/edit/merge, and responsive route health. Axe found no automated WCAG A/AA violations on the five tested primary surfaces in desktop and phone viewports. These checks do not certify full accessibility.

Accessibility checks wait for the landing entrance to reach full opacity and for app screens to finish loading before evaluating contrast. This avoids checking only a loading placeholder or an arbitrary animation frame. The loaded-state checks identified and corrected faint NFC-mode text, the profile-preview link, the active scanner tab, and scanner help text. Contrast validation remains enabled.

New desktop and phone journeys cover request submission/withdrawal, owner acceptance, invitation acceptance, team listing, invitations, role editing, confirmed removal, failure recovery, venue filters, saving venue context, and client-side expiry. These use explicit API fixtures for UI transitions; authorization is covered by the real PostgreSQL tests above. Axe also found no automated A/AA violations in the populated collaboration inbox and venue results on both viewports.

The production PWA test reloads a previously visited contact book while offline, saves another contact, reconnects, and verifies both persisted records. The map test loads the self-hosted MapLibre worker and actual OpenFreeMap vector tiles, checks all three venue markers, and opens the Devcon venue popup.

The mobile map fix retains provider-generated attribution in a separate footer instead of covering the canvas. The regression check reproduced the original overlap before the change, then passed at 390 px and 1440 px widths. It verifies attribution and the privacy caption sit below the map without horizontal overflow, and map/list remounting keeps a single credit block without runtime errors. Navigation controls have larger touch targets and visible keyboard focus.

The visual polish pass verifies all three self-hosted organizer logos load, event bookmarks survive reload, saved/search filters and empty states work, event details retain their logo, mobile layouts do not overflow, and reduced-motion mode disables page/card/scanner effects. Automated Axe checks include the populated event directory. Page and card entrances retain full-opacity text throughout. Event assets use explicit dimensions to reserve their layout space; hover feedback is limited to devices with a precise pointer. Screenshots are generated for desktop and phone views.

The scan-first pass adds six journeys on each viewport. Camera/NFC API fixtures verify one-tap automatic startup, shared-profile lookup and immediate saving, event/timestamp recording, duplicate callback suppression, NFC cancellation, permission denial, image fallback, and release of camera tracks when permission resolves after navigation. Real generated QR images exercise the lazy decoder, including a finder-pattern regression handled by a bounded pure-matrix fallback. Other checks verify three-step setup, branded event selection, optional social links, top-bar My QR, returning to Settings without repeating onboarding, and persistent profile edits. Hardware fixtures do not establish physical-device scanning performance.

The new profile orbit and short step/save animations use CSS transforms and respect reduced motion. Social and event logos are self-hosted; optional additional links remain collapsed during setup. Two-minute setup and sub-ten-second connections are product targets, not timings established by automated fixtures.

The Connect IRL pass introduces dark forest navigation, onboarding/scan panels and a dark landing story section alongside light reading/editing areas. The complete desktop/mobile suite passes with contrast checking enabled. The new paired-profile/checkmark success state also passes scoped Axe checks on both viewports, has immediately enabled actions, and disables its sequence under reduced motion. Successful saves scroll that confirmation into view without waiting for the animation.

`npm run test:auth` runs three account journeys against a local Supabase-compatible HTTP fixture on ports 4400/4401. Tests exercise the real browser/server auth clients and Next.js routes: invalid-code rejection, valid email-code sign-in, resend cooldown, first-time onboarding, signed-in root/login redirects, and two independent account contexts. One account displays its QR while another scans and syncs; the recipient then receives the named connection animation and can mark it read. The populated incoming confirmation also passes scoped Axe checks. This fixture validates application wiring; the real trigger/RLS behavior is tested separately in PostgreSQL. It does not send real emails or validate hosted Supabase/Resend delivery.

A warm local production landing check rendered the headline in approximately **434 ms**, with approximately **476 kB** transferred and **zero third-party requests** in unconfigured guest mode while browser suites were also running. This is a local observation, not a Lighthouse score or a guarantee for mobile networks. Scanner and map code remain deferred from the landing page.

Hosted Supabase Auth/Storage, real OAuth provider redirects, real Resend delivery/DNS configuration, a two-account hosted cloud collaboration/presence journey, hardware camera/NFC/torch/microphone behavior, and physical Safari/Firefox/iOS testing are not verified. Supabase/OAuth credentials were not present. Apply all five migrations and configure the environment as described in README.md and docs/resend-setup.md before hosted-account testing. No production deployment or domain/DNS changes were made.
