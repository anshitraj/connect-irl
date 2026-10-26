"use client";
import { demoWorkspace } from "@/lib/samples";
import { mergeGuestWorkspace } from "@/lib/migration";
import { browserSupabase, cloudConfigured } from "@/lib/supabase/client";
import { emptyWorkspace, type Contact, type Workspace } from "@/lib/types";
import { uid } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Deleted = {
  table: "saved_contacts" | "projects" | "follow_up_reminders";
  id: string;
};
type Outbox = {
  contacts: Workspace["contacts"];
  projects: Workspace["projects"];
  reminders: Workspace["reminders"];
  deleted: Deleted[];
  profileChanged: boolean;
  preferencesChanged: boolean;
  revision: number;
};
const blankOutbox = (): Outbox => ({
  contacts: [],
  projects: [],
  reminders: [],
  deleted: [],
  profileChanged: false,
  preferencesChanged: false,
  revision: 0,
});
type Store = {
  data: Workspace;
  ready: boolean;
  user: User | null;
  demo: boolean;
  online: boolean;
  syncStatus: "local" | "pending" | "syncing" | "synced" | "error";
  syncError: string;
  update: (fn: (w: Workspace) => Workspace) => void;
  saveContact: (
    contact: Omit<Contact, "id" | "meetings" | "createdAt">,
    note?: string,
    eventId?: string,
  ) => string;
  setDemo: (value: boolean) => void;
  sync: () => Promise<void>;
  importGuest: () => void;
  toast: (message: string) => void;
  message: string;
  clearDevice: () => void;
};
const Context = createContext<Store | null>(null);
const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};
const merge = <T extends { id: string }>(a: T[], b: T[]) => [
  ...new Map([...a, ...b].map((v) => [v.id, v])).values(),
];
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [demo, setDemoState] = useState(false);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [syncStatus, setSyncStatus] = useState<Store["syncStatus"]>("local");
  const [syncError, setSyncError] = useState("");
  const [message, setMessage] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef(data);
  const outbox = useRef<Outbox>(blankOutbox());
  const key = useRef("buildermatch.guest.v1");
  const actor = useRef<User | null>(null);
  const demoRef = useRef(false);
  const inFlight = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((text: string) => {
    setMessage(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(""), 4500);
  }, []);
  const persist = useCallback(() => {
    try {
      localStorage.setItem(key.current, JSON.stringify(current.current));
      localStorage.setItem(
        `${key.current}.outbox`,
        JSON.stringify(outbox.current),
      );
    } catch {
      setSyncError(
        "Device storage is full or unavailable. Export your data to keep a backup.",
      );
      toast("Could not save to device. Export your data before leaving.");
    }
  }, [toast]);
  const sync = useCallback(async () => {
    if (
      !actor.current ||
      demoRef.current ||
      !navigator.onLine ||
      inFlight.current
    )
      return;
    const pending = structuredClone(outbox.current);
    if (!pending.revision) return;
    inFlight.current = true;
    setSyncStatus("syncing");
    const syncKey = key.current;
    const version = pending.revision;
    try {
      const snapshot = current.current;
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: pending.profileChanged ? snapshot.profile : null,
          contacts: pending.contacts.filter((c) => !c.sample),
          projects: pending.projects.filter((p) => !p.sample),
          reminders: pending.reminders.filter((r) => !r.sample),
          bookmarks: snapshot.bookmarks.filter((b) => !b.startsWith("sample-")),
          eventBookmarks: snapshot.eventBookmarks,
          activeEventId: snapshot.activeEventId || "",
          blocked: snapshot.blocked,
          deleted: pending.deleted,
          preferencesChanged: pending.preferencesChanged,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Sync failed. Your changes are still on this device.",
        );
      if (key.current !== syncKey) return;
      if (outbox.current.revision === version) outbox.current = blankOutbox();
      else {
        // New changes stay queued if an edit happened while this request was running.
        outbox.current = {
          ...outbox.current,
          contacts: outbox.current.contacts.filter(
            (c) =>
              !pending.contacts.some(
                (p) => p.id === c.id && JSON.stringify(p) === JSON.stringify(c),
              ),
          ),
          projects: outbox.current.projects.filter(
            (c) =>
              !pending.projects.some(
                (p) => p.id === c.id && JSON.stringify(p) === JSON.stringify(c),
              ),
          ),
          reminders: outbox.current.reminders.filter(
            (c) =>
              !pending.reminders.some(
                (p) => p.id === c.id && JSON.stringify(p) === JSON.stringify(c),
              ),
          ),
          deleted: outbox.current.deleted.filter(
            (d) =>
              !pending.deleted.some(
                (p) => p.id === d.id && p.table === d.table,
              ),
          ),
        };
      }
      const ids = (result.contactIds || {}) as Record<string, string>;
      const remoteContacts = (result.contacts || []) as Contact[];
      const remapContact = (c: Contact): Contact => ({
        ...c,
        id: ids[c.id] || c.id,
      });
      const normalized = current.current.contacts
        .map(remapContact)
        .map((local) => {
          const remote = remoteContacts.find((c) => c.id === local.id);
          return remote
            ? {
                ...remote,
                ...local,
                meetings: merge(remote.meetings, local.meetings).sort((a, b) =>
                  a.at.localeCompare(b.at),
                ),
              }
            : local;
        });
      current.current = {
        ...current.current,
        contacts: merge([], normalized),
        reminders: current.current.reminders.map((r) => ({
          ...r,
          contactId: ids[r.contactId] || r.contactId,
        })),
      };
      outbox.current.contacts = outbox.current.contacts.map(remapContact);
      outbox.current.reminders = outbox.current.reminders.map((r) => ({
        ...r,
        contactId: ids[r.contactId] || r.contactId,
      }));
      outbox.current.deleted = outbox.current.deleted.map((d) =>
        d.table === "saved_contacts" ? { ...d, id: ids[d.id] || d.id } : d,
      );
      setData(current.current);
      persist();
      setSyncError("");
      setSyncStatus(outbox.current.revision ? "pending" : "synced");
    } catch (error) {
      if (key.current === syncKey) {
        setSyncStatus("error");
        setSyncError(
          error instanceof Error ? error.message : "Unable to sync.",
        );
      }
    } finally {
      inFlight.current = false;
    }
  }, [persist]);
  const update = useCallback(
    (fn: (w: Workspace) => Workspace) => {
      const before = current.current;
      const next = fn(before);
      const pending = outbox.current;
      for (const [field, table] of [
        ["contacts", "saved_contacts"],
        ["projects", "projects"],
        ["reminders", "follow_up_reminders"],
      ] as const) {
        const changed = next[field].filter((n) => {
          const prior = before[field].find((p) => p.id === n.id);
          return !prior || JSON.stringify(prior) !== JSON.stringify(n);
        });
        // Each field has its own concrete array type; merge by id preserves that type.
        if (field === "contacts")
          pending.contacts = merge(
            pending.contacts,
            changed as Workspace["contacts"],
          );
        if (field === "projects")
          pending.projects = merge(
            pending.projects,
            changed as Workspace["projects"],
          );
        if (field === "reminders")
          pending.reminders = merge(
            pending.reminders,
            changed as Workspace["reminders"],
          );
        for (const removed of before[field].filter(
          (p) => !next[field].some((n) => n.id === p.id),
        )) {
          if (!removed.sample) pending.deleted.push({ table, id: removed.id });
        }
        // A record deleted before sync must not be re-created by its earlier upsert.
        const stillExists = new Set(next[field].map((item) => item.id));
        if (field === "contacts")
          pending.contacts = pending.contacts.filter((item) =>
            stillExists.has(item.id),
          );
        if (field === "projects")
          pending.projects = pending.projects.filter((item) =>
            stillExists.has(item.id),
          );
        if (field === "reminders")
          pending.reminders = pending.reminders.filter((item) =>
            stillExists.has(item.id),
          );
      }
      pending.profileChanged ||=
        JSON.stringify(before.profile) !== JSON.stringify(next.profile);
      pending.preferencesChanged ||=
        JSON.stringify([
          before.bookmarks,
          before.eventBookmarks,
          before.blocked,
          before.activeEventId,
        ]) !==
        JSON.stringify([
          next.bookmarks,
          next.eventBookmarks,
          next.blocked,
          next.activeEventId,
        ]);
      pending.revision++;
      current.current = next;
      setData(next);
      persist();
      setSyncStatus(actor.current && !demoRef.current ? "pending" : "local");
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => void sync(), 700);
    },
    [persist, sync],
  );
  useEffect(() => {
    let alive = true;
    const hydrate = async (account: User | null, sample: boolean) => {
      const nextKey = sample
        ? "buildermatch.demo.v1"
        : account
          ? `buildermatch.user.${account.id}.v1`
          : "buildermatch.guest.v1";
      key.current = nextKey;
      actor.current = account;
      demoRef.current = sample;
      const local = read<Workspace>(
        nextKey,
        sample ? demoWorkspace() : emptyWorkspace,
      );
      outbox.current = read<Outbox>(`${nextKey}.outbox`, blankOutbox());
      current.current = local;
      setData(local);
      setUser(account);
      setDemoState(sample);
      setReady(true);
      setSyncStatus(account && !sample ? "pending" : "local");
      if (account && !sample) {
        try {
          const res = await fetch("/api/workspace");
          const remote = (await res.json()) as Workspace;
          if (!res.ok)
            throw new Error(
              "Cloud could not load. Your device copy is available.",
            );
          if (!alive || key.current !== nextKey) return;
          const p = outbox.current;
          const tombstones = new Set(p.deleted.map((d) => d.id));
          const next: Workspace = {
            ...remote,
            profile: p.profileChanged
              ? current.current.profile
              : remote.profile,
            contacts: merge(remote.contacts, p.contacts).filter(
              (c) => !tombstones.has(c.id),
            ),
            projects: merge(remote.projects, p.projects).filter(
              (c) => !tombstones.has(c.id),
            ),
            reminders: merge(remote.reminders, p.reminders).filter(
              (c) => !tombstones.has(c.id),
            ),
            ...(p.preferencesChanged
              ? {
                  bookmarks: current.current.bookmarks,
                  eventBookmarks: current.current.eventBookmarks,
                  activeEventId: current.current.activeEventId || "",
                  blocked: current.current.blocked,
                }
              : {}),
          };
          current.current = next;
          setData(next);
          persist();
          setSyncStatus(p.revision ? "pending" : "synced");
          if (p.revision) void sync();
        } catch (error) {
          if (alive) {
            setSyncStatus("error");
            setSyncError(
              error instanceof Error ? error.message : "Cloud unavailable.",
            );
          }
        }
      }
    };
    const sample =
      sessionStorage.getItem("buildermatch.demo") === "true" ||
      new URLSearchParams(location.search).get("demo") === "1";
    if (sample) sessionStorage.setItem("buildermatch.demo", "true");
    const sb = browserSupabase();
    if (sb) {
      void sb.auth
        .getUser()
        .then(({ data: { user: account } }) => {
          if (alive) void hydrate(account, sample);
        })
        .catch(() => {
          if (alive) {
            void hydrate(null, sample);
            toast(
              "Sign-in is temporarily unavailable. Your guest workspace is ready.",
            );
          }
        });
    } else {
      void hydrate(null, sample);
    }
    const subscription = sb?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        if (actor.current?.id !== session?.user?.id)
          setTimeout(() => {
            if (alive) void hydrate(session?.user || null, false);
          }, 0);
      }
    });
    const connectivity = () => {
      if (navigator.onLine) void sync();
    };
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    return () => {
      alive = false;
      subscription?.data.subscription.unsubscribe();
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [persist, sync, toast]);
  useEffect(() => {
    if (syncStatus !== "pending" || !online || !user || demo) return;
    const retry = setTimeout(() => void sync(), 1000);
    return () => clearTimeout(retry);
  }, [syncStatus, online, user, demo, sync]);
  const saveContact: Store["saveContact"] = useCallback(
    (input, note = "", eventId = current.current.activeEventId || "") => {
      const existing = current.current.contacts.find(
        (c) =>
          (input.profileId && c.profileId === input.profileId) ||
          (input.links.length &&
            c.links.some((l) => input.links.some((n) => n.url === l.url))),
      );
      const id = existing?.id || uid();
      update((w) => ({
        ...w,
        contacts: existing
          ? w.contacts.map((c) =>
              c.id === id
                ? {
                    ...c,
                    archived: false,
                    meetings: [
                      ...c.meetings,
                      {
                        id: uid(),
                        at: new Date().toISOString(),
                        eventId,
                        note,
                      },
                    ],
                  }
                : c,
            )
          : [
              {
                ...input,
                id,
                meetings: [
                  { id: uid(), at: new Date().toISOString(), eventId, note },
                ],
                createdAt: new Date().toISOString(),
              },
              ...w.contacts,
            ],
      }));
      toast(
        existing
          ? "Meeting added to your existing connection."
          : "Connection saved. A good hello, remembered.",
      );
      return id;
    },
    [update, toast],
  );
  const setDemo = (value: boolean) => {
    sessionStorage.setItem("buildermatch.demo", String(value));
    location.assign(value ? "/app?demo=1" : "/app");
  };
  const importGuest = () => {
    const guest = read<Workspace>("buildermatch.guest.v1", emptyWorkspace);
    update((w) =>
      mergeGuestWorkspace(w, {
        ...guest,
        projects: guest.projects.map((p) => ({
          ...p,
          ownerId: actor.current?.id || p.ownerId,
        })),
      }),
    );
    toast("Device records added. Cloud sync is queued.");
  };
  const clearDevice = () => {
    current.current = emptyWorkspace;
    outbox.current = blankOutbox();
    setData(emptyWorkspace);
    persist();
    toast("Workspace copy cleared from this browser.");
  };
  return (
    <Context.Provider
      value={{
        data,
        ready,
        user,
        demo,
        online,
        syncStatus,
        syncError,
        update,
        saveContact,
        setDemo,
        sync,
        importGuest,
        toast,
        message,
        clearDevice,
      }}
    >
      {children}
      <div
        className={`toast ${message ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </Context.Provider>
  );
}
export function useWorkspace() {
  const store = useContext(Context);
  if (!store) throw new Error("Workspace provider is missing");
  return store;
}
export { cloudConfigured };
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
