"use client";
import { events } from "@/lib/events";
import type { EventInfo } from "@/lib/types";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ExternalLink,
  List,
  Map as MapIcon,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink, EmptyState, Modal, Tag } from "./ui";
import { useWorkspace } from "./workspace-provider";
import { EventArtwork, EventLogo } from "./event-brand";
const VenuePresence = dynamic(() =>
  import("./venue-presence").then((m) => m.VenuePresence),
);
const VenueMap = dynamic(() => import("./venue-map").then((m) => m.VenueMap), {
  ssr: false,
  loading: () => <div className="map-loading">Loading the venue map…</div>,
});
export function EventsDirectory({ mapFirst = false }: { mapFirst?: boolean }) {
  const { data, update, toast } = useWorkspace();
  const [view, setView] = useState(mapFirst ? "Map" : "List");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [submit, setSubmit] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const filtered = events.filter(
    (e) =>
      (!savedOnly || data.eventBookmarks.includes(e.id)) &&
      `${e.name} ${e.venue} ${e.city}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">SEE YOU IN THE HALLWAY</span>
          <h1>
            {mapFirst
              ? "Good places to find your people."
              : "One city. So many possibilities."}
          </h1>
          <p>
            Verified events. Real venues. A little less “where was that again?”
          </p>
        </div>
        <Button variant="secondary" onClick={() => setSubmit(true)}>
          <Plus size={14} />
          Submit an event
        </Button>
      </div>
      <div className="search-filter-bar">
        <label className="app-search">
          <Search size={17} />
          <input
            aria-label="Find an event or venue"
            placeholder="Find an event or venue…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Button
          className={`saved-events-toggle ${savedOnly ? "selected" : ""}`}
          variant="secondary"
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly((v) => !v)}
        >
          <Bookmark size={14} fill={savedOnly ? "currentColor" : "none"} />
          Saved events<span>{data.eventBookmarks.length}</span>
        </Button>
        <div className="app-view-switch">
          {["List", "Map"].map((v) => (
            <button
              className={v === view ? "active" : ""}
              aria-pressed={v === view}
              key={v}
              onClick={() => setView(v)}
            >
              {v === "List" ? <List size={14} /> : <MapIcon size={14} />} {v}
            </button>
          ))}
        </div>
      </div>
      <div className="events-source-note">
        <ShieldCheck size={13} /> Organizer sources checked 25 Oct 2026 ·
        Confirm details before travelling.
      </div>
      {view === "Map" && <VenueMap events={filtered} selected={selected} />}
      <div
        className={`directory-events ${view === "Map" ? "map-venue-cards" : ""}`}
      >
        {filtered.map((e) => (
          <article className="directory-event" key={e.id}>
            <EventArtwork event={e} />
            <div className="directory-event-content">
              <div className="directory-event-top">
                <Tag>VERIFIED SOURCE</Tag>
                <span className="event-card-date">
                  <CalendarDays size={12} />
                  {e.dates}
                </span>
                <button
                  className={`icon-button ${data.eventBookmarks.includes(e.id) ? "bookmarked" : ""}`}
                  aria-pressed={data.eventBookmarks.includes(e.id)}
                  aria-label={`Bookmark ${e.name}`}
                  onClick={() => {
                    update((w) => ({
                      ...w,
                      eventBookmarks: w.eventBookmarks.includes(e.id)
                        ? w.eventBookmarks.filter((v) => v !== e.id)
                        : [...w.eventBookmarks, e.id],
                    }));
                    toast("Event bookmark updated.");
                  }}
                >
                  <Bookmark
                    size={16}
                    fill={
                      data.eventBookmarks.includes(e.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </div>
              <Link href={`/app/events/${e.slug}`}>
                <h2>
                  {e.name}
                  <ArrowUpRight size={18} />
                </h2>
              </Link>
              <p>{e.description}</p>
              <span className="event-location">
                <MapPin size={13} />
                {e.venue} · Mumbai
              </span>
              <div className="directory-event-actions">
                <Link href={`/app/events/${e.slug}`}>
                  Event details
                  <ArrowUpRight size={14} />
                </Link>
                {view === "Map" ? (
                  <button onClick={() => setSelected(e.id)}>
                    Find on map
                    <MapPin size={13} />
                  </button>
                ) : (
                  <a href={e.website} target="_blank" rel="noopener noreferrer">
                    Official website
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState
          title={
            savedOnly
              ? "Your event shortlist starts here."
              : "No events match, yet."
          }
          description={
            savedOnly
              ? "Bookmark a conference to keep its dates and venue close."
              : "Try a different event name or venue."
          }
        >
          <Button
            variant="secondary"
            onClick={() => {
              setSavedOnly(false);
              setQuery("");
            }}
          >
            Show all events
          </Button>
        </EmptyState>
      )}
      <div className="official-links-panel">
        <span>
          <ExternalLink size={17} />
        </span>
        <div>
          <h3>Your official conference apps, a click away.</h3>
          <p>
            Schedule, tickets, and event resources live with their organizers.
            These are external links, not connected accounts.
          </p>
        </div>
        <a
          href="https://connect.indiablockchainweek.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <EventLogo event={events[1]} decorative />
          Open IBW Connect
          <ArrowUpRight size={13} />
        </a>
        <a
          href="https://app.devcon.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <EventLogo event={events[0]} decorative />
          Devcon app
          <ArrowUpRight size={13} />
        </a>
      </div>
      <EventSubmit open={submit} onOpenChange={setSubmit} />
    </div>
  );
}
export function EventDetail({ event: e }: { event: EventInfo }) {
  const { data, update, user, toast } = useWorkspace();
  const [presence, setPresence] = useState("");
  const [presenceError, setPresenceError] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void fetch(`/api/checkins?event=${encodeURIComponent(e.id)}`)
      .then((r) => r.json())
      .then((result) => {
        if (active) setPresence(result.expiresAt || "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, e.id]);
  useEffect(() => {
    if (!presence) return;
    const timeout = setTimeout(
      () => setPresence(""),
      Math.max(0, new Date(presence).getTime() - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [presence]);
  const checkIn = async () => {
    setPresenceError("");
    if (!user) {
      setPresenceError(
        "Sign in to opt into a venue-level check-in. Your GPS coordinates are never shared.",
      );
      return;
    }
    setCheckingIn(true);
    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: e.id, active: !presence }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPresence(presence ? "" : result.expiresAt);
      toast(
        presence
          ? "Venue visibility turned off."
          : "Venue check-in active for 2 hours.",
      );
    } catch (err) {
      setPresenceError(
        err instanceof Error ? err.message : "Check-in unavailable.",
      );
    } finally {
      setCheckingIn(false);
    }
  };
  return (
    <div>
      <Link className="back-link" href="/app/events">
        <ArrowLeft size={14} />
        Back to events
      </Link>
      <div
        className={`event-detail-hero branded-detail-hero conference-${e.id === "ibw-2026" ? "ibw" : e.id === "solana-2026" ? "solana" : "devcon"}`}
        style={{ "--event-color": e.color } as React.CSSProperties}
      >
        <div className="event-detail-brand">
          <EventLogo event={e} decorative />
        </div>
        <div>
          <Tag>ORGANIZER-VERIFIED DETAILS</Tag>
          <h1>{e.name}</h1>
          <p>
            <CalendarDays size={15} />
            {e.dates}
            <span>·</span>
            <MapPin size={15} />
            Mumbai, India
          </p>
        </div>
        <a
          className="button button-secondary"
          href={e.website}
          target="_blank"
          rel="noopener noreferrer"
        >
          Official website
          <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="detail-grid">
        <div>
          <section className="app-panel project-story">
            <span className="app-eyebrow">A GOOD PLACE TO START</span>
            <h2>The people. The ideas. The possibilities.</h2>
            <p>{e.description}</p>
            <div className="event-organizer">
              <Users size={15} />
              Organized by {e.organizer}
            </div>
            <div className="button-row">
              <a
                className="button button-secondary"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${e.venue}, ${e.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={15} />
                Get directions
              </a>
              <Button
                variant="secondary"
                onClick={() => {
                  const start = e.start.replaceAll("-", "");
                  const endDate = new Date(`${e.end}T00:00:00Z`);
                  endDate.setUTCDate(endDate.getUTCDate() + 1);
                  const end = endDate
                    .toISOString()
                    .slice(0, 10)
                    .replaceAll("-", "");
                  const esc = (s: string) =>
                    s.replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
                  const blob = new Blob(
                    [
                      `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Connect IRL//Event Calendar//EN\r\nBEGIN:VEVENT\r\nUID:${e.id}@connectirl.xyz\r\nDTSTAMP:${new Date()
                        .toISOString()
                        .replace(/[-:]/g, "")
                        .replace(
                          /\.\d{3}/,
                          "",
                        )}\r\nDTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}\r\nSUMMARY:${esc(e.name)}\r\nLOCATION:${esc(`${e.venue}, ${e.address}`)}\r\nURL:${e.website}\r\nEND:VEVENT\r\nEND:VCALENDAR`,
                    ],
                    { type: "text/calendar" },
                  );
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${e.slug}.ics`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                }}
              >
                <CalendarDays size={15} />
                Add to calendar
              </Button>
            </div>
          </section>
          <VenueMap events={[e]} selected={e.id} />
        </div>
        <aside>
          <section className="app-panel contact-context">
            <h3>Meet you there.</h3>
            <dl>
              <dt>When</dt>
              <dd>{e.dates}</dd>
              <dt>Venue</dt>
              <dd>{e.venue}</dd>
              <dt>Address</dt>
              <dd>{e.address}</dd>
              <dt>Source</dt>
              <dd>
                <a href={e.source} target="_blank" rel="noopener noreferrer">
                  Official organizer
                  <ArrowUpRight size={12} />
                </a>
              </dd>
            </dl>
            <p className="form-footnote">
              Checked 25 October 2026. Confirm details with the organizer before
              travelling.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                update((w) => ({
                  ...w,
                  eventBookmarks: w.eventBookmarks.includes(e.id)
                    ? w.eventBookmarks.filter((id) => id !== e.id)
                    : [...w.eventBookmarks, e.id],
                }));
                toast("Event bookmark updated.");
              }}
            >
              <Bookmark size={14} />
              {data.eventBookmarks.includes(e.id)
                ? "Event saved"
                : "Save event"}
            </Button>
          </section>
          <section className="app-panel venue-presence">
            <MapPin size={21} />
            <h3>Let people know you’re here.</h3>
            <p>
              Optional venue-level visibility. Expires in 2 hours. Your exact
              location is never shared.
            </p>
            <Button
              variant="secondary"
              disabled={checkingIn}
              onClick={() => void checkIn()}
            >
              {presence ? "Turn off visibility" : "Check in to this venue"}
            </Button>
            {presence && (
              <p className="presence-active">
                <Check size={12} />
                Visible until{" "}
                {new Date(presence).toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
            {presenceError && <p className="form-error">{presenceError}</p>}
          </section>
        </aside>
      </div>
      <VenuePresence key={`${e.id}:${presence}`} eventId={e.id} />
    </div>
  );
}
function EventSubmit({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user, toast } = useWorkspace();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Another good place to connect?"
      description="Submit an official event link. New events are reviewed before appearing publicly."
    >
      {user ? (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const response = await fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, url, notes }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              toast("Event submitted for review.");
              onOpenChange(false);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Submission failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Event name
            <input
              required
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Official event link
            <input
              required
              type="url"
              maxLength={2048}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label>
            Anything else to know?
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button disabled={busy}>
            {busy ? "Submitting…" : "Submit for review"}
          </Button>
        </form>
      ) : (
        <div className="form-stack">
          <p className="notice">
            Sign in to submit an event so the reviewer can follow up with you.
          </p>
          <ButtonLink href="/login">Sign in to continue</ButtonLink>
        </div>
      )}
    </Modal>
  );
}
