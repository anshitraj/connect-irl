"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Inbox,
  LockKeyhole,
  MailPlus,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  performCollaborationAction,
  type CollaborationAction,
  type CollaborationWorkspace,
  type ProjectSummary,
  type TeamMember,
} from "@/lib/collaboration";
import type { Profile, Project } from "@/lib/types";
import { prettyDate } from "@/lib/utils";
import { Avatar, Button, ButtonLink, EmptyState, Modal, Tag } from "./ui";
import { useWorkspace } from "./workspace-provider";

async function fetchInbox(
  signal?: AbortSignal,
): Promise<CollaborationWorkspace> {
  const response = await fetch("/api/collaboration", {
    signal,
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Your inbox could not load.");
  return result;
}
export function CollaborationInbox() {
  const { demo, toast } = useWorkspace();
  const [workspace, setWorkspace] = useState<CollaborationWorkspace | null>(
    null,
  );
  const [tab, setTab] = useState("Received");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await fetchInbox(signal);
      setWorkspace(result);
      setError("");
    } catch (err) {
      if (!signal?.aborted)
        setError(
          err instanceof Error ? err.message : "Your inbox could not load.",
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal));
    return () => controller.abort();
  }, [demo, load]);
  const act = async (
    action: CollaborationAction,
    target: string,
    body: Record<string, string> = {},
  ) => {
    setBusy(target);
    setError("");
    try {
      await performCollaborationAction(action, target, body);
      await load();
      toast("Collaboration updated.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update that request.",
      );
    } finally {
      setBusy("");
    }
  };
  const projects = new Map(workspace?.projects.map((p) => [p.id, p]));
  const profiles = new Map(workspace?.profiles.map((p) => [p.id, p]));
  const viewer = workspace?.viewerId;
  const requests =
    workspace?.requests.filter((r) =>
      tab === "Received"
        ? projects.get(r.project_id)?.ownerId === viewer
        : r.sender_id === viewer,
    ) || [];
  const invitations =
    workspace?.invitations.filter((i) =>
      tab === "Received"
        ? i.invitee_id === viewer
        : projects.get(i.project_id)?.ownerId === viewer,
    ) || [];
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">A GOOD IDEA GETS BETTER TOGETHER</span>
          <h1>Make room for a “let’s build.”</h1>
          <p>
            Private requests, thoughtful invitations, and the teams you choose
            to join.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void load()}
          disabled={Boolean(busy) || demo}
        >
          <RefreshCw size={14} />
          Refresh inbox
        </Button>
      </div>
      <div className="people-toolbar">
        <div className="app-tabs">
          {["Received", "Sent", "Teams"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t === "Teams" ? <Users size={14} /> : <Inbox size={14} />} {t}
            </button>
          ))}
        </div>
        <span className="discovery-privacy-note">
          <LockKeyhole size={12} />
          Visible only to participants
        </span>
      </div>
      {demo ? (
        <EmptyState
          icon={<Users size={25} />}
          title="Real teams start with real people."
          description="Sample projects don’t accept requests or invitations. Return to your own workspace to collaborate."
        >
          <ButtonLink href="/app/projects" variant="secondary">
            Explore projects
          </ButtonLink>
        </EmptyState>
      ) : (
        <>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <p className="collaboration-loading" role="status">
              Opening your private inbox…
            </p>
          ) : !workspace ? (
            <EmptyState
              icon={<LockKeyhole size={24} />}
              title="An inbox of possibilities."
              description="Sign in with a configured cloud account to send collaboration requests and receive invitations."
            >
              <ButtonLink href="/login" variant="secondary">
                Sign in to collaborate
              </ButtonLink>
            </EmptyState>
          ) : tab === "Teams" ? (
            <div className="collaboration-teams">
              {workspace.projects
                .filter(
                  (p) =>
                    p.ownerId === viewer ||
                    workspace.memberships.some((m) => m.project_id === p.id),
                )
                .map((p) => (
                  <Link
                    key={p.id}
                    href={`/app/projects/${p.slug}`}
                    className="app-panel collaboration-team"
                  >
                    <span className="project-letter">
                      {p.name[0]?.toLowerCase()}
                    </span>
                    <div>
                      <h2>{p.name}</h2>
                      <p>{p.tagline}</p>
                      <Tag>
                        {p.ownerId === viewer
                          ? "Owner"
                          : workspace.memberships.find(
                              (m) => m.project_id === p.id,
                            )?.role || "Member"}
                      </Tag>
                      {!p.public && <Tag color="gray">Private project</Tag>}
                    </div>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
              {!workspace.projects.some(
                (p) =>
                  p.ownerId === viewer ||
                  workspace.memberships.some((m) => m.project_id === p.id),
              ) && (
                <EmptyState
                  title="Your next team is out there."
                  description="Join by accepting an invitation or sending a request to a project that catches your eye."
                >
                  <ButtonLink href="/app/projects" variant="secondary">
                    Discover projects
                  </ButtonLink>
                </EmptyState>
              )}
            </div>
          ) : (
            <div className="collaboration-list">
              {invitations.map((i) => (
                <article className="app-panel collaboration-card" key={i.id}>
                  <CollaborationIdentity
                    profile={profiles.get(
                      tab === "Received" ? i.invited_by : i.invitee_id,
                    )}
                    project={projects.get(i.project_id)}
                    status={i.status}
                    subtitle={`${tab === "Received" ? "Invited you to join" : "Team invitation"} · ${i.role}`}
                    date={i.created_at}
                  />
                  <p className="collaboration-message">
                    {tab === "Received"
                      ? "Accept to join this team. Your public profile can appear on its roster. Membership allows you to view a private project; editing stays with its owner."
                      : "Membership starts only after the invited builder accepts."}
                  </p>
                  {i.status === "pending" && (
                    <div className="button-row">
                      {tab === "Received" ? (
                        <>
                          <Button
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void act("respond_invitation", i.id, {
                                decision: "accepted",
                              })
                            }
                          >
                            <Check size={14} />
                            Accept invitation
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void act("respond_invitation", i.id, {
                                decision: "declined",
                              })
                            }
                          >
                            Decline
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled={Boolean(busy)}
                          onClick={() => void act("revoke_invitation", i.id)}
                        >
                          Revoke invitation
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              ))}
              {requests.map((r) => (
                <article className="app-panel collaboration-card" key={r.id}>
                  <CollaborationIdentity
                    profile={profiles.get(r.sender_id)}
                    project={projects.get(r.project_id)}
                    status={r.status}
                    subtitle={
                      tab === "Received"
                        ? "Would like to collaborate"
                        : "Your collaboration request"
                    }
                    date={r.created_at}
                  />
                  <p className="collaboration-message">{r.message}</p>
                  {r.status === "pending" && (
                    <div className="button-row">
                      {tab === "Received" ? (
                        <>
                          <Button
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void act("respond_request", r.id, {
                                decision: "accepted",
                              })
                            }
                          >
                            <Plus size={14} />
                            Accept & add to team
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              void act("respond_request", r.id, {
                                decision: "declined",
                              })
                            }
                          >
                            Decline
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled={Boolean(busy)}
                          onClick={() => void act("withdraw_request", r.id)}
                        >
                          Withdraw request
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              ))}
              {!invitations.length && !requests.length && (
                <EmptyState
                  icon={<Inbox size={26} />}
                  title={
                    tab === "Received"
                      ? "A little room for possibility."
                      : "Nothing sent, yet."
                  }
                  description={
                    tab === "Received"
                      ? "Team invitations and requests to your projects will appear here."
                      : "Find a project and send its owner a thoughtful collaboration request."
                  }
                >
                  <ButtonLink href="/app/projects" variant="secondary">
                    Explore projects
                  </ButtonLink>
                </EmptyState>
              )}
            </div>
          )}
          <p className="collaboration-footnote">
            Requests and invitations stay inside Connect IRL. No email or
            social message is sent automatically. The inbox shows up to 200
            recent requests and invitations.
          </p>
        </>
      )}
    </div>
  );
}
function CollaborationIdentity({
  profile,
  project,
  status,
  subtitle,
  date,
}: {
  profile?: Profile;
  project?: ProjectSummary;
  status: string;
  subtitle: string;
  date: string;
}) {
  return (
    <div className="collaboration-identity">
      <Avatar name={profile?.name || "Builder"} src={profile?.avatar} />
      <div>
        {profile ? (
          <Link href={`/u/${profile.username}`}>
            <strong>
              {profile.name}
              <ArrowUpRight size={12} />
            </strong>
          </Link>
        ) : (
          <strong>Builder profile unavailable</strong>
        )}
        <span>{subtitle}</span>
        <p>
          {project?.name || "Project unavailable"} · {prettyDate(date)}
        </p>
      </div>
      <Tag
        color={
          status === "accepted" ? "" : status === "pending" ? "blue" : "gray"
        }
      >
        {status}
      </Tag>
    </div>
  );
}

export function CollaborationRequestButton({ project }: { project: Project }) {
  const { toast } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState<CollaborationWorkspace | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open || project.sample) return;
    const controller = new AbortController();
    void fetchInbox(controller.signal)
      .then((result) => {
        setWorkspace(result);
        setError("");
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Sign in to continue.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, project.sample]);
  const existing = workspace?.requests.find(
    (r) => r.project_id === project.id && r.sender_id === workspace.viewerId,
  );
  const member = workspace?.memberships.some(
    (m) => m.project_id === project.id,
  );
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setLoading(!project.sample);
          setOpen(true);
        }}
      >
        <Users size={14} />
        Let’s collaborate
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Build something with ${project.name}.`}
        description="A thoughtful introduction is a great start."
      >
        {project.sample ? (
          <p className="notice">
            This is an illustrative project. Sample builders don’t receive
            requests.
          </p>
        ) : loading ? (
          <p role="status">Opening collaboration options…</p>
        ) : !workspace ? (
          <div className="form-stack">
            {error && <p className="notice">{error}</p>}
            <ButtonLink href="/login">Sign in to collaborate</ButtonLink>
          </div>
        ) : member ? (
          <div className="form-stack">
            <p className="notice">You’re already on this team.</p>
            <ButtonLink href="/app/collaboration" variant="secondary">
              Open my teams
            </ButtonLink>
          </div>
        ) : (
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await performCollaborationAction("request", project.id, {
                  message,
                });
                toast("Collaboration request sent to the project owner.");
                setOpen(false);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Could not send the request.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {existing?.status === "pending" && (
              <p className="notice">
                You already have a pending request. Sending again updates that
                request.
              </p>
            )}
            <label>
              A little introduction
              <textarea
                required
                maxLength={2000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What caught your eye? What would you love to contribute?"
              />
            </label>
            <p className="form-footnote">
              Your public builder profile and this message are shared with the
              owner. Accepting your request adds you to the project team. Your
              private notes stay private.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy || !message.trim()} type="submit">
              {busy
                ? "Sending…"
                : existing?.status === "pending"
                  ? "Update request"
                  : "Send collaboration request"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

export function ProjectTeam({ project }: { project: Project }) {
  const { toast, sync } = useWorkspace();
  const [result, setResult] = useState<{
    members: TeamMember[];
    profiles: Profile[];
    viewerId: string | null;
  } | null>(null);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("Contributor");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(project.slug)}/team`,
          { signal, cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResult(data);
        setError("");
      } catch (err) {
        if (!signal?.aborted)
          setError(err instanceof Error ? err.message : "Team could not load.");
      }
    },
    [project.slug],
  );
  useEffect(() => {
    if (project.sample) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal));
    return () => controller.abort();
  }, [project.sample, load]);
  if (project.sample) return null;
  const owns = result?.viewerId === project.ownerId;
  const member = result?.members.find((m) => m.user_id === result.viewerId);
  const publicProfiles = new Map(result?.profiles.map((p) => [p.id, p]));
  const owner = publicProfiles.get(project.ownerId);
  return (
    <section className="app-panel project-team-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-icon">
            <Users size={17} />
          </span>
          <h2>The people building it.</h2>
        </div>
        {owns && (
          <Button variant="secondary" onClick={() => setInvite(true)}>
            <MailPlus size={14} />
            Invite builder
          </Button>
        )}
      </div>
      <p className="collaboration-team-note">
        Joining is a choice. Only accepted invitations and requests add someone
        to the team.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <TeamIdentity profile={owner} fallback="Project owner" role="Owner" />
      {result?.members.map((m) => (
        <div className="team-member" key={m.user_id}>
          <TeamIdentity
            profile={publicProfiles.get(m.user_id)}
            fallback="Private builder"
            role={m.role}
          />
          {owns && (
            <MemberRole
              member={m}
              name={publicProfiles.get(m.user_id)?.name || "builder"}
              onUpdated={() => void load()}
            />
          )}
          {(owns || m.user_id === result.viewerId) && (
            <button className="small-tool" onClick={() => setRemoving(m)}>
              {owns ? "Remove" : "Leave team"}
            </button>
          )}
        </div>
      ))}
      {!result?.members.length && (
        <p className="collaboration-team-note">
          {owns
            ? "Invite the next person who could make this idea better."
            : "No public team members to show yet."}
        </p>
      )}
      {owns && (
        <Link className="text-link team-inbox-link" href="/app/collaboration">
          Manage requests & invitations
          <ArrowUpRight size={13} />
        </Link>
      )}
      {member && !owns && (
        <p className="collaboration-team-note">
          Your team membership lets you view this project. Project editing stays
          with its owner.
        </p>
      )}
      <Modal
        open={invite}
        onOpenChange={setInvite}
        title={`A place on ${project.name}.`}
        description="The builder must accept before joining. Membership allows private-project viewing; project editing stays with you."
      >
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await sync();
              await performCollaborationAction("invite", project.id, {
                username: username.toLowerCase(),
                role,
              });
              toast("Team invitation is waiting in their Connect IRL inbox.");
              setInvite(false);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Could not send invitation.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Connect IRL username
            <input
              required
              minLength={2}
              maxLength={40}
              pattern="[a-z0-9][a-z0-9_-]+"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="their-builder-username"
            />
          </label>
          <label>
            Team role
            <input
              required
              maxLength={100}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? "Sending…" : "Send team invitation"}
          </Button>
        </form>
      </Modal>
      <Modal
        open={Boolean(removing)}
        onOpenChange={(v) => {
          if (!v) setRemoving(null);
        }}
        title={owns ? "Remove this team member?" : "Leave this team?"}
        description="This ends team membership and access to a private project. Personal contacts and private notes are unaffected."
      >
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              if (!removing) return;
              setBusy(true);
              try {
                await performCollaborationAction("remove_member", project.id, {
                  userId: removing.user_id,
                });
                toast("Team membership updated.");
                setRemoving(null);
                await load();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Team change failed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {owns ? "Remove member" : "Leave team"}
          </Button>
          <Button variant="secondary" onClick={() => setRemoving(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </section>
  );
}
function TeamIdentity({
  profile,
  fallback,
  role,
}: {
  profile?: Profile;
  fallback: string;
  role: string;
}) {
  return (
    <div className="team-identity">
      <Avatar
        name={profile?.name || fallback}
        src={profile?.avatar}
        size="sm"
      />
      <div>
        {profile ? (
          <Link href={`/u/${profile.username}`}>
            {profile.name}
            <ArrowUpRight size={12} />
          </Link>
        ) : (
          <strong>{fallback}</strong>
        )}
        <span>{role}</span>
      </div>
    </div>
  );
}
function MemberRole({
  member,
  name,
  onUpdated,
}: {
  member: TeamMember;
  name: string;
  onUpdated: () => void;
}) {
  const [role, setRole] = useState(member.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="member-role-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await performCollaborationAction(
            "set_member_role",
            member.project_id,
            { userId: member.user_id, role },
          );
          onUpdated();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Could not update role.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        aria-label={`Team role for ${name}`}
        required
        maxLength={100}
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <button className="small-tool" disabled={busy || role === member.role}>
        Save role
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
