"use client";
import { onboardingRoles, profileRoles } from "@/lib/onboarding";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  MapPin,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { events } from "@/lib/events";
import type { Contact, Profile } from "@/lib/types";
import { contactFromProfile } from "@/lib/utils";
import { Avatar, Button, ButtonLink, EmptyState, Tag } from "./ui";
import { SaveContactDialog } from "./contact-tools";
import { useWorkspace } from "./workspace-provider";

type CheckIn = { profile: Profile; eventId: string; expiresAt: string };
export function VenuePresence({ eventId }: { eventId?: string }) {
  const { demo, data } = useWorkspace();
  const [event, setEvent] = useState(eventId || events[0].id);
  const [query, setQuery] = useState("");
  const [ecosystem, setEcosystem] = useState("");
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [builders, setBuilders] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [signIn, setSignIn] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");
  const [save, setSave] = useState<Partial<Contact> | null>(null);

  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    // Debounce search and cancel stale responses when filters change.
    const timer = setTimeout(
      async () => {
        setLoading(true);
        const params = new URLSearchParams({
          event,
          q: query,
          ecosystem,
          role,
          goal,
          page: String(page),
        });
        try {
          const response = await fetch(`/api/presence?${params}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          const result = await response.json();
          if (controller.signal.aborted) return;
          if (!response.ok) {
            setSignIn(response.status === 401);
            throw new Error(result.error || "Venue check-ins could not load.");
          }
          const active: CheckIn[] = result.builders.filter(
            (row: CheckIn) => Date.parse(row.expiresAt) > Date.now(),
          );
          setBuilders((old) =>
            page === 0
              ? active
              : [
                  ...new Map(
                    [...old, ...active].map((row) => [row.profile.id, row]),
                  ).values(),
                ],
          );
          setHasMore(result.hasMore);
          setCheckedAt(result.checkedAt);
          setError("");
          setSignIn(false);
        } catch (err) {
          if (!controller.signal.aborted) {
            setError(
              err instanceof Error
                ? err.message
                : "Venue check-ins could not load.",
            );
            setBuilders([]);
            setHasMore(false);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query ? 250 : 0,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [event, query, ecosystem, role, goal, page, refresh, demo]);

  useEffect(() => {
    if (!builders.length) return;
    const nearest = Math.min(
      ...builders.map((row) => Date.parse(row.expiresAt)),
    );
    const timer = setTimeout(
      () =>
        setBuilders((rows) =>
          rows.filter((row) => Date.parse(row.expiresAt) > Date.now()),
        ),
      Math.max(0, nearest - Date.now()) + 10,
    );
    return () => clearTimeout(timer);
  }, [builders]);
  const change = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(0);
    setBuilders([]);
    setCheckedAt("");
    setLoading(true);
  };
  const visible = builders.filter(
    (row) => !data.blocked.includes(row.profile.id),
  );
  const venue = events.find((e) => e.id === event)!;
  return (
    <section className="venue-discovery" aria-label="Venue check-ins">
      <div className="presence-heading">
        <div>
          <span className="app-eyebrow">HERE BY CHOICE</span>
          <h2>A good time to say hello.</h2>
          <p>
            Builders sharing a check-in at {venue.shortName}. Venue only, never
            a person’s exact location.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={loading || demo}
          onClick={() => {
            setPage(0);
            setBuilders([]);
            setRefresh((v) => v + 1);
          }}
        >
          <RefreshCw size={14} />
          Refresh check-ins
        </Button>
      </div>
      {!eventId && (
        <label className="presence-event-label">
          Choose a venue
          <select
            value={event}
            onChange={(e) => change(setEvent, e.target.value)}
          >
            {events.map((e) => (
              <option value={e.id} key={e.id}>
                {e.name} · {e.venue}
              </option>
            ))}
          </select>
        </label>
      )}
      {demo ? (
        <EmptyState
          icon={<MapPin size={24} />}
          title="Presence comes from people."
          description="Live venue check-ins aren’t simulated in the sample workspace. Return to your own workspace and sign in to see voluntary check-ins."
        />
      ) : (
        <>
          <div className="search-filter-bar presence-filters">
            <label className="app-search">
              <Search size={16} />
              <input
                aria-label="Search venue builders"
                placeholder="Search names, skills, or projects…"
                value={query}
                onChange={(e) => change(setQuery, e.target.value)}
              />
            </label>
            <select
              className="filter-select"
              aria-label="Venue ecosystem"
              value={ecosystem}
              onChange={(e) => change(setEcosystem, e.target.value)}
            >
              <option value="">All ecosystems</option>
              {[
                "Ethereum",
                "Solana",
                "Base",
                "Polygon",
                "AI",
                "DeFi",
                "Infrastructure",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              className="filter-select"
              aria-label="Venue role"
              value={role}
              onChange={(e) => change(setRole, e.target.value)}
            >
              <option value="">All roles</option>
              {[...onboardingRoles, "Recruiter"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              className="filter-select"
              aria-label="Venue collaboration goal"
              value={goal}
              onChange={(e) => change(setGoal, e.target.value)}
            >
              <option value="">Any goal</option>
              {[
                "Co-founder",
                "Hiring",
                "Collaborators",
                "Seeking users",
                "Seeking funding",
                "Open to collaboration",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          {loading && !builders.length ? (
            <p className="collaboration-loading" role="status">
              Checking voluntary venue visibility…
            </p>
          ) : visible.length ? (
            <>
              <p className="results-count">
                {visible.length} active check-in
                {visible.length === 1 ? "" : "s"} in this result
                {checkedAt &&
                  ` · refreshed ${new Date(checkedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`}
              </p>
              <div className="builder-grid">
                {visible.map(({ profile: p, expiresAt }) => (
                  <article className="builder-card presence-builder" key={p.id}>
                    <div className="builder-card-top">
                      <Avatar name={p.name} src={p.avatar} size="lg" />
                      <div className="tag-row profile-role-tags">
                        {profileRoles(p).map((role) => (
                          <Tag key={role}>{role}</Tag>
                        ))}
                      </div>
                    </div>
                    <Link href={`/u/${p.username}`}>
                      <h3>
                        {p.name}
                        <ArrowUpRight size={15} />
                      </h3>
                    </Link>
                    <p className="builder-headline">{p.headline}</p>
                    <p className="builder-bio">{p.bio}</p>
                    <div className="tag-row">
                      {p.tags.slice(0, 3).map((t) => (
                        <Tag key={t} color="gray">
                          {t}
                        </Tag>
                      ))}
                    </div>
                    <div className="builder-looking">
                      <span>OPEN TO</span>
                      {p.lookingFor.join(" · ") || "Good conversations"}
                    </div>
                    <p className="presence-expires">
                      <Clock3 size={13} />
                      Check-in expires{" "}
                      {new Date(expiresAt).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => setSave(contactFromProfile(p))}
                    >
                      <Plus size={14} />
                      Save connection
                    </Button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={<MapPin size={25} />}
              title={
                error
                  ? "Venue visibility is unavailable."
                  : "Room for the next hello."
              }
              description={
                error
                  ? "No check-ins are shown while the service is unavailable."
                  : "No active, opted-in builders match these filters. Try another venue or check back when people choose to share."
              }
            >
              {signIn ? (
                <ButtonLink href="/login" variant="secondary">
                  Sign in to see check-ins
                </ButtonLink>
              ) : (
                <ButtonLink
                  href={`/app/events/${venue.slug}`}
                  variant="secondary"
                >
                  Open venue & check-in controls
                </ButtonLink>
              )}
            </EmptyState>
          )}
          {hasMore && (
            <div className="load-more">
              <Button
                variant="secondary"
                disabled={loading}
                onClick={() => setPage((v) => v + 1)}
              >
                {loading ? "Loading…" : "More venue builders"}
              </Button>
            </div>
          )}
          <p className="collaboration-footnote">
            Check-ins expire after 2 hours or when turned off. Refresh to see
            early departures. Visibility also requires a public, discoverable
            profile; blocked builders are excluded.
          </p>
        </>
      )}
      {save && (
        <SaveContactDialog
          open
          initial={save}
          initialEventId={event}
          onOpenChange={(open) => {
            if (!open) setSave(null);
          }}
        />
      )}
    </section>
  );
}
