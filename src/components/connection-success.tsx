"use client";
import { useEffect, useRef } from "react";
import { Check, Link2, ScanLine, ArrowRight } from "lucide-react";
import { eventById } from "@/lib/events";
import { Avatar, Button, ButtonLink } from "./ui";
import { useWorkspace } from "./workspace-provider";
export type SavedConnection = {
  id: string;
  name: string;
  headline: string;
  avatar: string;
  external: boolean;
  eventId: string;
  at: string;
};
export function ConnectionBridge({
  person,
  incoming = false,
}: {
  person: { name: string; avatar?: string };
  incoming?: boolean;
}) {
  const { data } = useWorkspace();
  return (
    <div
      className={`connection-bridge ${incoming ? "incoming" : ""}`}
      aria-hidden="true"
    >
      <div className="bridge-person bridge-you">
        <Avatar
          name={data.profile?.name || "You"}
          src={data.profile?.avatar}
          size="lg"
        />
      </div>
      <span className="bridge-line" />
      <span className="bridge-link">
        <Link2 size={22} />
      </span>
      <div className="bridge-person bridge-them">
        <Avatar name={person.name} src={person.avatar} size="lg" />
      </div>
      <span className="bridge-check">
        <span className="success-ripple" />
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" />
          <path d="m14 24 7 7 14-15" />
        </svg>
      </span>
      <i className="bridge-spark spark-a" />
      <i className="bridge-spark spark-b" />
      <i className="bridge-spark spark-c" />
    </div>
  );
}
export function ConnectionSuccess({
  saved,
  onNext,
}: {
  saved: SavedConnection;
  onNext: () => void;
}) {
  const { user, data } = useWorkspace();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [saved.id]);
  return (
    <section
      ref={panel}
      className="scan-saved connection-success"
      role="status"
      aria-live="polite"
    >
      <p className="app-eyebrow">
        <Check size={13} /> CONNECTION SAVED
      </p>
      <ConnectionBridge person={saved} />
      <p className="connection-success-title">
        {saved.external ? "Link saved successfully." : "Connection successful."}
      </p>
      <h2>{saved.name}</h2>
      <p className="success-headline">{saved.headline}</p>
      {saved.external && (
        <p className="scan-link-disclosure">
          This QR shared a link. A personal name wasn’t included.
        </p>
      )}
      <p className="scan-saved-footnote">
        Saved on this device{user ? " · cloud sync queued" : ""}.
      </p>
      <p className="scan-meeting-context">
        {eventById(saved.eventId)?.name || "No event selected"}
        <span> · </span>
        {new Date(saved.at).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
      {user && data.profile?.public && !saved.external && (
        <p className="success-receipt-note">
          Connection activity updates after cloud sync. Your notes stay private.
        </p>
      )}
      <div className="button-row">
        <Button onClick={onNext}>
          <ScanLine size={17} /> Scan next
        </Button>
        <ButtonLink href={`/app/people/${saved.id}`} variant="secondary">
          View connection
          <ArrowRight size={15} />
        </ButtonLink>
      </div>
    </section>
  );
}
