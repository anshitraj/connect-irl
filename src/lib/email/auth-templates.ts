import {
  brand,
  button,
  eyebrow,
  heading,
  paragraph,
  renderShell,
} from "./layout";

// Supabase renders these with Go templates, so {{ .Placeholders }} stay literal here.
// The button links to /auth/confirm with the one-time {{ .TokenHash }}; the server redeems it,
// so the link signs in whichever browser or device opens it. There is no code to type.
export type AuthEmailKind = "magic-link" | "confirm-signup";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

const steps = [
  ["1", "Scan", "Swap QR codes with the people you meet."],
  ["2", "Save", "Keep their profile, notes and the event in one place."],
  ["3", "Follow up", "Say hello again while the conversation is fresh."],
] as const;

function howItWorks() {
  const cells = steps
    .map(
      ([n, title, body]) =>
        `<td class="col" width="33%" valign="top" style="padding:0 8px 0 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" bgcolor="${brand.mint}" class="panel" style="width:26px;height:26px;border-radius:13px;background:${brand.mint};font:700 13px/26px ${font};color:#05593c">${n}</td></tr></table><p class="ink" style="margin:8px 0 2px;font:700 14px/20px ${font};color:${brand.ink}">${title}</p><p class="muted" style="margin:0;font:400 13px/19px ${font};color:${brand.muted}">${body}</p></td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr>${cells}</tr></table>`;
}

const copy = {
  "magic-link": {
    subject: "Your Connect IRL sign-in link",
    title: "Sign in to Connect IRL",
    preheader:
      "Tap to sign in. Never share this link.",
    eyebrow: "Welcome back",
    heading: "Your sign-in link is ready.",
    lead: "Tap the button to sign in. It works on whichever device you open it on.",
    button: "Sign in to Connect IRL",
    heroAlt: "A QR code being scanned, connecting two people",
  },
  "confirm-signup": {
    subject: "Welcome to Connect IRL — confirm your email",
    title: "Welcome to Connect IRL",
    preheader:
      "One tap confirms your email and you're in. Never share this link.",
    eyebrow: "Welcome",
    heading: "Every hello is a beginning.",
    lead: "One tap confirms your email and signs you in. Next you'll set up your profile, then scan your first connection.",
    button: "Confirm email & get started",
    heroAlt: "A QR code being scanned, connecting two people",
  },
} as const;

export function authEmail(kind: AuthEmailKind) {
  const c = copy[kind];
  const body = [
    eyebrow(c.eyebrow),
    heading(c.heading),
    paragraph(c.lead),
    button("{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}", c.button),
    kind === "confirm-signup" ? howItWorks() : "",
    `<p class="muted" style="margin:6px 0 0;font:400 13px/21px ${font};color:${brand.muted}"><strong class="ink" style="color:${brand.ink}">Keep it private.</strong> The link works once and expires shortly. Connect IRL will never ask you for it. If you didn&rsquo;t request this email, you can safely ignore it &mdash; nobody can sign in without the link.</p>`,
    `<p class="muted" style="margin:18px 0 22px;font:400 13px/21px ${font};color:${brand.muted}">Sent to {{ .Email }}.</p>`,
  ].join("\n");
  return {
    subject: c.subject,
    html: renderShell({
      title: c.title,
      preheader: c.preheader,
      hero: "hero-signin",
      heroAlt: c.heroAlt,
      body,
      footerNote:
        "You received this because someone asked to sign in to Connect IRL with this email address.",
    }),
  };
}
