import { afterEach, describe, expect, it } from "vitest";
import { authEmail } from "@/lib/email/auth-templates";
import { connectionEmail } from "@/lib/email/connection-email";
import { unsubscribeUrl, validUnsubscribe } from "@/lib/email/unsubscribe";

describe("Supabase auth email templates", () => {
  // The files under supabase/templates are generated from the TypeScript source:
  // `npm run email:templates` rewrites them, and this test fails if they drift.
  it.each([
    ["magic-link", "magic-link.html"],
    ["confirm-signup", "confirm-signup.html"],
  ] as const)(
    "keeps %s in sync with its pasted template",
    async (kind, file) => {
      const { html } = authEmail(kind);
      await expect(html).toMatchFileSnapshot(
        `../../supabase/templates/${file}`,
      );
      // A server-redeemed token hash works in any browser; there is no code to type.
      expect(html).toContain(
        'href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}"',
      );
      expect(html).not.toContain("{{ .Token }}");
      expect(html).not.toContain("{{ .ConfirmationURL }}");
      expect(html).toContain("https://connectirl.xyz/email/header.gif");
      expect(html).toContain("https://connectirl.xyz/email/hero-signin.gif");
      // Gmail clips messages over ~102 KB.
      expect(Buffer.byteLength(html)).toBeLessThan(60_000);
    },
  );
  it("uses a different subject and welcome for brand-new accounts", () => {
    expect(authEmail("magic-link").subject).not.toBe(
      authEmail("confirm-signup").subject,
    );
    expect(authEmail("confirm-signup").html).toContain("Follow up");
    expect(authEmail("magic-link").html).not.toContain("Follow up");
  });
});

describe("Connection email", () => {
  const unsubscribe = "https://connectirl.xyz/api/email/unsubscribe?u=1&t=2";
  const actor = {
    name: "Priya Nair",
    username: "priya",
    headline: "Founder at Rail",
    avatar: "/avatars/priya.jpg",
  };
  it("introduces the person with their public profile and a way out", () => {
    const mail = connectionEmail({ actor, unsubscribeUrl: unsubscribe });
    expect(mail.subject).toBe("Priya just connected with you on Connect IRL");
    expect(mail.html).toContain("https://connectirl.xyz/u/priya");
    expect(mail.html).toContain("https://connectirl.xyz/avatars/priya.jpg");
    expect(mail.html).toContain("hero-connect.gif");
    expect(mail.html).toContain("Founder at Rail");
    expect(mail.html).toContain("t=2");
    expect(mail.text).toContain("https://connectirl.xyz/u/priya");
    expect(mail.text).toContain(unsubscribe);
    expect(Buffer.byteLength(mail.html)).toBeLessThan(60_000);
  });
  it("escapes profile text and refuses non-https or unsafe avatars", () => {
    const hostile = connectionEmail({
      actor: {
        name: '<img src=x onerror=alert(1)> "Eve"\r\nBcc: a@b.c',
        username: "eve",
        headline: "<script>alert(1)</script>",
        avatar: "javascript:alert(1)",
      },
      unsubscribeUrl: unsubscribe,
    });
    expect(hostile.html).not.toContain("<script>");
    expect(hostile.html).not.toContain("<img src=x");
    expect(hostile.html).not.toContain("javascript:");
    expect(hostile.subject).not.toMatch(/[\r\n]/);
    for (const avatar of [
      "http://example.com/a.png",
      "/avatars/../secret",
      "https://u:p@example.com/a.png",
    ])
      expect(
        connectionEmail({
          actor: { ...actor, avatar },
          unsubscribeUrl: unsubscribe,
        }).html,
      ).not.toMatch(/<img src="[^"]*(example\.com|secret)/);
  });
  it("falls back to initials when there is no photo", () => {
    const mail = connectionEmail({
      actor: { ...actor, avatar: "" },
      unsubscribeUrl: unsubscribe,
    });
    expect(mail.html).toContain(">PN</td>");
  });
});

describe("Unsubscribe links", () => {
  const original = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const user = "22222222-2222-4222-8222-222222222222";
  afterEach(() => {
    if (original === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = original;
  });
  it("accepts only the token signed for that account", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";
    const token = new URL(unsubscribeUrl(user)).searchParams.get("t");
    expect(validUnsubscribe(user, token)).toBe(true);
    expect(
      validUnsubscribe("11111111-1111-4111-8111-111111111111", token),
    ).toBe(false);
    expect(validUnsubscribe(user, `${token}x`)).toBe(false);
    expect(validUnsubscribe(user, null)).toBe(false);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "another-secret";
    expect(validUnsubscribe(user, token)).toBe(false);
  });
  it("is disabled when no signing secret is configured", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(validUnsubscribe(user, "anything")).toBe(false);
  });
});
