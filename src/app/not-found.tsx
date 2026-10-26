import { ButtonLink } from "@/components/ui";
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <span>404 / A MISSED CONNECTION</span>
      <h1>
        Let’s get you back
        <br />
        to your people.
      </h1>
      <p>This page may have moved, or it’s taking the scenic route.</p>
      <ButtonLink href="/">Back to Connect IRL ↗</ButtonLink>
    </main>
  );
}
