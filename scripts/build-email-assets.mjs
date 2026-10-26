// Renders the animated logo header and hero images used by every Connect IRL email.
// Output is committed under public/email, so this only needs re-running when the art changes.
//   node scripts/build-email-assets.mjs
// Requires `ffmpeg` on PATH (GIF encoding) and the Playwright Chromium already used by the test suite.
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const out = resolve("public/email");
const fontFile = resolve(
  "node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
);
mkdirSync(out, { recursive: true });
const font = readFileSync(fontFile).toString("base64");

// Scenes are plain SVG strings built from a loop position u in [0,1). Every scene is
// periodic, and frame 0 is a complete picture because Outlook shows only that frame.
const sceneSource = `
const P = { forest:"#053d2b", deep:"#042f22", grid:"#0a4a35", pulse:"#0d5a40", emerald:"#08b96c", bright:"#26e58b", soft:"#6af0ad",
  mint:"#e8f8ef", mintDark:"#d6f1e1", line:"#bfe3cc", shadow:"#c6e6d1", white:"#ffffff", orange:"#edac50", purple:"#7563b4" };
const TAU = Math.PI * 2;
const wave = (u) => 0.5 - 0.5 * Math.cos(TAU * u);
const twinkle = (u, phase) => Math.pow(Math.max(0, Math.sin(TAU * (u + phase))), 1.4);
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function sparkle(cx, cy, r, fill) {
  if (r < 1.5) return "";
  const k = r * 0.14;
  return '<path d="M' + cx + " " + (cy - r) + "Q" + (cx + k) + " " + (cy - k) + " " + (cx + r) + " " + cy + "Q" + (cx + k) + " " + (cy + k) + " " + cx + " " + (cy + r) + "Q" + (cx - k) + " " + (cy + k) + " " + (cx - r) + " " + cy + "Q" + (cx - k) + " " + (cy - k) + " " + cx + " " + (cy - r) + 'Z" fill="' + fill + '"/>';
}
function svg(w, h, body, bg) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '"><rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>' + body + "</svg>";
}
const text = (s, x, y, size, weight, fill, anchor) => '<text x="' + x + '" y="' + y + '" font-family="Geist" font-size="' + size + '" font-weight="' + weight + '" fill="' + fill + '" text-anchor="' + (anchor || "start") + '">' + s + "</text>";
function measure(s, size, weight) {
  const c = measure.ctx || (measure.ctx = document.createElement("canvas").getContext("2d"));
  c.font = weight + " " + size + "px Geist";
  return c.measureText(s).width;
}

const MARK = ["m16 0 9 5v10l-9 5-9-5V5Z", "m6 17 9 5v10l-9 4-6-4V21Z", "m26 17 6 4v11l-9 4-6-4V22Z"];
// The product logo: three hex blocks that drift slightly out of phase, with a light sweep.
function mark(x, y, s, u, sweep) {
  const cols = [P.bright, P.emerald, P.soft];
  const lift = MARK.map((_, k) => (Math.sin(TAU * u + k * 2.1) - Math.sin(k * 2.1)) * (3.4 / s));
  const shapes = MARK.map((d, k) => '<path transform="translate(0 ' + lift[k].toFixed(2) + ')" d="' + d + '" fill="' + cols[k] + '"/>').join("");
  const clip = MARK.map((d, k) => '<path transform="translate(0 ' + lift[k].toFixed(2) + ')" d="' + d + '"/>').join("");
  const sheen = '<path transform="translate(0 ' + lift[0].toFixed(2) + ')" d="m16 3 6 3.5-6 3.5-6-3.5Z" fill="#fff" opacity=".4"/>';
  let band = "";
  if (sweep !== null) {
    const bx = -16 + 56 * sweep;
    band = '<g clip-path="url(#logo-clip)"><polygon points="' + bx + ",-4 " + (bx + 9) + ",-4 " + (bx + 3) + ",40 " + (bx - 6) + ',40" fill="#fff" opacity=".55"/></g>';
  }
  return '<defs><clipPath id="logo-clip">' + clip + '</clipPath></defs><g transform="translate(' + x + " " + y + ") scale(" + s + ')">' + shapes + sheen + band + "</g>";
}

function person(cx, cy, r, fg) {
  const id = "p" + Math.round(cx);
  return '<clipPath id="' + id + '"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath><g clip-path="url(#' + id + ')"><circle cx="' + cx + '" cy="' + (cy - r * 0.2) + '" r="' + (r * 0.3) + '" fill="' + fg + '"/><ellipse cx="' + cx + '" cy="' + (cy + r * 0.8) + '" rx="' + (r * 0.64) + '" ry="' + (r * 0.5) + '" fill="' + fg + '"/></g>';
}

const scenes = {};

scenes.header = (u) => {
  const W = 1200, H = 300, s = 3.7, size = 80, gap = 30;
  let grid = "";
  const r = 54, hw = Math.sqrt(3) * r, rowH = r * 1.5;
  for (let row = -1; row < H / rowH + 1; row++) {
    for (let col = -1; col < W / hw + 1; col++) {
      const cx = col * hw + (row % 2 ? hw / 2 : 0), cy = row * rowH + 20;
      const pts = [0, 1, 2, 3, 4, 5].map((i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return (cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1); }).join(" ");
      const lit = ((row * 7 + col * 3) % 11 === 0) ? twinkle(u, (row * 5 + col * 3) / 11) : 0;
      grid += '<polygon points="' + pts + '" fill="' + (lit > 0.05 ? mix(P.forest, P.pulse, Math.round(lit * 4) / 4) : "none") + '" stroke="' + P.grid + '" stroke-width="2"/>';
    }
  }
  const wA = measure("Connect ", size, 500), wB = measure("IRL", size, 700), dot = 9;
  const total = 32 * s + gap + wA + wB + 8 + dot * 2;
  const x0 = (W - total) / 2, markH = 36 * s, cy = H / 2;
  const tx = x0 + 32 * s + gap, base = cy + size * 0.34;
  const sweep = u > 0.12 && u < 0.62 ? (u - 0.12) / 0.5 : null;
  const pulse = 1 + 0.35 * twinkle(u, 0.05);
  let body = grid + mark(x0, cy - markH / 2, s, u, sweep);
  body += text("Connect ", tx, base, size, 500, P.white);
  body += text("IRL", tx + wA, base, size, 700, P.white);
  body += '<circle cx="' + (tx + wA + wB + 8 + dot) + '" cy="' + (base - dot) + '" r="' + (dot * pulse).toFixed(2) + '" fill="' + P.bright + '"/>';
  body += sparkle(x0 + 32 * s + 18, cy - markH / 2 + 8, 24 * twinkle(u, 0.0) + 6, P.soft);
  body += sparkle(tx + wA + wB + 70, cy - 56, 22 * twinkle(u, 0.42) + 4, P.bright);
  body += sparkle(x0 - 44, cy + 34, 18 * twinkle(u, 0.7) + 3, P.emerald);
  body += sparkle(x0 + total + 20, cy + 52, 16 * twinkle(u, 0.22) + 3, P.soft);
  return svg(W, H, body, P.forest);
};

scenes.signin = (u) => {
  const W = 1200, H = 380, cardW = 290, cardX = (W - cardW) / 2, cardY = 45, qr = 210, m = qr / 21;
  const qx = cardX + (cardW - qr) / 2, qy = cardY + (cardW - qr) / 2;
  const scanY = qy - 6 + (qr + 12) * wave(u);
  let body = '<circle cx="190" cy="360" r="210" fill="' + P.mintDark + '"/><circle cx="1030" cy="20" r="170" fill="' + P.mintDark + '"/>';
  const off = -(u * 64) % 64;
  body += '<line x1="285" y1="190" x2="' + (cardX - 26) + '" y2="190" stroke="' + P.emerald + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 16" stroke-dashoffset="' + off + '"/>';
  body += '<line x1="' + (cardX + cardW + 26) + '" y1="190" x2="915" y2="190" stroke="' + P.emerald + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 16" stroke-dashoffset="' + -off + '"/>';
  body += '<circle cx="225" cy="190" r="62" fill="' + P.forest + '"/>' + person(225, 190, 62, P.soft);
  body += '<circle cx="975" cy="190" r="62" fill="' + P.emerald + '"/>' + person(975, 190, 62, P.white);
  body += '<rect x="' + cardX + '" y="' + (cardY + 12) + '" width="' + cardW + '" height="' + cardW + '" rx="34" fill="' + P.shadow + '"/>';
  body += '<rect x="' + cardX + '" y="' + cardY + '" width="' + cardW + '" height="' + cardW + '" rx="34" fill="' + P.white + '"/>';
  const rand = rng(11);
  const finder = (gx, gy) => (gx < 7 && gy < 7) || (gx > 13 && gy < 7) || (gx < 7 && gy > 13);
  for (let gy = 0; gy < 21; gy++) {
    for (let gx = 0; gx < 21; gx++) {
      let on;
      if (finder(gx, gy)) {
        const lx = gx % 14, ly = gy % 14, ring = Math.max(Math.abs(lx - 3), Math.abs(ly - 3));
        on = ring !== 2;
      } else if ((gx === 7 || gx === 13) && (gy < 8 || gy > 12)) on = false;
      else on = rand() > 0.52;
      if (!on) continue;
      const cy = qy + gy * m + m / 2, lit = Math.abs(cy - scanY) < 24;
      body += '<rect x="' + (qx + gx * m).toFixed(1) + '" y="' + (qy + gy * m).toFixed(1) + '" width="' + (m - 0.8).toFixed(1) + '" height="' + (m - 0.8).toFixed(1) + '" rx="2" fill="' + (lit ? P.emerald : P.forest) + '"/>';
    }
  }
  body += '<clipPath id="qr-clip"><rect x="' + (cardX + 14) + '" y="' + (cardY + 14) + '" width="' + (cardW - 28) + '" height="' + (cardW - 28) + '" rx="22"/></clipPath><g clip-path="url(#qr-clip)">';
  body += '<rect x="' + cardX + '" y="' + (scanY - 30) + '" width="' + cardW + '" height="30" fill="' + P.bright + '" opacity=".16"/><rect x="' + cardX + '" y="' + (scanY - 12) + '" width="' + cardW + '" height="12" fill="' + P.bright + '" opacity=".28"/>';
  body += '<rect x="' + cardX + '" y="' + (scanY - 2.5) + '" width="' + cardW + '" height="5" fill="' + P.bright + '"/></g>';
  const bx = cardX - 20, by = cardY - 20, bs = cardW + 40, bl = 50;
  const corner = (x, y, dx, dy) => '<path d="M' + x + " " + (y + dy * bl) + "V" + y + "H" + (x + dx * bl) + '" fill="none" stroke="' + P.emerald + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>';
  body += corner(bx, by, 1, 1) + corner(bx + bs, by, -1, 1) + corner(bx, by + bs, 1, -1) + corner(bx + bs, by + bs, -1, -1);
  const pop = 1 + 0.07 * wave(u * 2 % 1);
  body += '<g transform="translate(' + (cardX + cardW - 6) + " " + (cardY + 4) + ") scale(" + pop.toFixed(3) + ')"><circle r="38" fill="' + P.white + '"/><circle r="31" fill="' + P.bright + '"/><path d="m-14 1 10 10 19-21" fill="none" stroke="' + P.forest + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>';
  body += sparkle(120, 90, 22 * twinkle(u, 0.1) + 4, P.emerald) + sparkle(1090, 300, 24 * twinkle(u, 0.55) + 4, P.emerald) + sparkle(1060, 110, 16 * twinkle(u, 0.8) + 3, P.soft) + sparkle(160, 310, 14 * twinkle(u, 0.35) + 3, P.soft);
  return svg(W, H, body, P.mint);
};

scenes.connect = (u) => {
  const W = 1200, H = 380, cy = 190, r = 84, cx = W / 2;
  const nudge = 0;
  const lx = 300 + nudge, rx = W - 300 - nudge;
  let body = '<circle cx="1060" cy="372" r="190" fill="' + P.mintDark + '"/><circle cx="130" cy="14" r="150" fill="' + P.mintDark + '"/>';
  body += '<line x1="' + (lx + r) + '" y1="' + cy + '" x2="' + (rx - r) + '" y2="' + cy + '" stroke="' + P.line + '" stroke-width="12" stroke-linecap="round"/>';
  for (const side of [-1, 1]) {
    for (const shift of [0, 0.5]) {
      const v = (u * 2 + shift) % 1, start = side < 0 ? lx + r + 6 : rx - r - 6, end = cx - side * 70;
      const dx = start + (end - start) * v, grow = Math.sin(Math.PI * v);
      body += '<circle cx="' + dx.toFixed(1) + '" cy="' + cy + '" r="' + (3 + 8 * grow).toFixed(1) + '" fill="' + P.emerald + '"/>';
    }
  }
  for (const shift of [0, 0.5]) {
    const v = (u + shift) % 1;
    body += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (56 + 78 * v).toFixed(1) + '" fill="none" stroke="' + mix(P.emerald, P.mint, Math.min(1, Math.round(v * 4) / 4)) + '" stroke-width="' + (v > 0.8 ? 2 : Math.round(10 * (1 - v))) + '"/>';
  }
  body += '<circle cx="' + lx + '" cy="' + cy + '" r="' + (r + 12) + '" fill="' + P.white + '"/><circle cx="' + lx + '" cy="' + cy + '" r="' + r + '" fill="' + P.forest + '"/>' + person(lx, cy, r, P.soft);
  body += '<circle cx="' + rx + '" cy="' + cy + '" r="' + (r + 12) + '" fill="' + P.white + '"/><circle cx="' + rx + '" cy="' + cy + '" r="' + r + '" fill="' + P.emerald + '"/>' + person(rx, cy, r, P.white);
  const pop = 1 + 0.06 * wave(u * 2 % 1);
  body += '<g transform="translate(' + cx + " " + cy + ") scale(" + pop.toFixed(3) + ')"><circle r="60" fill="' + P.white + '"/><circle r="50" fill="' + P.bright + '"/><path d="m-22 2 14 15 30-33" fill="none" stroke="' + P.forest + '" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></g>';
  const rand = rng(5), palette = [P.orange, P.purple, P.emerald, P.soft];
  for (let i = 0; i < 9; i++) {
    const x = 90 + rand() * 1020, y0 = 40 + rand() * 300, ph = rand(), drift = 50 + rand() * 40;
    if (Math.abs(x - cx) < 110 || Math.abs(x - lx) < 100 || Math.abs(x - rx) < 100) continue;
    const v = (u + ph) % 1;
    body += '<circle cx="' + x.toFixed(1) + '" cy="' + (y0 - drift * v).toFixed(1) + '" r="' + (3 + 6 * Math.sin(Math.PI * v)).toFixed(1) + '" fill="' + palette[i % palette.length] + '"/>';
  }
  body += sparkle(cx - 130, 70, 22 * twinkle(u, 0.1) + 4, P.emerald) + sparkle(cx + 150, 312, 22 * twinkle(u, 0.6) + 4, P.emerald) + sparkle(cx + 112, 64, 14 * twinkle(u, 0.85) + 3, P.soft);
  return svg(W, H, body, P.mint);
};
`;

const jobs = [
  { name: "header", scene: "header", w: 1200, h: 300, frames: 60, fps: 25 },
  { name: "hero-signin", scene: "signin", w: 1200, h: 380, frames: 64, fps: 20 },
  { name: "hero-connect", scene: "connect", w: 1200, h: 380, frames: 48, fps: 16 },
];

const browser = await chromium.launch();
const work = mkdtempSync(join(tmpdir(), "connectirl-email-"));
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setContent(
    `<style>@font-face{font-family:Geist;font-weight:100 900;src:url(data:font/woff2;base64,${font}) format("woff2")}
    html,body{margin:0;background:#fff}svg{display:block}</style><div id="root"></div>`,
  );
  await page.addScriptTag({ content: sceneSource });
  await page.evaluate(() => document.fonts.load("700 80px Geist").then(() => document.fonts.load("500 80px Geist")));
  for (const job of jobs) {
    await page.setViewportSize({ width: job.w, height: job.h });
    for (let i = 0; i < job.frames; i++) {
      await page.evaluate(
        ([name, u]) => {
          document.getElementById("root").innerHTML = scenes[name](u);
        },
        [job.scene, i / job.frames],
      );
      await page.screenshot({ path: join(work, `${job.name}-${String(i).padStart(3, "0")}.png`) });
    }
    const file = join(out, `${job.name}.gif`);
    const run = spawnSync(
      "ffmpeg",
      [
        "-y", "-loglevel", "error", "-framerate", String(job.fps),
        "-i", join(work, `${job.name}-%03d.png`),
        "-vf", "split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle",
        "-loop", "0", file,
      ],
      { encoding: "utf8" },
    );
    if (run.status !== 0) throw new Error(`ffmpeg failed for ${job.name}: ${run.stderr || run.error}`);
    console.log(`${job.name}.gif  ${job.w}x${job.h}  ${job.frames} frames  ${(statSync(file).size / 1024).toFixed(0)} KB`);
  }
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
