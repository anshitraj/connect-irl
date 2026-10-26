"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "./ui";
import { useWorkspace } from "./workspace-provider";
import type { Contact } from "@/lib/types";
import { safeUrl } from "@/lib/utils";
import { hasVoiceNotes } from "./voice-note";
import { browserSupabase } from "@/lib/supabase/client";
export function EditContact({
  contact,
  open,
  onOpenChange,
}: {
  contact: Contact;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { update, toast } = useWorkspace();
  const [name, setName] = useState(contact.name);
  const [headline, setHeadline] = useState(contact.headline);
  const [project, setProject] = useState(contact.project);
  const [links, setLinks] = useState(contact.links);
  const [error, setError] = useState("");
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="A little more of their story."
      description="These edits update your private contact record. Their public profile stays theirs."
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError("Add a name before saving.");
            return;
          }
          if (links.some((l) => !safeUrl(l.url))) {
            setError("Use full http:// or https:// links.");
            return;
          }
          update((w) => ({
            ...w,
            contacts: w.contacts.map((c) =>
              c.id === contact.id
                ? { ...c, name: name.trim(), headline, project, links }
                : c,
            ),
          }));
          toast("Contact details updated.");
          onOpenChange(false);
        }}
      >
        <label>
          Name
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Role / headline
          <input
            maxLength={180}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </label>
        <label>
          Project / organization
          <input
            maxLength={100}
            value={project}
            onChange={(e) => setProject(e.target.value)}
          />
        </label>
        {links.map((l, i) => (
          <label key={i}>
            {l.label} link
            <div className="button-row">
              <input
                type="url"
                required
                maxLength={2048}
                value={l.url}
                onChange={(e) =>
                  setLinks(
                    links.map((v, n) =>
                      n === i ? { ...v, url: e.target.value } : v,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="small-tool"
                onClick={() => setLinks(links.filter((_, n) => n !== i))}
              >
                Remove
              </button>
            </div>
          </label>
        ))}
        {links.length < 12 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLinks([...links, { label: "Website", url: "" }])}
          >
            Add a public link
          </Button>
        )}
        {error && <p className="form-error">{error}</p>}
        <Button type="submit">Save contact details</Button>
      </form>
    </Modal>
  );
}
export function MergeContact({
  contact,
  open,
  onOpenChange,
}: {
  contact: Contact;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, update, toast, user, demo, online, sync } = useWorkspace();
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const other = data.contacts.find((c) => c.id === target);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Two records. One person."
      description="Choose the record to keep. Meeting histories, links, tags, and reminders will be combined. Export a backup first if you need the original records."
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!other) return;
          setError("");
          setBusy(true);
          try {
            if (
              await hasVoiceNotes(
                contact.id,
                demo ? "demo" : user?.id || "guest",
              )
            )
              throw new Error(
                "This record has a voice note. Download and remove its recording before merging to keep your audio safe.",
              );
            if (user && !demo) {
              if (!online)
                throw new Error(
                  "Reconnect before merging cloud contacts so we can check for private audio.",
                );
              const sb = browserSupabase();
              if (!sb) throw new Error("Cloud is unavailable.");
              const { count, error: checkError } = await sb
                .from("contact_notes")
                .select("id", { count: "exact", head: true })
                .eq("contact_id", contact.id)
                .eq("owner_id", user.id);
              if (checkError)
                throw new Error(
                  "Could not check for voice notes. Sync and try again.",
                );
              if (count)
                throw new Error(
                  "This record has private audio. Download and remove its recording before merging.",
                );
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Merge unavailable.");
            setBusy(false);
            return;
          }
          let combined: Contact = {
            ...other,
            profileId: other.profileId || contact.profileId,
            starred: other.starred || contact.starred,
            tags: [...new Set([...other.tags, ...contact.tags])],
            links: [
              ...new Map(
                [...other.links, ...contact.links].map((l) => [l.url, l]),
              ).values(),
            ],
            meetings: [
              ...new Map(
                [...other.meetings, ...contact.meetings].map((m) => [m.id, m]),
              ).values(),
            ].sort((a, b) => a.at.localeCompare(b.at)),
          };
          if (
            combined.tags.length > 20 ||
            combined.links.length > 12 ||
            combined.meetings.length > 500
          ) {
            setError(
              "These records exceed the per-contact limits. Export a backup and reduce tags or links before merging.",
            );
            setBusy(false);
            return;
          }
          if (user && !demo) {
            try {
              await sync();
              const response = await fetch("/api/contacts/merge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sourceId: contact.id,
                  targetId: other.id,
                }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              combined = result.contact as Contact;
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not merge.");
              setBusy(false);
              return;
            }
          }
          update((w) => ({
            ...w,
            contacts: w.contacts
              .filter((c) => c.id !== contact.id)
              .map((c) => (c.id === other.id ? combined : c)),
            reminders: w.reminders.map((r) =>
              r.contactId === contact.id ? { ...r, contactId: other.id } : r,
            ),
          }));
          toast("Records merged. Their story stays together.");
          onOpenChange(false);
          router.push(`/app/people/${other.id}`);
        }}
      >
        <label>
          Keep this connection
          <select
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Choose a person…</option>
            {data.contacts
              .filter(
                (c) =>
                  c.id !== contact.id &&
                  Boolean(c.sample) === Boolean(contact.sample),
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.project || c.headline}
                </option>
              ))}
          </select>
        </label>
        {other && (
          <div className="notice">
            Keep <strong>{other.name}</strong> and combine{" "}
            {other.meetings.length + contact.meetings.length} meeting records.
            Follow-ups will point to the kept record. Records with voice notes
            require downloading and removing the recordings before merging.
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!other || busy}>
          {busy ? "Checking your records…" : "Merge these records"}
        </Button>
      </form>
    </Modal>
  );
}
