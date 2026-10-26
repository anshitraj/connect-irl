"use client";
import type { Contact, Reminder } from "@/lib/types";
import { followUpDraft, prettyDate, safeUrl } from "@/lib/utils";
import {
  ArrowUpRight,
  Bell,
  Check,
  Copy,
  Edit3,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReminderDialog } from "./contact-tools";
import { Avatar, Button, EmptyState, Tag } from "./ui";
import { useWorkspace } from "./workspace-provider";
export function FollowUps() {
  const { data } = useWorkspace();
  const [tab, setTab] = useState("Upcoming");
  const [choose, setChoose] = useState(false);
  const [person, setPerson] = useState<Contact | null>(null);
  const reminders = data.reminders
    .filter((r) => r.completed === (tab === "Completed"))
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">
            GOOD CONNECTIONS DESERVE A SECOND CONVERSATION
          </span>
          <h1>A little follow-through.</h1>
          <p>
            The demo you promised. The coffee you mentioned. The next chapter.
          </p>
        </div>
        <Button onClick={() => setChoose(!choose)}>
          <Plus size={15} />
          Add follow-up
        </Button>
      </div>
      {choose && (
        <div className="app-panel choose-contact">
          <h3>Who would you like to reconnect with?</h3>
          {data.contacts.length ? (
            data.contacts
              .filter((c) => !c.archived)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setPerson(c);
                    setChoose(false);
                  }}
                >
                  <Avatar name={c.name} src={c.avatar} size="sm" />
                  {c.name}
                  <Plus size={14} />
                </button>
              ))
          ) : (
            <p>
              Save a connection first.{" "}
              <Link href="/app/people">Find your people →</Link>
            </p>
          )}
        </div>
      )}
      <div className="people-toolbar">
        <div className="app-tabs">
          {["Upcoming", "Completed"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
              <span>
                {
                  data.reminders.filter(
                    (r) => r.completed === (t === "Completed"),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <span className="discovery-privacy-note">
          In-app reminders · nothing sends automatically
        </span>
      </div>
      {reminders.length ? (
        <div className="follow-up-list">
          {reminders.map((r) => (
            <FollowUpItem key={r.id} reminder={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bell size={27} />}
          title={
            tab === "Completed"
              ? "Good things take follow-through."
              : "All caught up. Room for a new hello."
          }
          description={
            tab === "Completed"
              ? "Your completed follow-ups will appear here."
              : "Set a small reminder for someone you’d like to reconnect with."
          }
        >
          <Button variant="secondary" onClick={() => setChoose(true)}>
            <Plus size={14} />
            Add a follow-up
          </Button>
        </EmptyState>
      )}
      {person && (
        <ReminderDialog
          open
          contact={person}
          onOpenChange={(v) => {
            if (!v) setPerson(null);
          }}
        />
      )}
    </div>
  );
}
function FollowUpItem({ reminder: r }: { reminder: Reminder }) {
  const { data, update, toast } = useWorkspace();
  const contact = data.contacts.find((c) => c.id === r.contactId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    r.draft || (contact ? followUpDraft(contact) : ""),
  );
  const modify = (fn: (r: Reminder) => Reminder) =>
    update((w) => ({
      ...w,
      reminders: w.reminders.map((v) => (v.id === r.id ? fn(v) : v)),
    }));
  const overdue = !r.completed && r.due < new Date().toISOString().slice(0, 10);
  return (
    <article className={`follow-up-item ${r.completed ? "completed" : ""}`}>
      <div className="follow-up-top">
        <button
          className={`complete-circle ${r.completed ? "checked" : ""}`}
          aria-label={`${r.completed ? "Reopen" : "Complete"} ${r.title}`}
          onClick={() => {
            modify((v) => ({ ...v, completed: !v.completed }));
            toast(
              r.completed
                ? "Follow-up reopened."
                : "A good connection, kept going.",
            );
          }}
        >
          <Check size={13} />
        </button>
        <div>
          <h3>{r.title}</h3>
          {contact && (
            <Link href={`/app/people/${contact.id}`}>
              <Avatar name={contact.name} src={contact.avatar} size="xs" />
              {contact.name}
              <ArrowUpRight size={12} />
            </Link>
          )}
        </div>
        <Tag color={overdue ? "orange" : "gray"}>
          {r.completed
            ? "Completed"
            : `${overdue ? "Overdue · " : ""}${prettyDate(r.due)}`}
        </Tag>
        <button
          className="icon-button"
          aria-label="Delete follow-up"
          onClick={() => {
            update((w) => ({
              ...w,
              reminders: w.reminders.filter((v) => v.id !== r.id),
            }));
            toast("Follow-up removed.");
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="follow-up-draft">
        <div>
          <span>A STARTING POINT, IN YOUR OWN WORDS</span>
          <button
            className="icon-button"
            aria-label="Edit draft"
            onClick={() => setEditing(!editing)}
          >
            <Edit3 size={13} />
          </button>
        </div>
        {editing ? (
          <>
            <textarea
              aria-label="Follow-up message draft"
              rows={4}
              maxLength={5000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                modify((v) => ({ ...v, draft }));
                setEditing(false);
                toast("Draft saved.");
              }}
            >
              Save draft
            </Button>
          </>
        ) : (
          <p>{draft}</p>
        )}
      </div>
      <div className="follow-up-bottom">
        <Button
          variant="secondary"
          onClick={() => {
            navigator.clipboard
              .writeText(draft)
              .then(() => toast("Message copied. Make it yours, then send it."))
              .catch(() =>
                toast("Copy unavailable. You can select the draft text."),
              );
          }}
        >
          <Copy size={13} />
          Copy message
        </Button>
        {contact?.links
          .filter((l) => safeUrl(l.url))
          .slice(0, 2)
          .map((l) => (
            <a
              className="channel-link"
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open {l.label}
              <ArrowUpRight size={13} />
            </a>
          ))}
        {!r.completed && (
          <label className="snooze-control">
            Reschedule
            <input
              type="date"
              aria-label="Reschedule follow-up"
              value={r.due}
              onChange={(e) => {
                if (e.target.value)
                  modify((v) => ({ ...v, due: e.target.value }));
              }}
            />
          </label>
        )}
      </div>
    </article>
  );
}
