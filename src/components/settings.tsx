"use client";
import { browserSupabase } from "@/lib/supabase/client";
import { downloadFile } from "@/lib/utils";
import {
  ArrowUpRight,
  Cloud,
  Download,
  ExternalLink,
  Globe,
  LogOut,
  Monitor,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Modal, Tag } from "./ui";
import { cloudConfigured, useWorkspace } from "./workspace-provider";
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clear, setClear] = useState(false);
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">YOUR NETWORK. YOUR WAY.</span>
          <h1>A few thoughtful settings.</h1>
          <p>Privacy, your data, and the way you connect.</p>
        </div>
      </div>
      <div className="settings-stack">
        <section className="app-panel settings-section">
          <div className="settings-heading">
            <div>
              <h2>Your profile & social links.</h2>
              <p>Onboarding is only once. Your details can change anytime.</p>
            </div>
            <ButtonLink href="/app/profile" variant="secondary">
              Edit profile & links
              <ArrowUpRight size={14} />
            </ButtonLink>
          </div>
        </section>
        <section className="app-panel settings-section">
          <div className="settings-heading">
            <span className="panel-icon">
              <Cloud size={20} />
            </span>
            <div>
              <h2>Your workspace.</h2>
              <p>
                {demo
                  ? "You’re exploring illustrative data."
                  : user
                    ? `Signed in as ${user.email || "your X account"}`
                    : "A private guest workspace, saved on this browser."}
              </p>
            </div>
            <Tag>{demo ? "SAMPLE" : user ? "SIGNED IN" : "GUEST"}</Tag>
          </div>
          {user ? (
            <>
              <div className="settings-row">
                <div>
                  <strong>Cloud synchronization</strong>
                  <p>
                    {syncStatus === "synced"
                      ? "Server confirmed. All queued changes are synced."
                      : "New changes stay on this device until the server confirms them."}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => void sync()}>
                  Sync now
                </Button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Bring your guest connections along</strong>
                  <p>
                    Import this browser’s guest contacts, projects, and
                    follow-ups into your account.
                  </p>
                </div>
                <Button variant="secondary" onClick={importGuest}>
                  <Upload size={14} />
                  Import device records
                </Button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Sign out</strong>
                  <p>
                    Your account’s device copy stays separate from the guest
                    workspace.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await browserSupabase()?.auth.signOut();
                    router.replace("/app");
                    router.refresh();
                  }}
                >
                  <LogOut size={14} />
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <div className="settings-row">
              <div>
                <strong>Make your connections travel with you</strong>
                <p>
                  {cloudConfigured
                    ? "Sign in to publish your profile and sync your saved records."
                    : "Cloud credentials are not configured. Your guest workspace works on this device."}
                </p>
              </div>
              <ButtonLink href="/signup" variant="secondary">
                Create an account
                <ArrowUpRight size={14} />
              </ButtonLink>
            </div>
          )}
        </section>
        <section className="app-panel settings-section">
          <div className="settings-heading">
            <span className="panel-icon">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2>Public by choice. Private by default.</h2>
              <p>
                Your meeting notes, contacts, and follow-ups are always private.
              </p>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <strong>Profile visibility & discovery</strong>
              <p>
                Choose what your public profile shares, and whether other
                builders can discover you.
              </p>
            </div>
            <ButtonLink href="/app/profile" variant="secondary">
              Manage profile
            </ButtonLink>
          </div>
          <div className="settings-row">
            <div>
              <strong>Blocked builders</strong>
              <p>
                {data.blocked.length
                  ? `${data.blocked.length} hidden from discovery. Unblock to show their public profiles again.`
                  : "No builders blocked. Block or report from a public profile."}
              </p>
            </div>
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
          </div>
        </section>
        <section className="app-panel settings-section">
          <div className="settings-heading">
            <span className="panel-icon">
              <Download size={20} />
            </span>
            <div>
              <h2>Your data belongs to you.</h2>
              <p>Take a copy, keep a backup, or make a fresh start.</p>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <strong>Export my workspace</strong>
              <p>
                Download your profile, contacts, private notes, projects, and
                reminders as JSON. Audio is stored separately.
              </p>
            </div>
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
          </div>
          <div className="settings-row">
            <div>
              <strong>Clear this browser’s workspace copy</strong>
              <p>
                {user
                  ? "Removes cached records from this browser. Cloud data remains and will reload when you sign in again."
                  : "Removes guest profile, saved contacts, projects, and reminders from this browser."}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setClear(true)}>
              Clear device copy
            </Button>
          </div>
          {user && (
            <div className="settings-row">
              <div>
                <strong className="text-danger">Delete my account</strong>
                <p>
                  Permanently delete your account and owned database records.
                  Download an export first.
                </p>
              </div>
              <Button variant="danger" onClick={() => setDeleting(true)}>
                <Trash2 size={14} />
                Delete account
              </Button>
            </div>
          )}
        </section>
        <section className="app-panel settings-section">
          <div className="settings-heading">
            <span className="panel-icon">
              <Globe size={20} />
            </span>
            <div>
              <h2>The right tool for the right moment.</h2>
              <p>
                One responsive app. One shared backend. Fast on your phone and
                desktop.
              </p>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <strong>
                <Smartphone size={15} />
                Install on your phone
              </strong>
              <p>
                Use your browser’s “Add to Home Screen” or “Install app”. Visit
                over HTTPS for camera and offline support.
              </p>
            </div>
            <Tag>PWA</Tag>
          </div>
          <div className="settings-row">
            <div>
              <strong>
                <Monitor size={15} />
                Explore a sample workspace
              </strong>
              <p>
                See illustrative people, projects, and notes in a separate
                workspace.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setDemo(!demo)}>
              {demo ? "Return to my workspace" : "Explore sample"}
            </Button>
          </div>
        </section>
        <section className="app-panel settings-section">
          <div className="settings-heading">
            <span className="panel-icon">
              <ExternalLink size={20} />
            </span>
            <div>
              <h2>Your conference resources.</h2>
              <p>External links. No attendee sync or private account access.</p>
            </div>
          </div>
          {[
            ["IBW Connect", "https://connect.indiablockchainweek.com/"],
            ["Devcon app", "https://app.devcon.org/"],
          ].map(([name, url]) => (
            <div className="settings-row" key={name}>
              <div>
                <strong>{name}</strong>
                <p>Schedule, tickets, and official event resources.</p>
              </div>
              <a
                className="button button-secondary"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open {name}
                <ArrowUpRight size={13} />
              </a>
            </div>
          ))}
        </section>
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
