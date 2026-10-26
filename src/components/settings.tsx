"use client";
import { browserSupabase } from "@/lib/supabase/client";
import { accountPhoto, accountProvider } from "@/lib/account";
import { downloadFile } from "@/lib/utils";
import {
  ArrowUpRight,
  Cloud,
  Database,
  Download,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  UserRound,
  IdCard,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Button, ButtonLink, Modal, Tag } from "./ui";
import { cloudConfigured, useWorkspace } from "./workspace-provider";

const sections = [
  { id: "account", label: "Account", hint: "Sign-in and sync", icon: UserRound },
  { id: "profile", label: "Profile", hint: "Details, links, visibility", icon: IdCard },
  { id: "privacy", label: "Privacy & safety", hint: "Blocking and notes", icon: ShieldCheck },
  { id: "data", label: "Your data", hint: "Export, import, clear", icon: Database },
  { id: "app", label: "App & resources", hint: "Install, samples, links", icon: Smartphone },
] as const;
type Section = (typeof sections)[number]["id"];

function Group({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`set-group ${danger ? "set-danger" : ""}`}>
      <div className="set-group-head">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="set-rows">{children}</div>
    </section>
  );
}
function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="set-row">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {children && <div className="set-row-action">{children}</div>}
    </div>
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
  const [section, setSection] = useState<Section>("account");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clear, setClear] = useState(false);
  const signOut = async () => {
    await browserSupabase()?.auth.signOut();
    router.replace("/app");
    router.refresh();
  };
  const account = (
    <>
      <section className="set-group set-account">
        <Avatar
          name={data.profile?.name || user?.email || "You"}
          src={data.profile?.avatar || accountPhoto(user)}
          size="lg"
        />
        <div>
          <strong>
            {data.profile?.name || (user ? "Your account" : "Guest workspace")}
          </strong>
          <span>
            {demo
              ? "Exploring illustrative sample data"
              : user
                ? `${user.email || "Signed in"} · ${accountProvider(user)}`
                : "Saved privately on this browser"}
          </span>
        </div>
        <Tag>{demo ? "SAMPLE" : user ? "SIGNED IN" : "GUEST"}</Tag>
        <ButtonLink href="/app/profile" variant="secondary">
          Edit profile & links
          <ArrowUpRight size={14} />
        </ButtonLink>
      </section>
      {user ? (
        <>
          <Group title="Sync" description="Your workspace is saved to the cloud.">
            <Row
              title="Cloud synchronization"
              description={
                syncStatus === "synced"
                  ? "All changes are saved to your account."
                  : syncStatus === "error"
                    ? "The last sync failed. Your changes are safe on this device."
                    : "New changes stay on this device until the server confirms them."
              }
            >
              <Button variant="secondary" onClick={() => void sync()}>
                <RefreshCw size={14} />
                Sync now
              </Button>
            </Row>
          </Group>
          <Group title="Session">
            <Row
              title="Sign out"
              description="Your account’s device copy stays separate from the guest workspace."
            >
              <Button variant="secondary" onClick={() => void signOut()}>
                <LogOut size={14} />
                Sign out
              </Button>
            </Row>
          </Group>
          <Group
            title="Danger zone"
            description="Download an export first. This cannot be undone."
            danger
          >
            <Row
              title="Delete my account"
              description="Permanently deletes your account, profile, contacts, notes and files."
            >
              <Button variant="danger" onClick={() => setDeleting(true)}>
                <Trash2 size={14} />
                Delete account
              </Button>
            </Row>
          </Group>
        </>
      ) : (
        <Group title="Account">
          <Row
            title="Make your connections travel with you"
            description={
              cloudConfigured
                ? "Sign in to publish your profile and sync your saved connections across devices."
                : "Cloud sign-in isn’t configured. Your guest workspace works on this device."
            }
          >
            <ButtonLink href="/signup" variant="secondary">
              Create an account
              <ArrowUpRight size={14} />
            </ButtonLink>
          </Row>
        </Group>
      )}
    </>
  );
  const profile = (
    <Group
      title="Profile"
      description="What people see when they scan your QR."
    >
      <Row
        title="Profile details & social links"
        description="Your name, roles, photo, links and events. Onboarding happens once; edit anytime."
      >
        <ButtonLink href="/app/profile" variant="secondary">
          Edit profile & links
          <ArrowUpRight size={14} />
        </ButtonLink>
      </Row>
      <Row
        title="Visibility & discovery"
        description={
          data.profile
            ? `${data.profile.public ? "Public profile" : "Private profile"} · ${data.profile.discoverable ? "discoverable" : "not discoverable"}. Change it at the bottom of your profile.`
            : "Create your profile first."
        }
      >
        <ButtonLink href="/app/profile" variant="secondary">
          Manage
        </ButtonLink>
      </Row>
      {data.profile?.public && (
        <Row
          title="Your public page"
          description={`connectirl.xyz/u/${data.profile.username}`}
        >
          <ButtonLink href={`/u/${data.profile.username}`} variant="secondary">
            View
            <ArrowUpRight size={14} />
          </ButtonLink>
        </Row>
      )}
    </Group>
  );
  const privacy = (
    <Group
      title="Privacy & safety"
      description="Meeting notes, contacts and follow-ups are always private to you."
    >
      <Row
        title="Blocked builders"
        description={
          data.blocked.length
            ? `${data.blocked.length} hidden from discovery. Unblock to show their public profiles again.`
            : "No one blocked. You can block or report from any public profile."
        }
      >
        {data.blocked.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              update((w) => ({ ...w, blocked: [] }));
              toast("Blocked profiles cleared.");
            }}
          >
            Unblock all
          </Button>
        )}
      </Row>
    </Group>
  );
  const dataSection = (
    <Group title="Your data" description="It belongs to you. Take a copy anytime.">
      <Row
        title="Export my workspace"
        description="Profile, contacts, private notes, projects and reminders as JSON. Audio is stored separately."
      >
        <Button
          variant="secondary"
          onClick={() => {
            downloadFile(
              `connectirl-export-${new Date().toISOString().slice(0, 10)}.json`,
              JSON.stringify(data, null, 2),
              "application/json",
            );
            toast("Workspace exported. Keep the file private.");
          }}
        >
          <Download size={14} />
          Export data
        </Button>
      </Row>
      {user && (
        <Row
          title="Bring guest connections along"
          description="Add this browser’s guest contacts, projects and follow-ups to your account."
        >
          <Button variant="secondary" onClick={importGuest}>
            <Upload size={14} />
            Import device records
          </Button>
        </Row>
      )}
      <Row
        title="Clear this browser’s copy"
        description={
          user
            ? "Removes cached records from this browser. Your cloud data stays and reloads when you sign in."
            : "Removes the guest profile, contacts, projects and reminders from this browser."
        }
      >
        <Button variant="secondary" onClick={() => setClear(true)}>
          Clear device copy
        </Button>
      </Row>
    </Group>
  );
  const app = (
    <>
      <Group title="App">
        <Row
          title="Install on your phone"
          description="Use your browser’s “Add to Home Screen” or “Install app” for a full-screen app with offline support."
        >
          <Tag>PWA</Tag>
        </Row>
        <Row
          title="Sample workspace"
          description="See illustrative people, projects and notes, kept separate from yours."
        >
          <Button variant="secondary" onClick={() => setDemo(!demo)}>
            {demo ? "Return to my workspace" : "Explore sample"}
          </Button>
        </Row>
      </Group>
      <Group
        title="Conference resources"
        description="Official event sites. No attendee data is synced."
      >
        {[
          ["IBW Connect", "https://connect.indiablockchainweek.com/"],
          ["Devcon app", "https://app.devcon.org/"],
        ].map(([name, url]) => (
          <Row key={name} title={name} description="Schedule, tickets and event resources.">
            <a
              className="button button-secondary"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open
              <ArrowUpRight size={13} />
            </a>
          </Row>
        ))}
      </Group>
      <p className="set-legal">
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> ·{" "}
        <Link href="/contact">Contact</Link>
      </p>
    </>
  );
  return (
    <div className="set-page">
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">SETTINGS</span>
          <h1>Settings</h1>
          <p>Your account, profile, privacy and data, in one place.</p>
        </div>
      </div>
      <div className="set-layout">
        <nav className="set-nav" aria-label="Settings sections">
          {sections.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={section === id ? "active" : ""}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={18} />
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="set-content">
          {section === "account" && account}
          {section === "profile" && profile}
          {section === "privacy" && privacy}
          {section === "data" && dataSection}
          {section === "app" && app}
          {section === "account" && !user && (
            <p className="set-hint">
              <Cloud size={13} /> Guest data lives only in this browser.
            </p>
          )}
        </div>
      </div>
      <Modal
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete your Connect IRL account?"
        description="This permanently deletes your account and owned records in the database. This action cannot be undone."
      >
        {error && <p className="form-error">{error}</p>}
        <div className="button-row">
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const response = await fetch("/api/account", {
                  method: "DELETE",
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                clearDevice();
                await browserSupabase()?.auth.signOut();
                router.replace("/");
                router.refresh();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Deletion unavailable.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Deleting…" : "Permanently delete account"}
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(false)}>
            Keep my account
          </Button>
        </div>
      </Modal>
      <Modal
        open={clear}
        onOpenChange={setClear}
        title="Clear this browser’s workspace?"
        description="Export a backup before continuing. Guest records have no cloud copy."
      >
        <div className="button-row">
          <Button
            variant="danger"
            onClick={() => {
              clearDevice();
              setClear(false);
            }}
          >
            Clear device copy
          </Button>
          <Button variant="secondary" onClick={() => setClear(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
