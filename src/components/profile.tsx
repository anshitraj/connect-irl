"use client";
import type { Profile } from "@/lib/types";
import { contactFromProfile, downloadFile, vcard } from "@/lib/utils";
import {
  ArrowUpRight,
  Download,
  Flag,
  LockKeyhole,
  MapPin,
  Plus,
  QrCode,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { SaveContactDialog } from "./contact-tools";
import { ShareQR } from "./qr";
import { profileRoles } from "@/lib/onboarding";
import {
  Avatar,
  Brand,
  Button,
  ButtonLink,
  EmptyState,
  Modal,
  SocialLinks,
  Tag,
} from "./ui";
import { useWorkspace } from "./workspace-provider";
export { ProfileSetup as ProfileEditor } from "./profile-setup";
export function PublicProfile({
  initial,
  username,
}: {
  initial: Profile | null;
  username: string;
}) {
  const { data, ready, toast, user, update } = useWorkspace();
  const p =
    initial || (data.profile?.username === username ? data.profile : null);
  const [qr, setQr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  if (!ready && !initial)
    return (
      <div className="public-resource-wrap">
        <div className="page-skeleton">
          <div />
          <div />
          <span>Opening this builder’s profile…</span>
        </div>
      </div>
    );
  if (!p)
    return (
      <div className="public-resource-wrap">
        <EmptyState
          title="This profile is unavailable."
          description="It may be private, unpublished, or the link may have changed."
        >
          <ButtonLink href="/app" variant="secondary">
            Open my workspace
          </ButtonLink>
        </EmptyState>
      </div>
    );
  if (data.blocked.includes(p.id))
    return (
      <div className="public-resource-wrap">
        <EmptyState
          title="You’ve blocked this builder."
          description="Their profile is hidden from your discovery results."
        >
          <Button
            variant="secondary"
            onClick={() =>
              update((w) => ({
                ...w,
                blocked: w.blocked.filter((id) => id !== p.id),
              }))
            }
          >
            Unblock builder
          </Button>
        </EmptyState>
      </div>
    );
  return (
    <div className="public-resource-wrap">
      <div className="public-profile-card">
        {p.sample ? (
          <div className="sample-profile-notice">
            <CompassIcon />
            Illustrative profile · this is a product example, not a real
            attendee.
          </div>
        ) : (
          !initial && (
            <div className="sample-profile-notice">
              <LockKeyhole size={13} />
              Local preview · sign in and sync to publish this link.
            </div>
          )
        )}
        <div className="public-profile-cover">
          <Brand compact />
          <span>EVERY HELLO IS A BEGINNING.</span>
        </div>
        <div className="public-profile-content">
          <Avatar name={p.name} src={p.avatar} size="xl" />
          <div className="public-profile-identity">
            <div>
              <div className="tag-row profile-role-tags">
                {profileRoles(p).map((role) => (
                  <Tag key={role}>{role}</Tag>
                ))}
              </div>
              <h1>{p.name}</h1>
              <p>{p.headline}</p>
              {p.city && (
                <span className="public-profile-city">
                  <MapPin size={12} />
                  {p.city}
                </span>
              )}
            </div>
            <button
              className="icon-button"
              aria-label="Show profile QR"
              onClick={() => setQr(true)}
            >
              <QrCode size={21} />
            </button>
          </div>
          <p className="public-profile-bio">{p.bio}</p>
          <div className="tag-row">
            {p.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          <SocialLinks links={p.links} />
          {p.company &&
            (p.company.name || p.company.website || p.company.linkedin) && (
              <div className="public-company-card">
                <Avatar
                  name={p.company.name || "Company"}
                  src={p.company.logo}
                />
                <div>
                  <span className="app-eyebrow">COMPANY</span>
                  <h3>{p.company.name || "Company"}</h3>
                  {p.company.designation && <p>{p.company.designation}</p>}
                  <SocialLinks
                    links={[
                      ...(p.company.website
                        ? [{ label: "Website", url: p.company.website }]
                        : []),
                      ...(p.company.linkedin
                        ? [{ label: "LinkedIn", url: p.company.linkedin }]
                        : []),
                    ]}
                  />
                </div>
              </div>
            )}
          {p.project && p.project !== p.company?.name && (
            <div className="public-project-box">
              <span className="app-eyebrow">WHAT I’M BUILDING</span>
              <h3>
                {p.project}
                <ArrowUpRight size={15} />
              </h3>
            </div>
          )}
          {p.lookingFor.length > 0 && (
            <div className="public-profile-looking">
              <span className="app-eyebrow">GOOD CONVERSATIONS ABOUT</span>
              <div className="tag-row">
                {p.lookingFor.map((t) => (
                  <Tag color="gray" key={t}>
                    {t}
                  </Tag>
                ))}
              </div>
            </div>
          )}
          <Button onClick={() => setSaving(true)}>
            <Plus size={16} />
            {data.contacts.some((c) => c.profileId === p.id)
              ? "Add another meeting"
              : "Save connection"}
          </Button>
          <div className="public-secondary-actions">
            <button
              onClick={async () => {
                try {
                  if (navigator.share)
                    await navigator.share({
                      title: `${p.name} on Connect IRL`,
                      url: location.href,
                    });
                  else {
                    await navigator.clipboard.writeText(location.href);
                    toast("Profile link copied.");
                  }
                } catch {
                  /* User dismissed share. */
                }
              }}
            >
              <Share2 size={14} />
              Share profile
            </button>
            <button
              onClick={() =>
                downloadFile(`${p.name}.vcf`, vcard(p), "text/vcard")
              }
            >
              <Download size={14} />
              Save vCard
            </button>
          </div>
          <span className="public-profile-private">
            <LockKeyhole size={11} /> Any notes you add are just for you.
          </span>
        </div>
      </div>
      <div className="public-resource-footer">
        <Brand />
        <span>Make a good hello last a little longer.</span>
        <ButtonLink href="/app" variant="secondary">
          Explore Connect IRL
          <ArrowUpRight size={14} />
        </ButtonLink>
      </div>
      {user && !p.sample && p.id !== user.id && (
        <div className="profile-moderation">
          <button
            onClick={() => {
              update((w) => ({ ...w, blocked: [...w.blocked, p.id] }));
              toast("Builder blocked from your discovery.");
            }}
          >
            Block builder
          </button>
          <button onClick={() => setReport(true)}>
            <Flag size={12} />
            Report profile
          </button>
        </div>
      )}
      <ShareQR
        open={qr}
        onOpenChange={setQr}
        name={p.name}
        username={p.username}
      />
      {saving && (
        <SaveContactDialog
          open
          onOpenChange={setSaving}
          initial={contactFromProfile(p)}
        />
      )}
      <Modal
        open={report}
        onOpenChange={setReport}
        title="Report this profile"
        description="Tell the moderator what needs attention. Reports are private."
      >
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const response = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId: p.id, reason }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setReport(false);
              toast("Report submitted for review.");
            } catch (err) {
              setReportStatus(
                err instanceof Error ? err.message : "Report unavailable.",
              );
            }
          }}
        >
          <label>
            What happened?
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </label>
          {reportStatus && <p className="form-error">{reportStatus}</p>}
          <Button type="submit">Submit report</Button>
        </form>
      </Modal>
    </div>
  );
}
function CompassIcon() {
  return <ShieldCheck size={13} />;
}
