"use client";
import { eventById, events } from "@/lib/events";
import type { Contact } from "@/lib/types";
import { safeUrl } from "@/lib/utils";
import {
  CalendarDays,
  Check,
  FileText,
  LockKeyhole,
  Plus,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Avatar, Button, Modal } from "./ui";
import { useWorkspace } from "./workspace-provider";
export function SaveContactDialog({
  open,
  onOpenChange,
  initial,
  initialEventId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<Contact>;
  initialEventId?: string;
  onSaved?: (id: string) => void;
}) {
  const { saveContact, data } = useWorkspace();
  const [name, setName] = useState(initial?.name || "");
  const [headline, setHeadline] = useState(initial?.headline || "");
  const [project, setProject] = useState(initial?.project || "");
  const [url, setUrl] = useState(initial?.links?.[0]?.url || "");
  const [note, setNote] = useState("");
  const [eventId, setEventId] = useState(
    initialEventId ?? data.activeEventId ?? "",
  );
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [error, setError] = useState("");
  // Someone with a Connect IRL profile already has a name, headline and links,
  // so only an optional note is asked for.
  const quick = Boolean(initial?.profileId);
  const meetingEvent = eventById(eventId);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={quick ? "A good hello, remembered." : "Add a new connection"}
      description={
        quick
          ? "Add a quick note, or just save."
          : "A name is enough. A little context makes it memorable."
      }
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!quick && url && !safeUrl(url)) {
            setError("Use a full https:// or http:// profile link.");
            return;
          }
          if (!name.trim()) {
            setError("Please add a name.");
            return;
          }
          const id = saveContact(
            {
              name: name.trim(),
              headline,
              project,
              links:
                !quick && url
                  ? [
                      {
                        label: initial?.links?.[0]?.label || "Website",
                        url: safeUrl(url)!,
                      },
                    ]
                  : initial?.links || [],
              tags,
              avatar: initial?.avatar || "",
              profileId: initial?.profileId,
              starred: false,
              archived: false,
              source: initial?.source || "manual",
              ...(initial?.sample ? { sample: true } : {}),
            },
            note,
            eventId,
          );
          onOpenChange(false);
          onSaved?.(id);
        }}
      >
        {(quick || initial?.avatar) && (
          <div className="contact-dialog-identity">
            <Avatar name={name} src={initial?.avatar} size="lg" />
            <div>
              <strong>{name}</strong>
              <span>{headline}</span>
            </div>
          </div>
        )}
        {!quick && (
          <>
            <div className="form-row">
              <label>
                Name <span className="required">*</span>
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Who did you meet?"
                  autoComplete="off"
                />
              </label>
              <label>
                Role / headline
                <input
                  maxLength={180}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Engineer, founder, curious human…"
                />
              </label>
            </div>
            <label>
              Project or company
              <input
                maxLength={100}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="What are they building?"
              />
            </label>
            <label>
              Profile link
              <input
                type="url"
                maxLength={2048}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
            </label>
            <label>
              Where did you meet?
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              >
                <option value="">No event / somewhere else</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          <span className="label-with-icon">
            <LockKeyhole size={12} />A note, just for you
          </span>
          <textarea
            value={note}
            maxLength={5000}
            onChange={(e) => setNote(e.target.value)}
            rows={quick ? 2 : 3}
            placeholder={
              quick
                ? "Optional: a quick note to remember them by"
                : "That idea you both got excited about…"
            }
          />
        </label>
        {quick && meetingEvent && (
          <p className="form-footnote">
            <CalendarDays size={11} /> Met at {meetingEvent.name}
          </p>
        )}
        {!quick && (
          <div className="quick-tags">
            {[
              "Follow up",
              "Collaborator",
              "Hiring",
              "Investor",
              "Interesting project",
            ].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() =>
                  setTags(
                    tags.includes(t)
                      ? tags.filter((v) => v !== t)
                      : [...tags, t],
                  )
                }
                className={tags.includes(t) ? "active" : ""}
              >
                {tags.includes(t) ? <Check size={11} /> : <Plus size={11} />}{" "}
                {t}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit">
          <Users size={16} />
          Save connection
        </Button>
        <p className="form-footnote">
          <LockKeyhole size={11} /> Meeting notes are only visible to you.
        </p>
      </form>
    </Modal>
  );
}
// A saved connection as a square profile card, the way files show in a folder grid.
const coverHue = (name: string) =>
  120 + ([...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 80);
export function ContactCard({ contact }: { contact: Contact }) {
  const { update } = useWorkspace();
  const meeting = contact.meetings.at(-1);
  const event = meeting && eventById(meeting.eventId);
  return (
    <div
      className="contact-card"
      style={{ "--hue": coverHue(contact.name) } as CSSProperties}
    >
      <Link href={`/app/people/${contact.id}`} className="contact-card-link">
        <span className="contact-card-cover" aria-hidden="true" />
        <Avatar name={contact.name} src={contact.avatar} size="xl" />
        <strong>
          {contact.name}
          {contact.sample && <span className="sample-badge">SAMPLE</span>}
        </strong>
        <small>{contact.headline || contact.project || "A new connection"}</small>
        <span className="contact-card-meta">
          {event ? (
            <>
              <CalendarDays size={12} />
              {event.shortName}
            </>
          ) : (
            <>
              <FileText size={12} />
              {meeting?.note ? "Context saved" : "Add some context"}
            </>
          )}
        </span>
      </Link>
      <button
        className={`icon-button star-button contact-card-star ${contact.starred ? "starred" : ""}`}
        aria-label={`${contact.starred ? "Unstar" : "Star"} ${contact.name}`}
        onClick={() =>
          update((w) => ({
            ...w,
            contacts: w.contacts.map((c) =>
              c.id === contact.id ? { ...c, starred: !c.starred } : c,
            ),
          }))
        }
      >
        <Star size={16} fill={contact.starred ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
export function ReminderDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: Contact;
}) {
  const { update, toast } = useWorkspace();
  const [title, setTitle] = useState(
    `Follow up with ${contact.name.split(" ")[0]}`,
  );
  const [due, setDue] = useState(() =>
    new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
  );
  const [draft, setDraft] = useState("");
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Keep the conversation going."
      description={`A little nudge to reconnect with ${contact.name}.`}
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          update((w) => ({
            ...w,
            reminders: [
              ...w.reminders,
              {
                id: crypto.randomUUID(),
                contactId: contact.id,
                title,
                due,
                draft,
                completed: false,
                ...(contact.sample ? { sample: true } : {}),
              },
            ],
          }));
          toast("Follow-up added to your queue.");
          onOpenChange(false);
        }}
      >
        <label>
          What’s next?
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="quick-tags">
          {[
            ["Today", 0],
            ["Tomorrow", 1],
            ["In 3 days", 3],
            ["Next week", 7],
          ].map(([label, days]) => (
            <button
              type="button"
              key={label}
              onClick={() =>
                setDue(
                  new Date(Date.now() + Number(days) * 864e5)
                    .toISOString()
                    .slice(0, 10),
                )
              }
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          When?
          <input
            type="date"
            required
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label>
          A draft to come back to
          <textarea
            rows={3}
            maxLength={5000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Hey! Great meeting you…"
          />
        </label>
        <Button type="submit">
          Create follow-up
          <CalendarDays size={15} />
        </Button>
        <p className="form-footnote">
          In-app reminder · no messages sent automatically
        </p>
      </form>
    </Modal>
  );
}
