import type { EventInfo } from "./types";
// Organizer sources checked 2026-10-25. Coordinates locate public venues, never people.
export const events: EventInfo[] = [
  {
    id: "devcon-8",
    slug: "devcon-8-india",
    name: "Devcon 8 India",
    shortName: "Devcon",
    dates: "NOV 3–6, 2026",
    start: "2026-11-03",
    end: "2026-11-06",
    venue: "Jio World Convention Centre",
    address: "G Block, Bandra Kurla Complex, Bandra East, Mumbai 400051",
    city: "Mumbai, India",
    coordinates: [72.8785, 19.0632],
    website: "https://devcon.org/en/",
    source: "https://devcon.org/en/travel-guide/",
    organizer: "Ethereum Foundation",
    description:
      "Four days with the people building free, open, private, and verifiable systems. Meet the Ethereum community in Mumbai.",
    color: "#7961c9",
    symbol: "◈",
  },
  {
    id: "ibw-2026",
    slug: "india-blockchain-week-2026",
    name: "India Blockchain Week",
    shortName: "IBW",
    dates: "NOV 1–2, 2026",
    start: "2026-11-01",
    end: "2026-11-02",
    venue: "Fairmont Mumbai",
    address:
      "Terminal 2, Chhatrapati Shivaji Maharaj International Airport, Mumbai 400099",
    city: "Mumbai, India",
    coordinates: [72.8745, 19.1013],
    website: "https://indiablockchainweek.com/",
    source: "https://indiablockchainweek.com/",
    organizer: "Hashed Emergent",
    description:
      "India’s flagship blockchain gathering. Two days of conversations, ideas, and connections across the global ecosystem.",
    color: "#bb4c9e",
    symbol: "✳",
  },
  {
    id: "solana-2026",
    slug: "solana-summit-india-2026",
    name: "Solana Summit India",
    shortName: "Solana Summit",
    dates: "NOV 2, 2026",
    start: "2026-11-02",
    end: "2026-11-02",
    venue: "JW Marriott Mumbai Sahar",
    address:
      "IA Project Road, Chhatrapati Shivaji International Airport, Andheri East, Mumbai 400099",
    city: "Mumbai, India",
    coordinates: [72.8781, 19.1035],
    website: "https://www.solanasummit.in/",
    source: "https://www.solanasummit.in/",
    organizer: "Superteam India",
    description:
      "A day of talks and workshops for founders, developers, and creatives building on Solana.",
    color: "#332b55",
    symbol: "≋",
  },
  {
    id: "ethglobal-2026",
    slug: "ethglobal-mumbai-2026",
    name: "ETHGlobal Mumbai",
    shortName: "ETHGlobal",
    dates: "NOV 5–7, 2026",
    start: "2026-11-05",
    end: "2026-11-07",
    venue: "Jio World Convention Centre",
    address: "G Block, Bandra Kurla Complex, Bandra East, Mumbai 400051",
    city: "Mumbai, India",
    coordinates: [72.879, 19.0636],
    website: "https://ethglobal.com/events/mumbai",
    source: "https://ethglobal.com/events",
    organizer: "ETHGlobal",
    description:
      "Three days of hacking with Ethereum builders from across India and the world, the same week as Devcon.",
    color: "#2d5bff",
    symbol: "◇",
  },
];
export function eventById(id: string) {
  return events.find((e) => e.id === id || e.slug === id);
}
/** Events the user is attending. Older saved workspaces only stored the current event. */
export function attendingEventIds(workspace: {
  eventIds?: string[];
  activeEventId?: string;
}) {
  const ids = workspace.eventIds?.length
    ? workspace.eventIds
    : workspace.activeEventId
      ? [workspace.activeEventId]
      : [];
  return ids.filter((id) => events.some((event) => event.id === id));
}
/** Keeps the current event among those attended, falling back to the earliest one. */
export function currentEventFor(ids: string[], preferred = "") {
  if (preferred && ids.includes(preferred)) return preferred;
  return (
    [...ids]
      .map((id) => events.find((event) => event.id === id))
      .filter((event): event is EventInfo => Boolean(event))
      .sort((a, b) => a.start.localeCompare(b.start))[0]?.id || ""
  );
}
