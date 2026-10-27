"use client";
import { attendingEventIds, currentEventFor, eventById } from "@/lib/events";
import type { Profile } from "@/lib/types";
import { profileRoles } from "@/lib/onboarding";
import { contactFromProfile } from "@/lib/utils";
import { Check, LogIn, MapPin, RefreshCw, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { EventPicker } from "./event-picker";
import { Avatar, Button, ButtonLink, EmptyState } from "./ui";
import { useWorkspace } from "./workspace-provider";

type Nearby = { profile: Profile; eventId: string; expiresAt: string };
const coverHue = (name: string) =>
  120 + ([...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 80);
const clock = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(
    new Date(value),
  );

// People at the same event who chose to be visible, with one-tap connect.
// Venue-level only: no GPS or exact location is collected or shown.
export function NearbyNow() {
  const { data, user, demo, saveContact, toast } = useWorkspace();
  const eventId = currentEventFor(attendingEventIds(data), data.activeEventId);
  const event = eventById(eventId);
  const profile = data.profile;
  const visibleProfile = Boolean(profile?.public && profile.discoverable);
  const [people, setPeople] = useState<Nearby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState("");
  const [visibleUntil, setVisibleUntil] = useState("");
  const [toggling, setToggling] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const ready = Boolean(user && !demo && eventId);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const [presence, checkin] = await Promise.all([
          fetch(`/api/presence?event=${encodeURIComponent(eventId)}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/checkins?event=${encodeURIComponent(eventId)}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);
        const result = await presence.json();
        const mine = await checkin.json();
        if (!presence.ok)
          throw new Error(result.error || "Nearby people could not load.");
        setPeople(
          (result.builders as Nearby[]).filter(
            (row) =>
              row.profile.id !== user?.id &&
              Date.parse(row.expiresAt) > Date.now(),
          ),
        );
        setCheckedAt(result.checkedAt);
        setVisibleUntil(mine.expiresAt || "");
        setError("");
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Nearby people could not load.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [ready, eventId, user?.id, refresh]);

  const setVisibility = useCallback(
    async (active: boolean) => {
      setToggling(true);
      try {
        const response = await fetch("/api/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, active }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Visibility could not change.");
        setVisibleUntil(active ? result.expiresAt : "");
        toast(
          active
            ? "You’re visible to people here for the next two hours."
            : "You’re hidden from Nearby.",
        );
        setRefresh((value) => value + 1);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Visibility could not change.");
      } finally {
        setToggling(false);
      }
    },
    [eventId, toast],
  );

  // Keep a visible check-in fresh while this screen is open.
  useEffect(() => {
    if (!visibleUntil) return;
    const renewAt = Date.parse(visibleUntil) - 90 * 60 * 1000;
    const timer = setTimeout(
      () => void setVisibility(true),
      Math.max(60_000, renewAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [visibleUntil, setVisibility]);

  const heading = (
    <div className="page-heading">
      <div>
        <span className="app-eyebrow">WHO’S HERE</span>
        <h1>Nearby now</h1>
        <p>
          People {event ? `at ${event.shortName}` : "at your event"} who chose
          to be visible. Tap Connect, and when they save you back you’re both
          connected.
        </p>
      </div>
    </div>
  );
  if (demo || !user)
    return (
      <div className="nearby">
        {heading}
        <EmptyState
          icon={<MapPin size={26} />}
          title="Sign in to see who’s here."
          description="Nearby shows people at your event who chose to be visible. It needs an account so everyone stays accountable."
        >
          <ButtonLink href="/login">
            <LogIn size={15} />
            Sign in
          </ButtonLink>
        </EmptyState>
      </div>
    );
  if (!eventId)
    return (
      <div className="nearby">
        {heading}
        <div className="nearby-setup">
          <strong>Which event are you at?</strong>
          <p>Choose it here and you’ll see who’s around.</p>
          <EventPicker />
        </div>
      </div>
    );
  // The check-in API only returns unexpired check-ins, and the screen renews them.
  const visible = Boolean(visibleUntil);
  const shown = people.filter((row) => !data.blocked.includes(row.profile.id));
  return (
    <div className="nearby">
      {heading}
      <div className={`nearby-visibility ${visible ? "on" : ""}`}>
        <span className="nearby-pulse" aria-hidden="true">
          <MapPin size={18} />
        </span>
        <div>
          <strong>{visible ? "You’re visible here" : "You’re hidden"}</strong>
          <span>
            {!visibleProfile
              ? "Make your profile public and discoverable to appear."
              : visible
                ? `People at ${event?.shortName} can find you until ${clock(visibleUntil)}.`
                : `Show yourself to people at ${event?.shortName} for two hours.`}
          </span>
        </div>
        {visibleProfile ? (
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            aria-label="Show me to people nearby"
            className="set-switch"
            disabled={toggling}
            onClick={() => void setVisibility(!visible)}
          >
            <span />
          </button>
        ) : (
          <ButtonLink href="/app/profile" variant="secondary">
            Edit profile
          </ButtonLink>
        )}
      </div>
      <div className="nearby-toolbar">
        <span>
          {loading
            ? "Looking around…"
            : `${shown.length} ${shown.length === 1 ? "person" : "people"} here${checkedAt ? ` · updated ${clock(checkedAt)}` : ""}`}
        </span>
        <Button
          variant="ghost"
          onClick={() => {
            setLoading(true);
            setRefresh((value) => value + 1);
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : !loading && !shown.length ? (
        <EmptyState
          icon={<MapPin size={26} />}
          title="No one visible yet."
          description="As people at this event switch on visibility, they’ll appear here. Your QR always works too."
        />
      ) : (
        <div className="contact-card-grid nearby-grid">
          {shown.map(({ profile: person }) => {
            const connected = data.contacts.some(
              (contact) => contact.profileId === person.id,
            );
            return (
              <div
                key={person.id}
                className="contact-card"
                style={{ "--hue": coverHue(person.name) } as CSSProperties}
              >
                <div className="contact-card-link">
                  <span className="contact-card-cover" aria-hidden="true" />
                  <Avatar name={person.name} src={person.avatar} size="xl" />
                  <strong>{person.name}</strong>
                  <small>
                    {person.headline || profileRoles(person).join(" · ")}
                  </small>
                  {connected ? (
                    <span className="contact-card-meta">
                      <Check size={12} /> Connected
                    </span>
                  ) : (
                    <Button
                      className="nearby-connect"
                      onClick={() => {
                        saveContact(contactFromProfile(person), "", eventId);
                        toast(
                          `Saved ${person.name.split(" ")[0]}. They’ll see you connected.`,
                        );
                      }}
                    >
                      <UserPlus size={14} />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="nearby-privacy">
        Venue only. Nobody’s exact location is collected or shown, and
        visibility switches itself off after two hours.
      </p>
    </div>
  );
}
