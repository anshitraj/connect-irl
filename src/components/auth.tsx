"use client";
import { browserSupabase, cloudConfigured } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SocialLogo } from "./social-logo";
import { Brand, Button, ButtonLink } from "./ui";
export function Auth({ signup = false }: { signup?: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [sentAt, setSentAt] = useState(0);
  const router = useRouter();
  const sb = browserSupabase();
  useEffect(() => {
    if (!sentAt) return;
    const tick = () =>
      setRemaining(
        Math.max(0, Math.ceil((sentAt + 60000 - Date.now()) / 1000)),
      );
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sentAt]);
  const sendCode = async () => {
    if (!sb || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSent(true);
      setToken("");
      setSentAt(Date.now());
      setRemaining(60);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t send your code. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const oauth = async (provider: "google" | "x") => {
    if (!sb) return;
    sessionStorage.removeItem("buildermatch.demo");
    setBusy(true);
    setError("");
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };
  return (
    <main id="main" className="auth-layout">
      <section className="auth-story">
        <Brand light />
        <div>
          <span className="eyebrow">EVERY HELLO IS A BEGINNING.</span>
          <h1>
            Your next great
            <br />
            connection
            <br />
            <span>starts here.</span>
          </h1>
          <p>
            The people. The projects. The conversation you don’t want to forget.
            Keep the good stuff.
          </p>
          <div className="auth-story-tags">
            <span>
              <Check size={14} />
              No wallet required
            </span>
            <span>
              <Check size={14} />
              Your network stays yours
            </span>
          </div>
        </div>
        <span className="auth-story-footer">
          Built for the builders. And the possibilities between them.
        </span>
      </section>
      <section className="auth-form-side">
        <Link className="back-link" href="/">
          <ArrowLeft size={14} />
          Back to Connect IRL
        </Link>
        <div className="auth-form">
          <span className="auth-logo">
            <Brand compact />
          </span>
          <h2>
            {sent
              ? "Check your inbox."
              : signup
                ? "Make a good hello last."
                : "Welcome back, builder."}
          </h2>
          <p>
            {sent
              ? `We emailed a sign-in link to ${email.trim()}. Open it in this browser to sign in, or enter the 6-digit code from the same email.`
              : signup
                ? "Continue with Google, then finish three quick profile steps."
                : "Your people and possibilities are right where you left them."}
          </p>
          <Suspense fallback={null}>
            <ExpiredLinkNotice />
          </Suspense>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {sent ? (
            <>
              <span className="email-sent-icon">
                <Mail size={36} />
              </span>
              <form
                className="form-stack email-code-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!sb || busy) return;
                  setBusy(true);
                  setError("");
                  try {
                    const { data, error } = await sb.auth.verifyOtp({
                      email: email.trim(),
                      token,
                      type: "email",
                    });
                    if (error) throw error;
                    if (!data.session || !data.user)
                      throw new Error(
                        "That code could not verify your email. Request a new one.",
                      );
                    sessionStorage.removeItem("buildermatch.demo");
                    const { data: profile, error: profileError } = await sb
                      .from("profiles")
                      .select("id")
                      .eq("id", data.user.id)
                      .maybeSingle();
                    router.replace(
                      profile || profileError ? "/app" : "/app/profile",
                    );
                    router.refresh();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "That code has expired or is incorrect. Try again.",
                    );
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Verification code
                  <input
                    className="email-code-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    required
                    value={token}
                    onChange={(event) =>
                      setToken(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder="000000"
                  />
                </label>
                <Button type="submit" disabled={busy || token.length !== 6}>
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  Verify & continue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || remaining > 0}
                  onClick={() => void sendCode()}
                >
                  {remaining > 0
                    ? `Resend email in ${remaining}s`
                    : "Resend email"}
                </Button>
              </form>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setSent(false);
                  setError("");
                  setToken("");
                }}
              >
                Use a different email
              </Button>
            </>
          ) : (
            <>
              <div className="oauth-buttons">
                <Button
                  className="google-primary"
                  disabled={busy || !cloudConfigured}
                  onClick={() => void oauth("google")}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </div>
              <details className="auth-more-methods">
                <summary>Other ways to sign in</summary>
                <Button
                  variant="secondary"
                  disabled={busy || !cloudConfigured}
                  onClick={() => void oauth("x")}
                >
                  <SocialLogo platform="X" size={16} />
                  Continue with X
                </Button>
                <div className="auth-divider">
                  <span />
                  or, keep it simple
                  <span />
                </div>
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await sendCode();
                  }}
                >
                  <label>
                    Email address
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      placeholder="you@something-great.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!cloudConfigured}
                    />
                  </label>
                  <Button type="submit" disabled={busy || !cloudConfigured}>
                    {busy ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Mail size={16} />
                    )}
                    Email me a sign-in link
                    <ArrowRight size={15} />
                  </Button>
                  <p className="form-footnote">
                    <LockKeyhole size={11} />
                    No password to remember. One less thing.
                  </p>
                </form>
              </details>
            </>
          )}
          {!cloudConfigured && (
            <div className="auth-config-notice">
              <ShieldCheck size={18} />
              <div>
                <strong>Cloud sign-in isn’t configured yet.</strong>
                <p>
                  You can already scan, save contacts, take notes, and manage
                  follow-ups in a private guest workspace.
                </p>
                <ButtonLink href="/app" variant="secondary">
                  Continue as a guest
                  <ArrowUpRight size={14} />
                </ButtonLink>
              </div>
            </div>
          )}
          <p className="auth-terms">
            By continuing, you agree to the <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
          {cloudConfigured && (
            <Link className="auth-guest-link" href="/app">
              Just exploring? Continue as a guest
              <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
        <span className="auth-form-footer">
          Real people. Meaningful connections.
        </span>
      </section>
    </main>
  );
}
// /auth/callback sends failed sign-in links back here with ?error=expired.
function ExpiredLinkNotice() {
  return useSearchParams().get("error") === "expired" ? (
    <p className="form-error" role="alert">
      That sign-in link expired or was opened in a different browser. Request a
      new one below.
    </p>
  ) : null;
}
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        d="M21 12.2c0-.7-.1-1.4-.2-2.1H12v4h5a4.3 4.3 0 0 1-1.9 2.8v2.5h3.3c1.9-1.8 2.6-4.2 2.6-7.2Z"
        fill="#4285f4"
      />
      <path
        d="M12 22c2.5 0 4.6-.8 6.2-2.3L15 17.2a5.7 5.7 0 0 1-8.5-3H3.1v2.6A10 10 0 0 0 12 22Z"
        fill="#34a853"
      />
      <path
        d="M6.5 14.2a6 6 0 0 1 0-4.4V7.2H3.1a10 10 0 0 0 0 9.6Z"
        fill="#fbbc05"
      />
      <path
        d="M12 6a5.3 5.3 0 0 1 3.8 1.5l2.9-2.8A10 10 0 0 0 3.1 7.2l3.4 2.6A5.8 5.8 0 0 1 12 6Z"
        fill="#ea4335"
      />
    </svg>
  );
}
