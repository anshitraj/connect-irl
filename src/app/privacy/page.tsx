import { PublicShell } from "@/components/public-shell";
export const metadata = { title: "Privacy" };
export default function Page() {
  return (
    <PublicShell>
      <article className="legal-page">
        <span className="eyebrow">YOUR NETWORK BELONGS TO YOU</span>
        <h1>Privacy, in plain language.</h1>
        <p>
          Last updated 25 October 2026. This notice describes how this Connect
          IRL deployment handles your information. The deployment operator must
          add their legal identity and privacy contact before public launch.
        </p>
        <h2>What stays private</h2>
        <p>
          Your saved contact book, meeting notes, audio recordings, and
          follow-ups are private to your account. We do not sell these records
          or share them with event organizers. Guest records stay in this
          browser’s local storage; voice recordings use IndexedDB.
        </p>
        <h2>What you choose to share</h2>
        <p>
          You control whether your builder profile is public and whether it
          appears in discovery. Only add social links, city, and profile details
          you want to share. Uploaded avatars are stored publicly; do not upload
          private images. Public profiles and projects can be viewed by anyone
          with their link.
        </p>
        <h2>Cloud accounts</h2>
        <p>
          If you enter an X / Twitter handle, the app can request that account’s
          public photo from X. Founder profiles can use a supported public
          company-website icon, which is stored with profile images. These
          lookups do not verify account ownership or company affiliation.
        </p>
        <p>
          When you save another public profile to a signed-in workspace with a
          public profile of your own, that person can receive a connection
          receipt. It identifies your public profile and the receipt time. Your
          notes, chosen event, and contact book are not included. Private
          profiles do not send these receipts; blocks hide them in both
          directions.
        </p>
        <p>
          When configured, Supabase provides authentication, database storage,
          and file storage. OAuth sign-in shares the profile information
          permitted by your provider. Guest records are imported into a
          signed-in account only when you choose “Import device records”.
          Private cloud records are protected by ownership policies.
        </p>
        <h2>Camera, microphone, and location</h2>
        <p>
          QR camera frames are decoded on your device and are not uploaded.
          Microphone permission is requested only when you start a voice note.
          Voice notes are stored privately in Supabase when signed in and
          online, or locally otherwise. Map location access happens only when
          you use its location button. We do not track location in the
          background or share precise GPS coordinates. Optional venue check-ins
          expire after two hours.
        </p>
        <h2>External services</h2>
        <p>
          Maps request tiles from the configured provider, OpenFreeMap by
          default, which can receive your IP address. Clicking a social, map, or
          organizer link takes you to that service under its own policies. IBW
          Connect and Devcon links do not synchronize accounts or attendee
          lists. This application has no advertising trackers.
        </p>
        <h2>Your controls and retention</h2>
        <ul>
          <li>Export your workspace and contacts in Settings or My People.</li>
          <li>Edit or delete saved records and turn profile visibility off.</li>
          <li>Block or report a builder from their public profile.</li>
          <li>
            Clear cached device records in Settings. Use your browser’s
            site-data controls to remove all local data, including audio.
          </li>
          <li>
            Request permanent account deletion through Settings. Owned database
            records cascade on deletion. Stored files are removed by the
            deletion workflow.
          </li>
        </ul>
        <p>
          Records remain until you remove them or delete your account. Backup
          retention is governed by the deployment’s Supabase plan. Deployment
          operators should expire stale check-ins and remove orphaned uploaded
          files regularly. Local browser data is not application-level
          encrypted; use a device you trust.
        </p>
        <h2>Questions or requests</h2>
        <p>
          Contact the operator of this deployment for access, correction, or
          deletion requests. A verified contact address must be configured
          before public launch.
        </p>
      </article>
    </PublicShell>
  );
}
