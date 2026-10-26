import {
  SITE_URL,
  brand,
  button,
  esc,
  eyebrow,
  heading,
  paragraph,
  renderShell,
} from "./layout";

export type ConnectionEmailInput = {
  /** The person who just connected. Only fields from their public profile. */
  actor: { name: string; username: string; headline?: string; avatar?: string };
  unsubscribeUrl: string;
};

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

// Profile text is user-controlled and ends up in a trusted-looking email, so keep it
// to plain, single-line, bounded text before it is escaped into HTML.
const clean = (value: string | undefined, max: number) =>
  Array.from(
    (value || "")
      .replace(/[\p{Cc}\p{Cf}]/gu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .slice(0, max)
    .join("");

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();

function avatarUrl(avatar: string | undefined) {
  if (!avatar) return null;
  if (avatar.startsWith("/avatars/") && !avatar.includes(".."))
    return `${SITE_URL}${avatar}`;
  try {
    const url = new URL(avatar);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function connectionEmail({
  actor,
  unsubscribeUrl,
}: ConnectionEmailInput) {
  const name = clean(actor.name, 60) || "Someone";
  const first = name.split(" ")[0];
  const headline = clean(actor.headline, 140);
  const profileUrl = `${SITE_URL}/u/${encodeURIComponent(actor.username)}`;
  const photo = avatarUrl(actor.avatar);
  const avatar = photo
    ? `<img src="${esc(photo)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border-radius:36px;object-fit:cover;background:${brand.mint}">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="72" height="72" align="center" valign="middle" bgcolor="${brand.forest}" style="width:72px;height:72px;border-radius:36px;background:${brand.forest};font:700 26px/72px ${font};color:${brand.soft}">${esc(initials(name))}</td></tr></table>`;
  const person = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="panel" style="margin:4px 0 8px;border-collapse:separate;background:${brand.mint};border:1px solid #cfe5d5;border-radius:16px"><tr>
<td width="72" valign="middle" style="padding:18px 0 18px 20px">${avatar}</td>
<td valign="middle" style="padding:18px 20px 18px 16px"><p class="ink" style="margin:0;font:700 20px/26px ${font};color:${brand.ink}">${esc(name)}</p>${headline ? `<p class="muted" style="margin:3px 0 0;font:400 14px/21px ${font};color:${brand.muted}">${esc(headline)}</p>` : ""}<p style="margin:8px 0 0;font:700 12px/16px ${font};color:#07894f">@${esc(actor.username)}</p></td>
</tr></table>`;
  const body = [
    eyebrow("New connection"),
    heading(`${esc(first)} just connected with you.`),
    paragraph(
      `<strong class="ink" style="color:${brand.ink}">${esc(name)}</strong> saved your Connect IRL profile. Here&rsquo;s who they are:`,
    ),
    person,
    button(profileUrl, `See ${esc(first)}&rsquo;s profile`),
    paragraph(
      `<strong class="ink" style="color:${brand.ink}">Say hello while it&rsquo;s fresh.</strong> Connecting back and sending a quick note in the next day turns a good scan into a real conversation.`,
      "margin-top:22px",
    ),
    paragraph(
      `Their notes and meeting details stay private &mdash; only your public profile is shared.`,
      "font-size:14px;line-height:22px;margin-bottom:22px",
    ),
  ].join("\n");
  const html = renderShell({
    title: `${name} connected with you on Connect IRL`,
    preheader: `${name}${headline ? ` · ${headline}` : ""} saved your profile on Connect IRL.`,
    hero: "hero-connect",
    heroAlt: "Two people connected",
    body,
    footerNote: `You&rsquo;re getting this because someone saved your public Connect IRL profile. <a href="${esc(unsubscribeUrl)}" style="color:#07894f">Turn off connection emails</a>.`,
  });
  const text = [
    `${first} just connected with you on Connect IRL.`,
    "",
    `${name}${headline ? ` — ${headline}` : ""}`,
    profileUrl,
    "",
    "Say hello while it's fresh: connect back and send a quick note.",
    "Their notes and meeting details stay private; only your public profile is shared.",
    "",
    `Turn off connection emails: ${unsubscribeUrl}`,
  ].join("\n");
  return {
    subject: `${first} just connected with you on Connect IRL`,
    html,
    text,
  };
}
