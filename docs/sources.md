# Public sources and assets

Organizer sources checked 25 October 2026 (Asia/Kolkata):

- Devcon 8 India, 3–6 November 2026, Jio World Centre: https://devcon.org/en/travel-guide/ and https://tickets.devcon.org/
- India Blockchain Week, 1–2 November 2026, Fairmont Mumbai: https://indiablockchainweek.com/
- Solana Summit India, 2 November 2026, JW Marriott Mumbai Sahar: https://www.solanasummit.in/
- ETHGlobal Mumbai, 5–7 November 2026: dates and city from the organizer's event list at https://ethglobal.com/events (event page https://ethglobal.com/events/mumbai). The listing gives no venue; Jio World Convention Centre, BKC comes from a secondary calendar and must be confirmed against the organizer before the event. No organizer logo is shipped, so the app shows a text wordmark.
- IBW Connect: https://connect.indiablockchainweek.com/ (external link; no private data access)
- Devcon app: https://app.devcon.org/ (external link; no claimed integration)

Venue pins are approximate outdoor positions at the published venues. Directions use the official venue name and address, not invented travel times. Recheck sources before changing catalog data or planning travel. Future event dates should be updated in both src/lib/events.ts and the database.

Map style and attribution: https://openfreemap.org/quick_start/ . OpenFreeMap styles retain OpenMapTiles and OpenStreetMap attribution. Hosting/deployment operators should review the configured provider's usage terms.

Geist is loaded and self-hosted through Next.js font optimization. See https://github.com/vercel/geist-font for the font license. Lucide UI symbols use https://lucide.dev/license. The custom Connect IRL geometric mark and diagrams are original vector/CSS work. Ecosystem names are nominative references; no event sponsorship or partnership is implied. Ecosystem strip symbols are simple geometric illustrations, not licensed organizer logos.

Sample portrait imagery is from Unsplash, used as decorative illustrations under the Unsplash license (https://unsplash.com/license). Portraits do not depict the fictional named profiles or imply that the pictured people attend these events. Local optimized crops are in public/avatars:

- arjun.jpg: https://images.unsplash.com/photo-1500648767791-00dcc994a43e
- priya.jpg: https://images.unsplash.com/photo-1534528741775-53994a69daeb
- daniel.jpg: https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d
- sarah.jpg: https://images.unsplash.com/photo-1524504388940-b1c1722653e1

The user-supplied reference screenshots were used for design direction only. They are not used as the UI, backgrounds, or shipped assets. Kite branding and assets are not copied.

## Event branding — 26 October 2026

Organizer-provided logos are self-hosted in `public/brands` for event identification. Brand colors and artwork remain intact; Connect IRL's card backgrounds and orbit patterns are original. These marks identify independently listed conferences and do not imply sponsorship or endorsement.

- Devcon 8 India: `devcon.png`, [official site](https://devcon.org/en/), [original logo](https://devcon.org/_next/static/media/dc8-logo.d91527df.png).
- India Blockchain Week: `ibw.svg`, [official site](https://indiablockchainweek.com/), [original navigation logo](https://indiablockchainweek.com/assets/images/2026/demoday/logo-colored.svg).
- Solana Summit India: `solana-summit.svg`, [official site](https://www.solanasummit.in/), [original logo](https://www.solanasummit.in/images/v4/logo.svg).

Only event logos were downloaded. No organizer page layouts, attendee photos, sponsor lists, or other site assets were copied. SVGs were checked for scripts, embedded executable content, event handlers, and remote asset references before inclusion. Assets are served locally and cached after viewing for offline app use.

Camera/NFC implementation references: [MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [NDEFReader.scan and cancellation](https://developer.mozilla.org/en-US/docs/Web/API/NDEFReader/scan), and [NDEFReadingEvent](https://developer.mozilla.org/en-US/docs/Web/API/NDEFReadingEvent). Web NFC availability depends on browser/device support. The user referenced Algebra for the Google-first, three-step setup pattern; no Algebra assets or layouts were copied.

Additional social marks are self-hosted for identifying voluntarily shared links: GitHub, X, and Telegram from the [Simple Icons source collection](https://github.com/simple-icons/simple-icons/tree/develop/icons), LinkedIn from [Simple Icons v10](https://github.com/simple-icons/simple-icons/blob/10.0.0/icons/linkedin.svg), and the white Discord logo from its [official brand assets](https://discord.com/branding). The Discord asset is displayed on its blue background. Marks identify external profile links and do not imply a connected account, messaging integration, sponsorship, or affiliation. The profile-orbit illustration and short connection celebration are original Connect IRL CSS/vector work, inspired by the user's request for a friendlier, Discord-like feel.
