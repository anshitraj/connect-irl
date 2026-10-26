import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request } from "node:https";
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 &&
        (b === 168 ||
          (b === 0 && (c === 0 || c === 2)) ||
          (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    const halves = value.split("::");
    const left = halves[0].split(":").filter(Boolean);
    const right = (halves[1] || "").split(":").filter(Boolean);
    const parts = [
      ...left,
      ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"),
      ...right,
    ].map((part) => parseInt(part, 16));
    const first = parts[0];
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      first !== 0x2002 &&
      !(first === 0x2001 && [0, 2, 0x10, 0x20, 0xdb8].includes(parts[1]))
    );
  }
  return false;
}
export function companyIconOrigin(input: string): URL {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    isIP(url.hostname.replace(/^\[|\]$/g, "")) ||
    !url.hostname.includes(".") ||
    /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(
      url.hostname,
    ) ||
    url.hostname.endsWith(".home.arpa")
  )
    throw new Error("Use a public HTTPS company website for its icon.");
  return new URL(url.origin);
}
function publicImageRequest(
  url: URL,
  address: { address: string; family: number },
  signal: AbortSignal,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        signal,
        timeout: 3500,
        headers: {
          Accept: "image/png,image/jpeg,image/webp,image/x-icon",
          "User-Agent": "ConnectIRL-WebsiteIcon/1.0",
        },
        lookup: (_host, _options, callback) =>
          callback(null, address.address, address.family),
        family: address.family,
        servername: url.hostname,
      },
      (response) => {
        // Never follow redirects into another host or a private network.
        if (
          response.statusCode !== 200 ||
          Number(response.headers["content-length"]) > 262144
        ) {
          response.resume();
          reject(new Error("Website icon unavailable."));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 262144) {
            req.destroy(new Error("Website icon is too large."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Website icon timed out.")));
    req.on("error", reject);
    req.end();
  });
}
export function imageForStorage(
  bytes: Buffer,
): { bytes: Buffer; contentType: string; extension: string } | null {
  if (bytes.length > 262144) return null;
  if (
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20);
    return width > 0 && height > 0 && width <= 1024 && height <= 1024
      ? { bytes, contentType: "image/png", extension: "png" }
      : null;
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return { bytes, contentType: "image/jpeg", extension: "jpg" };
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return { bytes, contentType: "image/webp", extension: "webp" };
  if (bytes.length >= 22 && bytes.readUInt32LE(0) === 0x00010000) {
    const count = bytes.readUInt16LE(4);
    if (count > 64 || 6 + count * 16 > bytes.length) return null;
    for (let i = count - 1; i >= 0; i--) {
      const entry = 6 + i * 16,
        size = bytes.readUInt32LE(entry + 8),
        offset = bytes.readUInt32LE(entry + 12);
      if (offset < 6 + count * 16 || size < 24 || offset + size > bytes.length)
        continue;
      const png = bytes.subarray(offset, offset + size);
      if (png[0] === 137 && png[1] === 80) return imageForStorage(png);
    }
  }
  return null;
}
export async function fetchCompanyIcon(
  input: string,
  requestSignal?: AbortSignal,
) {
  const origin = companyIconOrigin(input);
  const signal = requestSignal
    ? AbortSignal.any([requestSignal, AbortSignal.timeout(6000)])
    : AbortSignal.timeout(6000);
  const addresses = await Promise.race([
    lookup(origin.hostname, { all: true, verbatim: true }),
    new Promise<never>((_resolve, reject) => {
      if (signal.aborted) reject(new Error("Website icon timed out."));
      else
        signal.addEventListener(
          "abort",
          () => reject(new Error("Website icon timed out.")),
          { once: true },
        );
    }),
  ]);
  if (
    !addresses.length ||
    addresses.some((address) => !isPublicAddress(address.address))
  )
    throw new Error("Company website must resolve to a public address.");
  // Pin the validated DNS result in the TLS request to prevent DNS rebinding.
  for (const path of [
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/favicon.png",
  ]) {
    if (signal.aborted) break;
    try {
      const image = imageForStorage(
        await publicImageRequest(new URL(path, origin), addresses[0], signal),
      );
      if (image) return image;
    } catch {
      /* Try the next conventional icon path within the same deadline. */
    }
  }
  throw new Error(
    "No supported website icon found. Company initials will be used.",
  );
}
