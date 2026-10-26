import type { MetadataRoute } from "next";
import { events } from "@/lib/events";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://connectirl.xyz";
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    ...events.map((e) => ({
      url: `${origin}/events/${e.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
