import Link from "next/link";
import { Brand, ButtonLink } from "./ui";
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="public-header">
        <Brand />
        <ButtonLink href="/app" variant="secondary">
          Open my workspace ↗
        </ButtonLink>
      </header>
      <main id="main" className="public-main">
        {children}
      </main>
      <footer className="public-footer">
        <span>© {new Date().getFullYear()} Connect IRL</span>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </>
  );
}
