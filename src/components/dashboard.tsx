"use client";
import { events } from "@/lib/events";
import { prettyDate } from "@/lib/utils";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Compass,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ContactCard } from "./contact-tools";
import { ConnectLink } from "./connect-link";
import { ShareQR } from "./qr";
import { Button, ButtonLink, EmptyState } from "./ui";
import { useWorkspace } from "./workspace-provider";
import { EventArtwork } from "./event-brand";
export function Dashboard() {
  const { data, demo, setDemo, user, update } = useWorkspace();
  const [qr, setQr] = useState(false);
  const contacts = data.contacts.filter((c) => !c.archived);
  const reminders = data.reminders
    .filter((r) => !r.completed)
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">
            <span className="status-dot" /> EVERY HELLO IS A BEGINNING
          </span>
          <h1>
            {data.profile
              ? `Good to see you, ${data.profile.name.split(" ")[0]}.`
              : "Hello, builder."}
            <span className="greeting-spark">✳</span>
          </h1>
          <p>Your people, projects, and possibilities. All in one place.</p>
        </div>
        <div className="heading-date">
          <CalendarDays size={14} />
          {new Intl.DateTimeFormat("en-IN", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          }).format(new Date())}
        </div>
      </div>
      <div className="dashboard-actions">
        <Link href="/app/scan" className="scan-action-card">
          <div className="scan-action-copy">
            <span className="scan-action-eyebrow">
              MAKE YOUR NEXT CONNECTION
            </span>
            <h2>
              Someone interesting?
              <br />
              Start with a scan.
            </h2>
            <p>
              A name, a project, a conversation.
              <br />
              Keep the good stuff.
            </p>
            <span className="scan-action-button">
              <ScanLine size={17} />
              Scan someone
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div className="scan-action-art">
            <div className="scan-target">
              <QrCode size={85} strokeWidth={1.3} />
              <span />
            </div>
            <span className="scan-deco deco-one" />
            <span className="scan-deco deco-two" />
          </div>
        </Link>
        <div className="share-action-card">
          <span className="action-icon">
            <QrCode size={23} />
          </span>
          <h2>
            Be the next
            <br />
            great connection.
          </h2>
          <p>
            Your own little gateway to
            <br />a world of possibilities.
          </p>
          {data.profile ? (
            <Button variant="secondary" onClick={() => setQr(true)}>
              Show my QR
              <ArrowUpRight size={15} />
            </Button>
          ) : (
            <ButtonLink href="/app/profile" variant="secondary">
              Create my profile
              <ArrowUpRight size={15} />
            </ButtonLink>
          )}
          <span className="action-card-footnote">
            <ShieldCheck size={11} />
            Share what feels right. Always.
          </span>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="app-panel recent-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-icon">
                <Users size={17} />
              </span>
              <h2>
                Your latest hellos
                <span className="count-badge">{contacts.length}</span>
              </h2>
            </div>
            <Link href="/app/people">
              All people
              <ArrowRight size={13} />
            </Link>
          </div>
          {contacts.length ? (
            <div className="contact-card-grid contact-card-grid-compact">
              {contacts.slice(0, 4).map((c) => (
                <ContactCard contact={c} key={c.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users size={25} />}
              title="Your first hello is waiting."
              description="Scan their QR or tap an NFC tag. Their shared profile is saved for you."
            >
              <ConnectLink variant="secondary">Add a connection</ConnectLink>
            </EmptyState>
          )}
          <ConnectLink variant="ghost" className="panel-bottom-action">
            Add someone you met
            <ArrowUpRight size={13} />
          </ConnectLink>
        </section>
        <section className="app-panel follow-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-icon amber">
                <Bell size={17} />
              </span>
              <h2>Keep it going</h2>
            </div>
            <Link href="/app/follow-ups">
              <ArrowRight size={15} />
              <span className="sr-only">All follow-ups</span>
            </Link>
          </div>
          <p className="panel-subheading">
            A little follow-through goes a long way.
          </p>
          {reminders.length ? (
            reminders.slice(0, 3).map((r) => {
              const c = contacts.find((c) => c.id === r.contactId);
              return (
                <div className="dashboard-reminder" key={r.id}>
                  <button
                    className="complete-circle"
                    aria-label={`Complete ${r.title}`}
                    onClick={() =>
                      update((w) => ({
                        ...w,
                        reminders: w.reminders.map((v) =>
                          v.id === r.id ? { ...v, completed: true } : v,
                        ),
                      }))
                    }
                  >
                    <Check size={12} />
                  </button>
                  <div>
                    <strong>{r.title}</strong>
                    <span>
                      {c?.name || "Connection"}
                      <small>{prettyDate(r.due)}</small>
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="follow-empty">
              <span>
                <Check size={23} />
              </span>
              <strong>A fresh start.</strong>
              <p>
                Add a follow-up from any saved person.
                <br />
                We’ll keep it here for you.
              </p>
            </div>
          )}
          <Link className="panel-bottom-action" href="/app/follow-ups">
            Your follow-up queue
            <ArrowUpRight size={13} />
          </Link>
        </section>
      </div>
      <section className="app-events-section">
        <div className="section-heading compact">
          <div>
            <span className="app-eyebrow">SEE YOU IN THE HALLWAY</span>
            <h2>Coming up in Mumbai.</h2>
          </div>
          <Link href="/app/events" className="text-link">
            All events
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="compact-event-grid">
          {events.map((e) => (
            <Link
              className="compact-event"
              href={`/app/events/${e.slug}`}
              key={e.id}
            >
              <EventArtwork event={e} compact />
              <div className="compact-event-copy">
                <span className="compact-event-date">{e.dates}</span>
                <h3>{e.name}</h3>
                <p>
                  <MapPin size={11} />
                  {e.venue}
                </p>
                <span className="compact-event-cta">
                  Explore event
                  <ArrowUpRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {!demo && !contacts.length && (
        <div className="demo-invitation">
          <span className="demo-invitation-icon">
            <Compass size={23} />
          </span>
          <div>
            <h3>Curious what your conference memory could look like?</h3>
            <p>
              Explore a sample workspace, with illustrative people, projects,
              and follow-ups.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setDemo(true)}>
            Take a look
            <ArrowUpRight size={14} />
          </Button>
        </div>
      )}
      {!user && (
        <p className="guest-footnote">
          <ShieldCheck size={13} /> Your guest workspace stays on this browser.{" "}
          <Link href="/signup">Create an account</Link> to publish your profile
          and sync across devices.
        </p>
      )}
      {data.profile && (
        <ShareQR
          open={qr}
          onOpenChange={setQr}
          name={data.profile.name}
          username={data.profile.username}
        />
      )}
    </div>
  );
}
