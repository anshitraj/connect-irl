import type { Contact, Profile } from "./types";
import { contactFromProfile, safeUrl } from "./utils";

export function contactForScannedProfile(
  profile: Profile,
  origin: string,
): Omit<Contact, "id" | "meetings" | "createdAt"> {
  const url = new URL(`/u/${profile.username}`, origin).href;
  const contact = contactFromProfile(profile);
  return {
    ...contact,
    source: "qr",
    links: [
      { label: "Connect IRL", url },
      ...contact.links.filter((link) => link.url !== url).slice(0, 11),
    ],
  };
}
export function contactForScannedLink(
  url: string,
): Omit<Contact, "id" | "meetings" | "createdAt"> {
  // External QR codes share a URL, not a verified person's name.
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  return {
    name: hostname.slice(0, 100),
    headline: "Scanned public link",
    project: "",
    avatar: "",
    tags: [],
    links: [{ label: hostname.slice(0, 40), url }],
    source: "qr",
    starred: false,
    archived: false,
  };
}
export type NFCRecord = {
  recordType: string;
  data?: DataView;
  encoding?: string;
};
export function urlFromNFC(records: NFCRecord[]): string | null {
  for (const record of records.slice(0, 20)) {
    if (
      !["url", "absolute-url", "text"].includes(record.recordType) ||
      !record.data ||
      record.data.byteLength > 8192
    )
      continue;
    try {
      const url = safeUrl(
        new TextDecoder(record.encoding || "utf-8", { fatal: true })
          .decode(record.data)
          .trim(),
      );
      if (url) return url;
    } catch {
      /* Try the next NDEF URL record. */
    }
  }
  return null;
}
