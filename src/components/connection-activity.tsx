"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { z } from "zod";
import { Avatar, Button, ButtonLink, Modal } from "./ui";
import { ConnectionBridge } from "./connection-success";
import { useWorkspace } from "./workspace-provider";
const receiptSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  readAt: z.string().nullable(),
  actor: z.object({
    id: z.uuid(),
    username: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,39}$/),
    name: z.string().max(100),
    avatar: z.string(),
    headline: z.string().max(180),
  }),
});
type Receipt = z.infer<typeof receiptSchema>;
export function ConnectionActivity() {
  const { user, demo } = useWorkspace();
  return user && !demo ? <ConnectionInbox key={user.id} /> : null;
}
function ConnectionInbox() {
  const { online, toast } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [celebrate, setCelebrate] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const seen = useRef(new Set<string>());
  const since = useRef(0);
  useEffect(() => {
    const changed = (event: Event) =>
      setSharing(Boolean((event as CustomEvent).detail));
    window.addEventListener("connectirl:qr-sharing", changed);
    return () => window.removeEventListener("connectirl:qr-sharing", changed);
  }, []);
  useEffect(() => {
    if (!online) return;
    if (!since.current) since.current = Date.now();
    let disposed = false;
    let active: AbortController | null = null;
    const load = async () => {
      if (document.visibilityState === "hidden" || active) return;
      const controller = new AbortController();
      active = controller;
      try {
        const response = await fetch("/api/connections", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error || "Connection activity could not load.",
          );
        const items = z.array(receiptSchema).max(50).parse(result.receipts);
        if (disposed) return;
        const arrival = items.find(
          (item) =>
            !item.readAt &&
            !seen.current.has(item.id) &&
            Date.parse(item.createdAt) >= since.current,
        );
        items.forEach((item) => seen.current.add(item.id));
        setReceipts(items);
        setError("");
        if (arrival && sharing) setCelebrate(arrival);
      } catch (err) {
        if (!disposed && !controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : "Connection activity could not load.",
          );
      } finally {
        if (active === controller) active = null;
      }
    };
    void load();
    const timer = window.setInterval(
      () => void load(),
      sharing ? 2000 : open ? 5000 : 30000,
    );
    const focused = () => void load();
    window.addEventListener("focus", focused);
    document.addEventListener("visibilitychange", focused);
    return () => {
      disposed = true;
      active?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", focused);
      document.removeEventListener("visibilitychange", focused);
    };
  }, [online, sharing, open, refresh]);
  const read = async (item: Receipt) => {
    if (item.readAt) return;
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!response.ok) throw new Error();
      setReceipts((items) =>
        items.map((current) =>
          current.id === item.id
            ? { ...current, readAt: new Date().toISOString() }
            : current,
        ),
      );
    } catch {
      toast(
        "Couldn’t mark that connection as read. You can try again in Activity.",
      );
    }
  };
  const unread = receipts.filter((item) => !item.readAt).length;
  return (
    <>
      <Button
        className="connection-activity-button"
        variant="ghost"
        aria-label={`Connection activity${unread ? `, ${unread} unread` : ""}`}
        onClick={() => setOpen(true)}
      >
        <Bell size={18} />
        {unread > 0 && <span className="activity-count">{unread}</span>}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Your latest connections"
        description="People who saved your shared profile. Your private contact books stay separate."
      >
        {error ? (
          <div className="activity-error">
            <p role="status">{error}</p>
            <Button
              variant="secondary"
              onClick={() => setRefresh((value) => value + 1)}
            >
              <RefreshCw size={14} />
              Try again
            </Button>
          </div>
        ) : receipts.length ? (
          <div className="connection-inbox">
            {receipts.map((item) => (
              <div
                key={item.id}
                className={`connection-inbox-item ${!item.readAt ? "unread" : ""}`}
              >
                <Avatar name={item.actor.name} src={item.actor.avatar} />
                <div>
                  <strong>{item.actor.name}</strong>
                  <p>Connected with you</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>
                <ButtonLink href={`/u/${item.actor.username}`} variant="ghost">
                  View profile
                </ButtonLink>
                {!item.readAt && (
                  <Button variant="ghost" onClick={() => void read(item)}>
                    Mark read
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="activity-empty">
            Your next hello is on its way. Share My QR to start.
          </p>
        )}
      </Modal>
      <Modal
        open={Boolean(celebrate)}
        onOpenChange={(value) => {
          if (!value) {
            if (celebrate) void read(celebrate);
            setCelebrate(null);
          }
        }}
        title="A new connection!"
        description="Your shared profile reached someone new."
      >
        {celebrate && (
          <div className="incoming-success">
            <ConnectionBridge person={celebrate.actor} incoming />
            <h3>{celebrate.actor.name} connected with you.</h3>
            <p>
              Your notes stay private. You can save their profile if you’d like
              to connect back.
            </p>
            <ButtonLink href={`/u/${celebrate.actor.username}`}>
              View their profile
            </ButtonLink>
          </div>
        )}
      </Modal>
    </>
  );
}
