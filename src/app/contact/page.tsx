import { PublicShell } from "@/components/public-shell";
import Link from "next/link";
export const metadata = { title: "Contact" };
export default function Page() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const valid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return (
    <PublicShell>
      <article className="legal-page">
        <span className="eyebrow">LET’S KEEP THE CONVERSATION GOING</span>
        <h1>Hello, again.</h1>
        <p>
          For product questions, accessibility feedback, privacy requests, or
          support, contact the operator of this Connect IRL deployment.
        </p>
        {valid ? (
          <p style={{ marginTop: 24 }}>
            <a href={`mailto:${email}`}>{email}</a>
          </p>
        ) : (
          <p style={{ marginTop: 24 }}>
            A public support address has not yet been provided for this
            deployment. Account data controls are available in Settings, and
            profile reports can be submitted from a public builder profile when
            signed in.
          </p>
        )}
        <h2>Your data, your control.</h2>
        <p>
          You can export records, manage visibility, and request account
          deletion from your workspace settings.
        </p>
        <p style={{ marginTop: 20 }}>
          <Link href="/app/settings">Open workspace settings ↗</Link>
        </p>
      </article>
    </PublicShell>
  );
}
