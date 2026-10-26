import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { events } from "./events";
import type { Contact, Profile } from "./types";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const uid = () => crypto.randomUUID();
export function safeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}
export function parseProfileUrl(
  input: string,
  origin: string,
): { username: string } | { external: string } | null {
  const safe = safeUrl(input);
  if (!safe) return null;
  const u = new URL(safe);
  const own = new URL(origin);
  if (u.origin === own.origin) {
    const match = u.pathname.match(/^\/u\/([a-z0-9][a-z0-9_-]{1,39})\/?$/i);
    return match ? { username: match[1] } : null;
  }
  return { external: safe };
}
const stopWords = new Set(
  "who did i met meet at the a an is was with in on of for and or my someone person people guy building builds working works something interested interested-in discussed do does to me it that he she they we last week".split(
    " ",
  ),
);
export function searchContacts(contacts: Contact[], query: string) {
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.-]+/u)
    .filter((t) => t.length > 1 && !stopWords.has(t));
  if (!tokens.length) return contacts;
  return contacts
    .map((contact) => {
      const haystack = [
        contact.name,
        contact.headline,
        contact.project,
        ...contact.tags,
        ...contact.links.map((l) => l.url),
        ...contact.meetings.map(
          (m) =>
            `${m.note} ${events.find((e) => e.id === m.eventId)?.name || ""} ${events.find((e) => e.id === m.eventId)?.shortName || ""}`,
        ),
      ]
        .join(" ")
        .toLowerCase();
      const matched = tokens.filter((t) => haystack.includes(t));
      return { contact, score: matched.length / tokens.length };
    })
    .filter((r) => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.contact);
}
export function contactFromProfile(
  p: Profile,
): Omit<Contact, "id" | "meetings" | "createdAt"> {
  return {
    profileId: p.id,
    name: p.name,
    headline: p.headline,
    project: p.project,
    avatar: p.avatar,
    tags: p.tags,
    links: p.links,
    starred: false,
    archived: false,
    source: "profile",
    ...(p.sample ? { sample: true } : {}),
  };
}
export function vcard(person: {
  name: string;
  headline?: string;
  links: { label: string; url: string }[];
}) {
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$&");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(person.name)}`,
    `TITLE:${esc(person.headline || "")}`,
    ...person.links
      .filter((l) => safeUrl(l.url))
      .map((l) => `URL:${esc(l.url)}`),
    "END:VCARD",
  ].join("\r\n");
}
export function downloadFile(
  name: string,
  content: string | Blob,
  type = "text/plain",
) {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const prettyDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
export function followUpDraft(contact: Contact) {
  const meeting = contact.meetings.at(-1);
  const event = events.find((e) => e.id === meeting?.eventId);
  return `Hey ${contact.name.split(" ")[0]}, great meeting you${event ? ` at ${event.shortName}` : ""}!${meeting?.note ? ` Picking up on our conversation: ${meeting.note}` : " Would love to pick up where we left off."}`;
}
