"use client";
import { eventById, events } from "@/lib/events";
import type { Contact } from "@/lib/types";
import {
  downloadFile,
  prettyDate,
  safeUrl,
  searchContacts,
  uid,
  vcard,
} from "@/lib/utils";
import {
  Archive,
  ArrowLeft,
  Bell,
  CalendarDays,
  Download,
  Edit3,
  FileText,
  LockKeyhole,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useRef, useState } from "react";
import { ContactRow, ReminderDialog } from "./contact-tools";
import { ConnectLink } from "./connect-link";
import {
  Avatar,
  Button,
  ButtonLink,
  EmptyState,
  Modal,
  SocialLinks,
  Tag,
} from "./ui";
import { VoiceNote } from "./voice-note";
import { useWorkspace } from "./workspace-provider";
import { EditContact, MergeContact } from "./edit-contact";
export function People() {
  const { data, update, toast } = useWorkspace();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All people");
  const [event, setEvent] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const contacts = searchContacts(
    data.contacts.filter((c) =>
      tab === "Archived"
        ? c.archived
        : !c.archived && (tab !== "Starred" || c.starred),
    ),
    query,
  ).filter((c) => !event || c.meetings.some((m) => m.eventId === event));
  const exportCSV = () => {
    downloadFile(
      "connectirl-contacts.csv",
      Papa.unparse(
        data.contacts.map((c) => ({
          name: c.name,
          headline: c.headline,
          project: c.project,
          url: c.links[0]?.url || "",
          tags: c.tags.join("; "),
          notes: c.meetings.map((m) => m.note).join(" | "),
          events: c.meetings
            .map((m) => eventById(m.eventId)?.name)
            .filter(Boolean)
            .join("; "),
        })),
        { escapeFormulae: true },
      ),
      "text/csv;charset=utf-8",
    );
    toast("Contact export downloaded. Keep it somewhere private.");
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5e6) {
      toast("Choose a file smaller than 5 MB.");
      return;
    }
    try {
      const text = await file.text();
      let rows: Record<string, string>[] = [];
      if (/\.vcf$/i.test(file.name)) {
        rows = text
          .split(/BEGIN:VCARD/i)
          .slice(1)
          .map((block) => {
            const lines = block.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
            const value = (key: string) =>
              (lines.find((l) => l.startsWith(key + ":")) || "")
                .slice(key.length + 1)
                .replace(/\\n/g, "\n")
                .replace(/\\([,;\\])/g, "$1");
            return {
              name: value("FN"),
              headline: value("TITLE"),
              project: value("ORG"),
              url: value("URL"),
              notes: value("NOTE"),
            };
          });
      } else {
        const parsed = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.toLowerCase().trim(),
        });
        if (parsed.errors.length)
          throw new Error(
            "CSV could not be read. Use columns: name, headline, project, url, tags, notes.",
          );
        rows = parsed.data;
      }
      if (rows.length > 1000)
        throw new Error("Import up to 1,000 contacts at a time.");
      const valid = rows.filter((r) => r.name?.trim());
      let skipped = 0;
      const seen = new Set(
        data.contacts.flatMap((c) => c.links.map((l) => l.url)),
      );
      const incoming: Contact[] = valid.flatMap((r) => {
        const url = r.url ? safeUrl(r.url) : null;
        if ((r.url && !url) || (url && seen.has(url))) {
          skipped++;
          return [];
        }
        if (url) seen.add(url);
        return [
          {
            id: uid(),
            name: r.name.trim().slice(0, 100),
            headline: (r.headline || "").slice(0, 180),
            project: (r.project || "").slice(0, 100),
            avatar: "",
            tags: (r.tags || "")
              .split(/[;,]/)
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 20),
            links: url ? [{ label: "Imported link", url }] : [],
            meetings: [
              {
                id: uid(),
                at: new Date().toISOString(),
                eventId: "",
                note: (r.notes || "").slice(0, 5000),
              },
            ],
            starred: false,
            archived: false,
            createdAt: new Date().toISOString(),
            source: "import",
          },
        ];
      });
      update((w) => ({ ...w, contacts: [...incoming, ...w.contacts] }));
      toast(
        `${incoming.length} contacts imported.${skipped ? ` ${skipped} duplicate or invalid links skipped.` : ""}`,
      );
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message
          : "Import failed. Check the file format.",
      );
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">YOUR PEOPLE, WITH THE WHOLE STORY</span>
          <h1>A growing collection of hellos.</h1>
          <p>
            Find the person. Remember the conversation. Keep a good thing going.
          </p>
        </div>
        <ConnectLink />
      </div>
      <div className="people-toolbar">
        <div className="app-tabs">
          {["All people", "Starred", "Archived"].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "All people" && (
                <span>{data.contacts.filter((c) => !c.archived).length}</span>
              )}
            </button>
          ))}
        </div>
        <details className="people-advanced">
          <summary>More options</summary>
          <div className="button-row">
            <button
              className="small-tool"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={14} />
              Import
            </button>
            <button className="small-tool" onClick={exportCSV}>
              <Download size={14} />
              Export
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,.vcf"
              className="sr-only"
              aria-label="Import contacts"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </div>
        </details>
      </div>
      <div className="search-filter-bar">
        <label className="app-search">
          <Search size={17} />
          <input
            placeholder="Try ‘Solana engineer’ or ‘wallet infrastructure’…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              ×
            </button>
          )}
        </label>
        <select
          className="filter-select"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          aria-label="Filter by event"
        >
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.shortName}
            </option>
          ))}
        </select>
      </div>
      <p className="results-count">
        {contacts.length} {contacts.length === 1 ? "connection" : "connections"}
        {query && " · matched against names, projects, notes, and events"}
      </p>
      {contacts.length ? (
        <div className="app-panel people-list-panel">
          <div className="list-column-head">
            <span>THE PERSON</span>
            <span>THEIR WORLD</span>
            <span>THE CONTEXT</span>
          </div>
          {contacts.map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={28} />}
          title={
            query
              ? "Not found, yet."
              : tab === "Starred"
                ? "The people who stand out."
                : tab === "Archived"
                  ? "A little breathing room."
                  : "Every network starts with one hello."
          }
          description={
            query
              ? "Try a name, technology, project, or something from your notes."
              : "Scan a QR or tap an NFC tag. The shared profile and meeting context are saved instantly."
          }
        >
          <ConnectLink variant="secondary">Add a connection</ConnectLink>
        </EmptyState>
      )}
    </div>
  );
}
export function ContactDetail({ id }: { id: string }) {
  const { data, update, toast } = useWorkspace();
  const router = useRouter();
  const contact = data.contacts.find((c) => c.id === id);
  const [note, setNote] = useState("");
  const [eventId, setEventId] = useState("");
  const [reminder, setReminder] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [mergeContact, setMergeContact] = useState(false);
  const [tag, setTag] = useState("");
  if (!contact)
    return (
      <EmptyState
        title="That connection isn’t on this device."
        description="Return to your people, or sign in to the account where you saved them."
      >
        <ButtonLink href="/app/people" variant="secondary">
          Back to my people
        </ButtonLink>
      </EmptyState>
    );
  const modify = (fn: (c: Contact) => Contact) =>
    update((w) => ({
      ...w,
      contacts: w.contacts.map((c) => (c.id === id ? fn(c) : c)),
    }));
  return (
    <div>
      <Link href="/app/people" className="back-link">
        <ArrowLeft size={14} />
        Back to my people
      </Link>
      <div className="contact-detail-heading">
        <Avatar name={contact.name} src={contact.avatar} size="xl" />
        <div>
          <div className="tag-row">
            {contact.sample && <Tag color="orange">ILLUSTRATIVE PROFILE</Tag>}
            <span className="contact-source">
              {contact.source === "import"
                ? "Imported contact"
                : contact.source === "manual"
                  ? "Added by you"
                  : "Saved connection"}
            </span>
          </div>
          <h1>{contact.name}</h1>
          <p>
            {contact.headline}
            {contact.project && !contact.headline.includes(contact.project)
              ? ` · ${contact.project}`
              : ""}
          </p>
          <SocialLinks links={contact.links} />
        </div>
        <div className="contact-detail-actions">
          <button
            className="icon-button"
            aria-label="Edit contact details"
            onClick={() => setEditContact(true)}
          >
            <Edit3 size={18} />
          </button>
          <button
            className={`icon-button star-button ${contact.starred ? "starred" : ""}`}
            aria-label="Toggle starred"
            onClick={() => modify((c) => ({ ...c, starred: !c.starred }))}
          >
            <Star size={20} fill={contact.starred ? "currentColor" : "none"} />
          </button>
          <Button onClick={() => setReminder(true)}>
            <Bell size={15} />
            Follow up
          </Button>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <section className="app-panel notes-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-icon">
                  <FileText size={17} />
                </span>
                <h2>A little context goes a long way.</h2>
              </div>
              <Tag>
                <LockKeyhole size={10} />
                PRIVATE
              </Tag>
            </div>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                modify((c) => ({
                  ...c,
                  meetings: [
                    ...c.meetings,
                    {
                      id: uid(),
                      at: new Date().toISOString(),
                      eventId,
                      note: note.trim(),
                    },
                  ],
                }));
                setNote("");
                toast("A little more of the story, saved.");
              }}
            >
              <textarea
                aria-label="Private meeting note"
                rows={4}
                maxLength={5000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you talk about? What would you like to remember?"
              />
              <div className="note-form-footer">
                <select
                  aria-label="Meeting event"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  <option value="">Add an event (optional)</option>
                  {events.map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.shortName}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={!note.trim()}>
                  <Plus size={14} />
                  Save note
                </Button>
              </div>
            </form>
            <VoiceNote contactId={contact.id} />
          </section>
          <section className="timeline-section">
            <div className="section-heading compact">
              <div>
                <span className="app-eyebrow">THE STORY SO FAR</span>
                <h2>Your connection timeline.</h2>
              </div>
            </div>
            <div className="meeting-timeline">
              {[...contact.meetings].reverse().map((m) => (
                <article className="meeting-entry" key={m.id}>
                  <span className="timeline-dot">
                    <CalendarDays size={13} />
                  </span>
                  <div className="meeting-entry-top">
                    <span>
                      {new Date(m.at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {m.eventId && (
                      <Tag>{eventById(m.eventId)?.shortName || m.eventId}</Tag>
                    )}
                    <button
                      className="icon-button"
                      aria-label="Edit meeting note"
                      onClick={() => {
                        setEditing(m.id);
                        setEditedNote(m.note);
                      }}
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                  {editing === m.id ? (
                    <form
                      className="form-stack"
                      onSubmit={(e) => {
                        e.preventDefault();
                        modify((c) => ({
                          ...c,
                          meetings: c.meetings.map((v) =>
                            v.id === m.id ? { ...v, note: editedNote } : v,
                          ),
                        }));
                        setEditing(null);
                        toast("Note updated.");
                      }}
                    >
                      <textarea
                        aria-label="Edit note"
                        rows={3}
                        maxLength={5000}
                        value={editedNote}
                        onChange={(e) => setEditedNote(e.target.value)}
                      />
                      <div className="button-row">
                        <Button type="submit">Save changes</Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p>
                      {m.note ||
                        "A new connection. Add a note to remember the moment."}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside>
          <section className="app-panel contact-context">
            <h3>The little details.</h3>
            <dl>
              <dt>Project</dt>
              <dd>{contact.project || "Not added yet"}</dd>
              <dt>First connected</dt>
              <dd>{prettyDate(contact.createdAt)}</dd>
              <dt>Meetings remembered</dt>
              <dd>{contact.meetings.length}</dd>
            </dl>
            <h4>Their world</h4>
            <div className="tag-row">
              {contact.tags.map((t) => (
                <button
                  key={t}
                  className="tag tag-removable"
                  title={`Remove ${t}`}
                  onClick={() =>
                    modify((c) => ({
                      ...c,
                      tags: c.tags.filter((v) => v !== t),
                    }))
                  }
                >
                  {t}
                  <span>×</span>
                </button>
              ))}
            </div>
            <form
              className="add-tag-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (tag.trim() && !contact.tags.includes(tag.trim()))
                  modify((c) => ({ ...c, tags: [...c.tags, tag.trim()] }));
                setTag("");
              }}
            >
              <input
                aria-label="New contact tag"
                placeholder="Add a tag…"
                value={tag}
                maxLength={60}
                onChange={(e) => setTag(e.target.value)}
              />
              <button className="icon-button" aria-label="Add tag">
                <Plus size={14} />
              </button>
            </form>
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(
                  `${contact.name}.vcf`,
                  vcard(contact),
                  "text/vcard",
                )
              }
            >
              <Download size={14} />
              Save to device contacts
            </Button>
          </section>
          <div className="contact-management">
            <button onClick={() => setMergeContact(true)}>
              <Users size={14} />
              Merge with another record
            </button>
            <button
              onClick={() => {
                modify((c) => ({ ...c, archived: !c.archived }));
                toast(
                  contact.archived
                    ? "Connection restored."
                    : "Connection archived.",
                );
              }}
            >
              <Archive size={14} />
              {contact.archived ? "Restore connection" : "Archive connection"}
            </button>
            <button className="text-danger" onClick={() => setDeleting(true)}>
              <Trash2 size={14} />
              Delete connection
            </button>
          </div>
        </aside>
      </div>
      <ReminderDialog
        contact={contact}
        open={reminder}
        onOpenChange={setReminder}
      />
      {editContact && (
        <EditContact contact={contact} open onOpenChange={setEditContact} />
      )}
      {mergeContact && (
        <MergeContact contact={contact} open onOpenChange={setMergeContact} />
      )}
      <Modal
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this connection?"
        description="This removes the saved contact, private notes, and their follow-ups from your workspace."
      >
        <div className="button-row">
          <Button
            variant="danger"
            onClick={() => {
              update((w) => ({
                ...w,
                contacts: w.contacts.filter((c) => c.id !== id),
                reminders: w.reminders.filter((r) => r.contactId !== id),
              }));
              toast("Connection deleted.");
              router.push("/app/people");
            }}
          >
            Delete connection
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(false)}>
            Keep connection
          </Button>
        </div>
      </Modal>
    </div>
  );
}
