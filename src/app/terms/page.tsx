import { PublicShell } from "@/components/public-shell";
export const metadata = { title: "Terms" };
export default function Page() {
  return (
    <PublicShell>
      <article className="legal-page">
        <span className="eyebrow">GOOD CONNECTIONS START WITH RESPECT</span>
        <h1>A few ground rules.</h1>
        <p>
          Last updated 25 October 2026. These are product usage terms for this
          deployment. The operator must add their legal identity, contact
          details, and jurisdiction and obtain appropriate legal review before a
          public launch.
        </p>
        <h2>Be a good connection</h2>
        <p>
          Share accurate information you have permission to publish. Do not
          impersonate people, harass attendees, distribute malicious links,
          scrape private data, or use Connect IRL for unsolicited bulk
          outreach. Respect other people’s privacy and their decision not to
          connect.
        </p>
        <h2>Your content</h2>
        <p>
          You retain ownership of your profile, projects, and notes. You grant
          the deployment permission to store and display content according to
          your visibility settings. Do not publish confidential information or
          material you do not have the right to share.
        </p>
        <h2>Conference information</h2>
        <p>
          Connect IRL is independent of the events and ecosystems listed. Dates
          and venues are linked to official sources, but may change. Confirm
          travel, tickets, and venue access directly with the organizer.
          Check-ins do not establish that a person is actually at a venue.
        </p>
        <h2>Availability and backups</h2>
        <p>
          Device capabilities, internet access, and third-party services affect
          availability. Guest information is stored in this browser and may be
          lost if you clear site data or change devices. Keep exports of records
          you need. Do not rely on in-app follow-ups as guaranteed time-critical
          notifications.
        </p>
        <h2>Moderation and account removal</h2>
        <p>
          The deployment operator may restrict abusive or misleading public
          content after review. You may remove your data and request account
          deletion in Settings. Use report controls for harmful profiles.
        </p>
        <h2>External links</h2>
        <p>
          External services have their own terms. A link is not an endorsement,
          partnership, or active integration. Connect IRL does not send
          messages on your behalf without a separate explicit action.
        </p>
      </article>
    </PublicShell>
  );
}
