// Shared Connect IRL email shell. Email clients ignore modern CSS, so this is table
// layout with inline styles; the <style> block only adds mobile and dark-mode refinements.
export const SITE_URL = "https://connectirl.xyz";
export const ASSET_URL = `${SITE_URL}/email`;

export const brand = {
  forest: "#053d2b",
  emerald: "#08b96c",
  bright: "#26e58b",
  soft: "#6af0ad",
  mint: "#e8f8ef",
  ink: "#101713",
  muted: "#52625a",
  border: "#dce7df",
  page: "#f1f6f2",
  white: "#ffffff",
} as const;

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const esc = (value: string) =>
  value.replace(/[&<>"']/g, (char) => entities[char]);

export type HeroImage = "hero-signin" | "hero-connect";

export function eyebrow(label: string) {
  return `<span class="eyebrow" style="display:inline-block;padding:6px 12px;border-radius:999px;background:${brand.mint};color:#05593c;font:700 11px/14px ${font};letter-spacing:1.5px;text-transform:uppercase">${label}</span>`;
}

export function heading(text: string) {
  return `<h1 class="h1 ink" style="margin:14px 0 12px;font:700 32px/38px ${font};letter-spacing:-0.6px;color:${brand.ink}">${text}</h1>`;
}

export function paragraph(html: string, extra = "") {
  return `<p class="muted" style="margin:0 0 16px;font:400 16px/26px ${font};color:${brand.muted};${extra}">${html}</p>`;
}

export function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:26px 0 6px;border-collapse:separate"><tr><td class="btn-cell" align="center" bgcolor="${brand.forest}" style="border-radius:14px;background:${brand.forest};border-bottom:4px solid ${brand.emerald}"><a class="btn-link" href="${href}" target="_blank" style="display:inline-block;padding:16px 34px;border-radius:14px;font:700 16px/20px ${font};color:#ffffff;text-decoration:none">${label} &nbsp;&rarr;</a></td></tr></table>`;
}

export function panel(inner: string, extra = "") {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="panel" style="margin:6px 0 18px;border-collapse:separate;background:${brand.mint};border:1px solid #cfe5d5;border-radius:14px;${extra}"><tr><td style="padding:18px 20px">${inner}</td></tr></table>`;
}

export function renderShell(options: {
  title: string;
  preheader: string;
  hero: HeroImage;
  heroAlt: string;
  body: string;
  footerNote: string;
}) {
  const header = `<a href="${SITE_URL}" target="_blank" style="display:block;text-decoration:none"><img src="${ASSET_URL}/header.gif" width="600" height="150" alt="Connect IRL" style="display:block;width:100%;max-width:600px;height:auto;border:0;background:${brand.forest};color:#ffffff;font:700 28px/150px ${font};text-align:center"></a>`;
  const hero = `<img src="${ASSET_URL}/${options.hero}.gif" width="600" height="190" alt="${esc(options.heroAlt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;background:${brand.mint}">`;
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(options.title)}</title>
<style>
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{color:#07894f}
@media only screen and (max-width:620px){
.shell{padding:0!important}.card{border-radius:0!important;border-left:0!important;border-right:0!important}
.px{padding-left:24px!important;padding-right:24px!important}
.h1{font-size:28px!important;line-height:34px!important}
.btn,.btn-cell,.btn-link{display:block!important;width:100%!important;box-sizing:border-box}
.code{font-size:30px!important;letter-spacing:7px!important}
.col{display:block!important;width:100%!important;padding:0 0 14px!important}
}
@media (prefers-color-scheme:dark){
.page{background:#09110d!important}.card{background:#101a15!important;border-color:#1e2e26!important}
.ink{color:#f1f7f3!important}.muted{color:#a9bbb0!important}
.panel{background:#15251d!important;border-color:#25392f!important}
.eyebrow{background:#15251d!important;color:#6af0ad!important}
.code{color:#6af0ad!important}.foot{background:#0c1510!important}
.btn-cell{background:#26e58b!important;border-bottom-color:#08b96c!important}.btn-link{color:#053d2b!important}
a{color:#6af0ad}
}
</style>
</head>
<body class="page" bgcolor="${brand.page}" style="margin:0;padding:0;background:${brand.page}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${brand.page}">${esc(options.preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" bgcolor="${brand.page}" style="background:${brand.page}"><tr><td align="center" class="shell" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" bgcolor="${brand.white}" style="border-collapse:separate;width:100%;max-width:600px;background:${brand.white};border:1px solid ${brand.border};border-radius:22px;overflow:hidden">
<tr><td bgcolor="${brand.forest}" style="background:${brand.forest};font-size:0;line-height:0">${header}</td></tr>
<tr><td bgcolor="${brand.mint}" style="background:${brand.mint};font-size:0;line-height:0">${hero}</td></tr>
<tr><td class="px" style="padding:34px 44px 14px;font-family:${font}">${options.body}</td></tr>
<tr><td class="px foot" bgcolor="#f6faf7" style="padding:22px 44px 26px;background:#f6faf7;border-top:1px solid ${brand.border};font-family:${font}">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="40" valign="middle" style="padding-right:12px"><img src="${SITE_URL}/icon-192.png" width="36" height="36" alt="" style="display:block;border-radius:10px"></td>
<td valign="middle" style="font:700 15px/20px ${font};color:${brand.forest}" class="ink">Connect IRL<br><span class="muted" style="font:400 13px/18px ${font};color:${brand.muted}">Meet in real life. Keep the connection.</span></td>
</tr></table>
<p class="muted" style="margin:16px 0 0;font:400 12px/20px ${font};color:${brand.muted}">${options.footerNote}</p>
<p class="muted" style="margin:10px 0 0;font:400 12px/20px ${font};color:${brand.muted}"><a href="${SITE_URL}" style="color:#07894f">connectirl.xyz</a> &nbsp;&middot;&nbsp; <a href="${SITE_URL}/privacy" style="color:#07894f">Privacy</a> &nbsp;&middot;&nbsp; <a href="${SITE_URL}/terms" style="color:#07894f">Terms</a> &nbsp;&middot;&nbsp; <a href="${SITE_URL}/contact" style="color:#07894f">Contact</a></p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}
