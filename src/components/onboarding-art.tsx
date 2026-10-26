import {
  CircleUserRound,
  Code2,
  FlaskConical,
  GraduationCap,
  Layers,
  MapPin,
  PenTool,
  Rocket,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { EventInfo } from "@/lib/types";
import { EventLogo } from "./event-brand";

// Decorative, original illustrations for each onboarding step. They react to
// what the person has chosen so far, and are hidden from assistive technology.
const roleIcons = {
  Builder: Layers,
  Developer: Code2,
  Engineer: Code2,
  Founder: Rocket,
  Designer: PenTool,
  Investor: Wallet,
  Trader: Wallet,
  "Crypto enthusiast": Sparkles,
  Community: Users,
  Researcher: FlaskConical,
  Student: GraduationCap,
  Other: CircleUserRound,
} as const;
export const stepArtTitles = [
  ["Every hello is a beginning.", "Let’s start with your name."],
  ["Wear as many hats as you like.", "Your roles help the right people find you."],
  ["Find your people faster.", "Tell us what you’re into and what you’re after."],
  ["Make it easy to say hello.", "Your links and photo travel with every QR scan."],
  ["Meet them where it happens.", "Connections remember the event and the moment."],
] as const;
export function OnboardingArt({
  step,
  name,
  roles,
  allRoles,
  signals,
  avatar,
  handle,
  selected,
  events,
}: {
  step: number;
  name: string;
  roles: string[];
  allRoles: readonly string[];
  signals: number;
  avatar: string;
  handle: string;
  selected: string[];
  events: EventInfo[];
}) {
  const first = name.trim().split(/\s+/)[0];
  const initial = (first || "?").slice(0, 1).toUpperCase();
  return (
    <div className={`onb-stage onb-stage-${step}`} aria-hidden="true">
      {step === 0 && (
        <div className="onb-hello">
          <span className="onb-ring onb-ring-1" />
          <span className="onb-ring onb-ring-2" />
          <span className="onb-ring onb-ring-3" />
          <span className="onb-orbit-dot onb-orbit-dot-1" />
          <span className="onb-orbit-dot onb-orbit-dot-2" />
          <span className="onb-orbit-dot onb-orbit-dot-3" />
          <div className="onb-avatar-big" key={initial}>
            {initial}
          </div>
          <div className="onb-bubble">
            Hi{first ? `, ${first.slice(0, 14)}` : " there"}!
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="onb-roles">
          <div className="onb-roles-core">
            <Sparkles size={26} />
          </div>
          {allRoles.map((role, index) => {
            const Icon = roleIcons[role as keyof typeof roleIcons] || Sparkles;
            return (
              <span
                key={role}
                className={`onb-role-bubble ${roles.includes(role) ? "on" : ""}`}
                style={
                  {
                    "--a": `${(360 / allRoles.length) * index}deg`,
                    "--d": `${(index % 5) * 0.35}s`,
                  } as CSSProperties
                }
              >
                <i>
                  <Icon size={19} />
                </i>
              </span>
            );
          })}
        </div>
      )}
      {step === 2 && (
        <svg className="onb-network" viewBox="0 0 320 320">
          {Array.from({ length: 8 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
            const x = 160 + Math.cos(angle) * 112;
            const y = 160 + Math.sin(angle) * 112;
            const on = index < signals;
            return (
              <g key={index} className={on ? "on" : ""}>
                <line x1="160" y1="160" x2={x} y2={y} />
                <circle cx={x} cy={y} r={on ? 14 : 9} />
              </g>
            );
          })}
          <circle className="onb-network-core" cx="160" cy="160" r="30" />
          <circle className="onb-network-pulse" cx="160" cy="160" r="30" />
          <circle cx="160" cy="153" r="8" fill="#08271f" />
          <path
            d="M143 178c2-11 10-16 17-16s15 5 17 16Z"
            fill="#08271f"
          />
        </svg>
      )}
      {step === 3 && (
        <div className="onb-links">
          <span className="onb-ring onb-ring-1" />
          <span className="onb-ring onb-ring-2" />
          <div className="onb-link-avatar">
            {avatar ? <img src={avatar} alt="" /> : initial}
          </div>
          {handle && <div className="onb-handle">@{handle}</div>}
          {["x", "linkedin", "github", "telegram"].map((brand, index) => (
            <span
              key={brand}
              className={`onb-chip onb-chip-${index + 1}`}
              style={{ "--d": `${index * 0.5}s` } as CSSProperties}
            >
              <img src={`/brands/${brand}.svg`} alt="" width={22} height={22} />
            </span>
          ))}
        </div>
      )}
      {step === 4 && (
        <div className="onb-events">
          <span className="onb-pin">
            <MapPin size={22} />
          </span>
          {events.map((item, index) => (
            <div
              key={item.id}
              className={`onb-event-card onb-event-card-${index + 1} ${selected.includes(item.id) ? (selected.length === 1 ? "on solo" : "on") : ""}`}
            >
              <EventLogo event={item} decorative />
            </div>
          ))}
          <div className="onb-event-base">MUMBAI · NOV 2026</div>
        </div>
      )}
    </div>
  );
}
