import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { eventBrands } from "@/lib/event-brands";
import type { EventInfo } from "@/lib/types";

export function EventLogo({
  event,
  className = "",
  decorative = false,
}: {
  event: EventInfo;
  className?: string;
  decorative?: boolean;
}) {
  const brand = eventBrands[event.id];
  if (!brand)
    return <span className={`event-logo ${className}`}>{event.shortName}</span>;
  return (
    <span className={`event-logo event-logo-${brand.theme} ${className}`}>
      <Image
        src={brand.src}
        width={brand.width}
        height={brand.height}
        alt={decorative ? "" : `${event.shortName} logo`}
        unoptimized
        draggable={false}
      />
    </span>
  );
}

export function EventArtwork({
  event,
  compact = false,
}: {
  event: EventInfo;
  compact?: boolean;
}) {
  const theme = eventBrands[event.id]?.theme || "devcon";
  return (
    <div
      className={`conference-art conference-${theme} ${compact ? "conference-art-compact" : ""}`}
      aria-hidden="true"
    >
      <span className="conference-art-orbit orbit-one" />
      <span className="conference-art-orbit orbit-two" />
      <div className="conference-art-top">
        <span>
          <MapPin size={11} />
          MUMBAI, INDIA
        </span>
        <ArrowUpRight size={17} />
      </div>
      <EventLogo event={event} decorative />
      <div className="conference-art-bottom">
        <span>{event.dates}</span>
        <span>MEET. BUILD. BELONG.</span>
      </div>
    </div>
  );
}
