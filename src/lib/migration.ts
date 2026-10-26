import type { Workspace } from "./types";
export function mergeGuestWorkspace(
  account: Workspace,
  guest: Workspace,
): Workspace {
  const contacts = account.contacts.map((c) => ({ ...c }));
  const canonical = new Map<string, string>();
  for (const incoming of guest.contacts.filter((c) => !c.sample)) {
    const index = contacts.findIndex(
      (existing) =>
        existing.id === incoming.id ||
        (incoming.profileId && existing.profileId === incoming.profileId) ||
        incoming.links.some((l) => existing.links.some((e) => e.url === l.url)),
    );
    if (index < 0) {
      contacts.push(incoming);
      canonical.set(incoming.id, incoming.id);
      continue;
    }
    const existing = contacts[index];
    canonical.set(incoming.id, existing.id);
    contacts[index] = {
      ...existing,
      starred: existing.starred || incoming.starred,
      tags: [...new Set([...existing.tags, ...incoming.tags])],
      meetings: [
        ...new Map(
          [...existing.meetings, ...incoming.meetings].map((m) => [m.id, m]),
        ).values(),
      ].sort((a, b) => a.at.localeCompare(b.at)),
      links: [
        ...new Map(
          [...existing.links, ...incoming.links].map((l) => [l.url, l]),
        ).values(),
      ],
    };
  }
  return {
    ...account,
    contacts,
    projects: [
      ...new Map(
        [...account.projects, ...guest.projects.filter((p) => !p.sample)].map(
          (p) => [p.id, p],
        ),
      ).values(),
    ],
    reminders: [
      ...new Map(
        [
          ...account.reminders,
          ...guest.reminders
            .filter((r) => !r.sample)
            .map((r) => ({
              ...r,
              contactId: canonical.get(r.contactId) || r.contactId,
            })),
        ].map((r) => [r.id, r]),
      ).values(),
    ],
  };
}
