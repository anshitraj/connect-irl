"use client";
import { browserSupabase } from "@/lib/supabase/client";
import { accountPhoto, accountProvider } from "@/lib/account";
import { setAutoSaveBack, useAutoSaveBack } from "@/lib/preferences";
import { downloadFile } from "@/lib/utils";
import {
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  LifeBuoy,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldBan,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar, Button, Modal } from "./ui";
import { cloudConfigured, useWorkspace } from "./workspace-provider";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="set-group" aria-label={title}>
      <h2>{title}</h2>
      <div className="set-list">{children}</div>
    </section>
  );
}
// One settings row: icon, label, optional value, and a chevron, switch or nothing.
function Item({
  icon: Icon,
  label,
  value,
  href,
  external = false,
  onClick,
  danger = false,
  trailing,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <span className="set-icon">
        <Icon size={17} />
      </span>
      <span className="set-label">{label}</span>
      {value && <span className="set-value">{value}</span>}
      {trailing ??
        (external ? (
          <ExternalLink size={15} className="set-chevron" />
        ) : href || onClick ? (
          <ChevronRight size={16} className="set-chevron" />
        ) : null)}
    </>
  );
  const className = `set-item ${danger ? "set-item-danger" : ""}`;
  if (href && external)
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  if (href)
    return (
      <Link className={className} href={href}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  return <div className={className}>{body}</div>;
}
function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="set-switch"
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function Settings() {
  const router = useRouter();
  const {
    data,
    user,
    demo,
    setDemo,
    syncStatus,
    sync,
    importGuest,
    clearDevice,
    toast,
    update,
  } = useWorkspace();
  const autoSave = useAutoSaveBack(user?.id);
  const [confirm, setConfirm] = useState<"delete" | "clear" | "unblock" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const profile = data.profile;
  const signOut = async () => {
    await browserSupabase()?.auth.signOut();
    router.replace("/app");
    router.refresh();
  };
  const deleteAccount = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      clearDevice();
      await browserSupabase()?.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion unavailable.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="set-page">
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">SETTINGS</span>
          <h1>Settings</h1>
        </div>
      </div>
      <section className="set-account" aria-label="Your account">
        <Avatar
          name={profile?.name || user?.email || "You"}
          src={profile?.avatar || accountPhoto(user)}
          size="lg"
        />
        <div>
          <strong>{profile?.name || (user ? "Your account" : "Guest")}</strong>
          <span>
            {demo
              ? "Sample workspace"
              : user
                ? `${user.email || "Signed in"} · ${accountProvider(user)}`
                : "Saved on this device only"}
          </span>
        </div>
      </section>
      <Group title="Profile">
        <Item icon={Sparkles} label="Edit profile & links" href="/app/profile" />
        <Item
          icon={Eye}
          label="Visibility"
          value={
            profile
              ? `${profile.public ? "Public" : "Private"}${profile.discoverable ? " · Discoverable" : ""}`
              : "Not set up"
          }
          href="/app/profile"
        />
        {profile?.public && (
          <Item
            icon={Globe}
            label="Public page"
            value={`/u/${profile.username}`}
            href={`/u/${profile.username}`}
          />
        )}
      </Group>
      <Group title="Connections">
        {user && !demo && (
          <Item
            icon={UserPlus}
            label="Save people who scan me"
            trailing={
              <Switch
                checked={autoSave}
                label="Save people who scan me"
                onChange={(value) => {
                  setAutoSaveBack(user.id, value);
                  toast(
                    value
                      ? "People who scan you are saved to your people."
                      : "People who scan you will appear in activity only.",
                  );
                }}
              />
            }
          />
        )}
        <Item icon={MapPin} label="Nearby now" href="/app/nearby" />
        <Item
          icon={ShieldBan}
          label="Blocked people"
          value={data.blocked.length ? String(data.blocked.length) : "None"}
          onClick={data.blocked.length ? () => setConfirm("unblock") : undefined}
        />
      </Group>
      <Group title="Account">
        {user ? (
          <>
            <Item
              icon={RefreshCw}
              label="Sync"
              value={
                syncStatus === "synced"
                  ? "Up to date"
                  : syncStatus === "error"
                    ? "Failed · retry"
                    : "Pending"
              }
              onClick={() => {
                void sync();
                toast("Syncing your workspace…");
              }}
            />
            <Item icon={LogOut} label="Sign out" onClick={() => void signOut()} />
          </>
        ) : (
          <Item
            icon={UserPlus}
            label={cloudConfigured ? "Create an account" : "Cloud sign-in unavailable"}
            value={cloudConfigured ? "Sync across devices" : undefined}
            href={cloudConfigured ? "/signup" : undefined}
          />
        )}
      </Group>
      <Group title="Your data">
        <Item
          icon={Download}
          label="Export my data"
          value="JSON"
          onClick={() => {
            downloadFile(
              `connectirl-export-${new Date().toISOString().slice(0, 10)}.json`,
              JSON.stringify(data, null, 2),
              "application/json",
            );
            toast("Workspace exported. Keep the file private.");
          }}
        />
        {user && (
          <Item
            icon={Upload}
            label="Import guest records"
            onClick={importGuest}
          />
        )}
        <Item
          icon={Trash2}
          label="Clear this device’s copy"
          danger
          onClick={() => setConfirm("clear")}
        />
      </Group>
      <Group title="App">
        <Item
          icon={Smartphone}
          label="Install the app"
          value="Add to Home Screen"
          onClick={() =>
            toast(
              "In your browser menu, choose “Add to Home Screen” or “Install app”.",
            )
          }
        />
        <Item
          icon={Sparkles}
          label="Sample workspace"
          trailing={
            <Switch
              checked={demo}
              label="Sample workspace"
              onChange={(value) => setDemo(value)}
            />
          }
        />
        <Item
          icon={Globe}
          label="IBW Connect"
          href="https://connect.indiablockchainweek.com/"
          external
        />
        <Item icon={Globe} label="Devcon app" href="https://app.devcon.org/" external />
      </Group>
      <Group title="About">
        <Item icon={FileText} label="Privacy" href="/privacy" />
        <Item icon={FileText} label="Terms" href="/terms" />
        <Item icon={LifeBuoy} label="Contact & support" href="/contact" />
      </Group>
      {user && !demo && (
        <Group title="Danger zone">
          <Item
            icon={Trash2}
            label="Delete account"
            danger
            onClick={() => setConfirm("delete")}
          />
        </Group>
      )}
      <p className="set-footnote">
        Notes, contacts and follow-ups are always private to you.
      </p>
      <Modal
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete your Connect IRL account?"
        description="This permanently deletes your account, profile, contacts, notes and files. Export your data first. This cannot be undone."
      >
        {error && <p className="form-error">{error}</p>}
        <div className="button-row">
          <Button variant="danger" disabled={busy} onClick={() => void deleteAccount()}>
            {busy ? "Deleting…" : "Permanently delete account"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Keep my account
          </Button>
        </div>
      </Modal>
      <Modal
        open={confirm === "clear"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Clear this browser’s workspace?"
        description={
          user
            ? "Removes cached records from this browser. Your cloud data stays and reloads when you sign in."
            : "Export a backup first. Guest records have no cloud copy."
        }
      >
        <div className="button-row">
          <Button
            variant="danger"
            onClick={() => {
              clearDevice();
              setConfirm(null);
            }}
          >
            Clear device copy
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
      <Modal
        open={confirm === "unblock"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Unblock everyone?"
        description="Their public profiles will show in discovery again."
      >
        <div className="button-row">
          <Button
            onClick={() => {
              update((w) => ({ ...w, blocked: [] }));
              toast("Blocked profiles cleared.");
              setConfirm(null);
            }}
          >
            Unblock all
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
