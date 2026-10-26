"use client";
import { onboardingRoles, profileRoles } from "@/lib/onboarding";
import { sampleProfiles, sampleProjects } from "@/lib/samples";
import type { Contact, Profile, Project } from "@/lib/types";
import { contactFromProfile, safeUrl, uid } from "@/lib/utils";
import { projectSchema } from "@/lib/validation";
import {
  ArrowUpRight,
  Bookmark,
  Box,
  Check,
  Compass,
  Globe,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SaveContactDialog } from "./contact-tools";
import { Github } from "./icons";
import { Avatar, Button, ButtonLink, EmptyState, SocialLinks, Tag } from "./ui";
import { useWorkspace } from "./workspace-provider";
const VenuePresence = dynamic(() =>
  import("./venue-presence").then((m) => m.VenuePresence),
);
const ProjectTeam = dynamic(() =>
  import("./collaboration").then((m) => m.ProjectTeam),
);
const CollaborationRequestButton = dynamic(() =>
  import("./collaboration").then((m) => m.CollaborationRequestButton),
);
export function Discovery({
  projectsOnly = false,
}: {
  projectsOnly?: boolean;
}) {
  const { data, demo } = useWorkspace();
  const [tab, setTab] = useState(projectsOnly ? "Projects" : "People");
  const [query, setQuery] = useState("");
  const [eco, setEco] = useState("All ecosystems");
  const [role, setRole] = useState("All roles");
  const [need, setNeed] = useState("Any goal");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [save, setSave] = useState<Partial<Contact> | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let alive = true;
    if (demo) return;
    void fetch(`/api/discover?page=${page}`)
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        return result as { profiles: Profile[]; projects: Project[] };
      })
      .then((r) => {
        if (!alive) return;
        setProfiles((old) =>
          page === 0
            ? r.profiles
            : [
                ...old,
                ...r.profiles.filter((p) => !old.some((o) => o.id === p.id)),
              ],
        );
        setProjects((old) =>
          page === 0
            ? r.projects
            : [
                ...old,
                ...r.projects.filter((p) => !old.some((o) => o.id === p.id)),
              ],
        );
        setHasMore(r.profiles.length === 24 || r.projects.length === 24);
      })
      .catch((e) => {
        if (alive)
          setError(e.message || "Discovery is temporarily unavailable.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [demo, page]);
  const allProjects = [
    ...new Map(
      [...(demo ? sampleProjects : projects), ...data.projects].map((p) => [
        p.id,
        p,
      ]),
    ).values(),
  ];
  const filteredPeople = (demo ? sampleProfiles : profiles).filter(
    (p) =>
      !data.blocked.includes(p.id) &&
      (eco === "All ecosystems" || p.tags.includes(eco)) &&
      (role === "All roles" || profileRoles(p).includes(role)) &&
      (need === "Any goal" || p.lookingFor.includes(need)) &&
      `${p.name} ${p.headline} ${p.bio} ${p.project} ${p.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const filteredProjects = allProjects.filter(
    (p) =>
      (eco === "All ecosystems" || p.tags.includes(eco)) &&
      (need === "Any goal" || p.needs.includes(need)) &&
      `${p.name} ${p.tagline} ${p.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">
            GOOD PEOPLE. BIG IDEAS. RIGHT HERE.
          </span>
          <h1>
            {projectsOnly
              ? "See what’s being built."
              : "Find your kind of builders."}
          </h1>
          <p>
            {projectsOnly
              ? "The projects that make you think, “I want to be part of that.”"
              : "Your next collaborator, co-founder, or conversation starter."}
          </p>
        </div>
        {projectsOnly && (
          <ButtonLink href="/app/projects/new">
            <Plus size={16} />
            Add your project
          </ButtonLink>
        )}
      </div>
      <div className="people-toolbar">
        <div className="app-tabs">
          {(projectsOnly
            ? ["Projects", "Bookmarked", "My projects"]
            : ["People", "Projects", "At a venue"]
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t === "People" ? <Users size={15} /> : <Box size={15} />} {t}
            </button>
          ))}
        </div>
        <span className="discovery-privacy-note">
          <ShieldIcon />
          Opt-in discovery. Always.
        </span>
      </div>
      {tab === "At a venue" ? (
        <VenuePresence />
      ) : (
        <>
          <div className="search-filter-bar">
            <label className="app-search">
              <Search size={17} />
              <input
                placeholder={
                  tab === "People"
                    ? "Search people, skills, or what they’re building…"
                    : "Search projects, technologies, or an idea…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Ecosystem"
              value={eco}
              onChange={(e) => setEco(e.target.value)}
              className="filter-select"
            >
              {[
                "All ecosystems",
                "Ethereum",
                "Solana",
                "Base",
                "Polygon",
                "AI",
                "DeFi",
                "Infrastructure",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            {tab === "People" && (
              <select
                aria-label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="filter-select"
              >
                {["All roles", ...onboardingRoles, "Recruiter"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            )}
            <select
              aria-label="Collaboration goal"
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              className="filter-select"
            >
              {[
                "Any goal",
                "Co-founder",
                "Hiring",
                "Collaborators",
                "Seeking users",
                "Seeking funding",
                "Open to collaboration",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          {loading && !demo && !profiles.length && !projects.length ? (
            <div className="card-skeleton-grid">
              {[0, 1, 2].map((n) => (
                <div key={n} />
              ))}
            </div>
          ) : tab === "People" ? (
            filteredPeople.length ? (
              <>
                <p className="results-count">
                  {filteredPeople.length}{" "}
                  {demo ? "illustrative profiles" : "public builders"} · no
                  attendee lists or location tracking
                </p>
                <div className="builder-grid">
                  {filteredPeople.map((p) => (
                    <BuilderCard
                      profile={p}
                      key={p.id}
                      onSave={() => setSave(contactFromProfile(p))}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Compass size={27} />}
                title="Your people are on their way."
                description={
                  query || eco !== "All ecosystems"
                    ? "Try a broader search or another ecosystem."
                    : "Only builders who choose to be discoverable appear here. Be one of the first."
                }
              >
                <ButtonLink href="/app/profile" variant="secondary">
                  Set up my builder profile
                </ButtonLink>
              </EmptyState>
            )
          ) : (
            (() => {
              const list = filteredProjects.filter((p) =>
                tab === "Bookmarked"
                  ? data.bookmarks.includes(p.id)
                  : tab === "My projects"
                    ? data.projects.some((v) => v.id === p.id)
                    : true,
              );
              return list.length ? (
                <>
                  <p className="results-count">
                    {list.length} {demo ? "illustrative projects" : "projects"}
                  </p>
                  <div className="project-grid">
                    {list.map((p) => (
                      <ProjectCard project={p} key={p.id} />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<Box size={27} />}
                  title={
                    tab === "Bookmarked"
                      ? "Good ideas, kept close."
                      : "Your next “let’s build” is waiting."
                  }
                  description={
                    tab === "Bookmarked"
                      ? "Bookmark a project to keep it here."
                      : "Share what you’re working on, or try another search."
                  }
                >
                  <ButtonLink href="/app/projects/new" variant="secondary">
                    <Plus size={14} />
                    Add your project
                  </ButtonLink>
                </EmptyState>
              );
            })()
          )}
          {hasMore && (
            <div className="load-more">
              <Button
                variant="secondary"
                onClick={() => setPage((v) => v + 1)}
                disabled={loading}
              >
                {loading ? "Loading…" : "Discover more"}
              </Button>
            </div>
          )}
        </>
      )}
      {save && (
        <SaveContactDialog
          key={save.profileId}
          open
          onOpenChange={(v) => {
            if (!v) setSave(null);
          }}
          initial={save}
        />
      )}
    </div>
  );
}
function ShieldIcon() {
  return <Check size={12} />;
}
export function BuilderCard({
  profile: p,
  onSave,
}: {
  profile: Profile;
  onSave: () => void;
}) {
  const { data } = useWorkspace();
  const saved = data.contacts.some((c) => c.profileId === p.id);
  return (
    <article className="builder-card">
      <div className="builder-card-top">
        <Avatar name={p.name} src={p.avatar} size="lg" />
        {p.sample && <span className="sample-badge">SAMPLE</span>}
        <div className="tag-row profile-role-tags">
          {profileRoles(p).map((role) => (
            <Tag key={role}>{role}</Tag>
          ))}
        </div>
      </div>
      <Link href={`/u/${p.username}`}>
        <h3>
          {p.name}
          <ArrowUpRight size={15} />
        </h3>
      </Link>
      <p className="builder-headline">{p.headline}</p>
      <p className="builder-bio">{p.bio}</p>
      <div className="tag-row">
        {p.tags.slice(0, 3).map((t, i) => (
          <Tag key={t} color={i % 2 ? "purple" : "gray"}>
            {t}
          </Tag>
        ))}
      </div>
      <div className="builder-looking">
        <span>OPEN TO</span>
        {p.lookingFor.slice(0, 2).join(" · ") || "Good conversations"}
      </div>
      <div className="builder-card-bottom">
        <Button variant="secondary" onClick={onSave}>
          {saved ? <Check size={14} /> : <Plus size={14} />}{" "}
          {saved ? "Add meeting" : "Save connection"}
        </Button>
        <SocialLinks links={p.links.slice(0, 2)} />
      </div>
    </article>
  );
}
export function ProjectCard({ project: p }: { project: Project }) {
  const { data, update, toast } = useWorkspace();
  const marked = data.bookmarks.includes(p.id);
  return (
    <article className="project-card">
      <div className="project-card-top">
        <Link
          href={`/app/projects/${p.slug}`}
          className={`project-letter project-letter-${p.name.length % 3}`}
        >
          {p.name.slice(0, 1).toLowerCase()}
          <span>↗</span>
        </Link>
        <div>
          <Tag>{p.stage}</Tag>
          {p.sample && <span className="sample-badge">SAMPLE</span>}
        </div>
        <button
          className={`icon-button ${marked ? "bookmarked" : ""}`}
          aria-label={`${marked ? "Unbookmark" : "Bookmark"} ${p.name}`}
          onClick={() => {
            update((w) => ({
              ...w,
              bookmarks: marked
                ? w.bookmarks.filter((b) => b !== p.id)
                : [...w.bookmarks, p.id],
            }));
            toast(marked ? "Bookmark removed." : "Project bookmarked.");
          }}
        >
          <Bookmark size={18} fill={marked ? "currentColor" : "none"} />
        </button>
      </div>
      <Link href={`/app/projects/${p.slug}`}>
        <h3>
          {p.name}
          <ArrowUpRight size={15} />
        </h3>
      </Link>
      <p className="project-tagline">{p.tagline}</p>
      <p className="project-description">{p.description}</p>
      <div className="tag-row">
        {p.tags.map((t) => (
          <Tag key={t} color="gray">
            {t}
          </Tag>
        ))}
      </div>
      <div className="project-needs">
        <Users size={13} />
        {p.needs.join(" · ") || "Open to good conversations"}
      </div>
    </article>
  );
}
export function ProjectForm({
  existing,
  onSaved,
}: {
  existing?: Project;
  onSaved?: () => void;
}) {
  const { user, update, toast } = useWorkspace();
  const router = useRouter();
  const [form, setForm] = useState({
    name: existing?.name || "",
    tagline: existing?.tagline || "",
    description: existing?.description || "",
    website: existing?.website || "",
    repository: existing?.repository || "",
    demo: existing?.demo || "",
    tags: existing?.tags.join(", ") || "",
    stage: existing?.stage || "Building",
    needs: existing?.needs.join(", ") || "",
    public: existing?.public ?? true,
  });
  const [error, setError] = useState("");
  const field = (key: keyof typeof form, value: string | boolean) =>
    setForm((v) => ({ ...v, [key]: value }));
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="app-eyebrow">BIG IDEAS DESERVE GOOD COMPANY</span>
          <h1>
            {existing
              ? "Keep your project in the loop."
              : "What are you building?"}
          </h1>
          <p>A good idea gets better when the right people find it.</p>
        </div>
      </div>
      <form
        className="app-panel project-form form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const nameSlug = form.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          const project: Project = {
            id: existing?.id || uid(),
            slug: existing?.slug || `${nameSlug}-${uid().slice(0, 6)}`,
            name: form.name,
            tagline: form.tagline,
            description: form.description,
            website: form.website,
            repository: form.repository,
            demo: form.demo,
            tags: form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            stage: form.stage,
            needs: form.needs
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            ownerId: user?.id || "guest",
            public: form.public,
          };
          const parsed = projectSchema.safeParse(project);
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          update((w) => ({
            ...w,
            projects: existing
              ? w.projects.map((p) => (p.id === existing.id ? project : p))
              : [...w.projects, project],
          }));
          toast(
            user
              ? "Project saved. Cloud sync is queued."
              : "Project saved on this device. Sign in to publish it.",
          );
          onSaved?.();
          router.push(`/app/projects/${project.slug}`);
        }}
      >
        <div className="form-row">
          <label>
            Project name <span className="required">*</span>
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              placeholder="The name of your next big thing"
            />
          </label>
          <label>
            Stage
            <select
              value={form.stage}
              onChange={(e) => field("stage", e.target.value)}
            >
              {["Idea", "Building", "Testnet", "Live", "Growing"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          In one sentence
          <input
            required
            maxLength={180}
            value={form.tagline}
            onChange={(e) => field("tagline", e.target.value)}
            placeholder="What’s the idea?"
          />
        </label>
        <label>
          The story behind it
          <textarea
            rows={5}
            maxLength={5000}
            value={form.description}
            onChange={(e) => field("description", e.target.value)}
            placeholder="What are you making, who is it for, and what gets you excited about it?"
          />
        </label>
        <div className="form-row">
          <label>
            Website
            <input
              type="url"
              value={form.website}
              maxLength={2048}
              onChange={(e) => field("website", e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label>
            GitHub repository
            <input
              type="url"
              value={form.repository}
              maxLength={2048}
              onChange={(e) => field("repository", e.target.value)}
              placeholder="https://github.com/…"
            />
          </label>
        </div>
        <label>
          Demo link
          <input
            type="url"
            value={form.demo}
            maxLength={2048}
            onChange={(e) => field("demo", e.target.value)}
            placeholder="https://…"
          />
        </label>
        <label>
          Ecosystems & technologies <small>Separate with commas</small>
          <input
            maxLength={1000}
            value={form.tags}
            onChange={(e) => field("tags", e.target.value)}
            placeholder="Ethereum, Rust, Infrastructure"
          />
        </label>
        <label>
          Who would you love to meet? <small>Separate with commas</small>
          <input
            maxLength={1000}
            value={form.needs}
            onChange={(e) => field("needs", e.target.value)}
            placeholder="Co-founder, Collaborators, Hiring"
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.public}
            onChange={(e) => field("public", e.target.checked)}
          />
          <span>
            Make this project public
            <small>
              Publishing requires a signed-in account and successful cloud sync.
            </small>
          </span>
        </label>
        {!user && (
          <p className="notice">
            Your project will be saved locally. Sign in and import your device
            records to publish it.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <Button type="submit">
            <Check size={15} />
            {existing ? "Save changes" : "Save project"}
          </Button>
          <ButtonLink href="/app/projects" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
export function ProjectDetail({
  slug,
  initial,
}: {
  slug: string;
  initial?: Project | null;
}) {
  const { data, user, update, toast, demo } = useWorkspace();
  const [remote, setRemote] = useState<Project | null>(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [editing, setEditing] = useState(false);
  const [remoteFounder, setFounder] = useState<Profile | null>(null);
  const [save, setSave] = useState(false);
  const p =
    data.projects.find((p) => p.slug === slug) ||
    remote ||
    (demo ? sampleProjects.find((p) => p.slug === slug) : null);
  const founder = p?.sample
    ? sampleProfiles.find((f) => f.id === p.ownerId) || null
    : data.profile?.id === p?.ownerId
      ? data.profile
      : remoteFounder;
  useEffect(() => {
    if (initial || data.projects.some((p) => p.slug === slug) || demo) {
      return;
    }
    let alive = true;
    void fetch(`/api/projects/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((r) => {
        if (alive) setRemote(r.project || null);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, initial, data.projects, demo]);
  useEffect(() => {
    if (!p) return;
    if (p.sample || data.profile?.id === p.ownerId) return;
    let alive = true;
    void fetch(`/api/founders/${encodeURIComponent(p.ownerId)}`)
      .then((r) => r.json())
      .then((r) => {
        if (alive) setFounder(r.profile || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [p, data.profile]);
  if (loading && !p)
    return (
      <div className="page-skeleton">
        <div />
        <div />
        <span>Finding that idea…</span>
      </div>
    );
  if (!p)
    return (
      <EmptyState
        title="This project is unavailable."
        description="It may be private, or saved in another workspace."
      >
        <ButtonLink href="/app/projects" variant="secondary">
          Explore projects
        </ButtonLink>
      </EmptyState>
    );
  const owns =
    data.projects.some((v) => v.id === p.id) &&
    (!user || p.ownerId === user.id) &&
    !p.sample;
  if (editing && owns)
    return <ProjectForm existing={p} onSaved={() => setEditing(false)} />;
  return (
    <div>
      <Link href="/app/projects" className="back-link">
        ← Back to projects
      </Link>
      <div className="project-detail-hero">
        <span className={`project-letter project-letter-${p.name.length % 3}`}>
          {p.name[0].toLowerCase()}
          <span>↗</span>
        </span>
        <div>
          <div className="tag-row">
            <Tag>{p.stage}</Tag>
            {p.sample && <Tag color="orange">ILLUSTRATIVE PROJECT</Tag>}
            {!p.public && <Tag color="gray">PRIVATE</Tag>}
          </div>
          <h1>{p.name}</h1>
          <p>{p.tagline}</p>
        </div>
        <div className="button-row">
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard
                .writeText(`${location.origin}/projects/${p.slug}`)
                .then(() => toast("Project link copied."))
                .catch(() => toast("Copy unavailable in this browser."));
            }}
          >
            Share
            <ArrowUpRight size={14} />
          </Button>
          {owns && (
            <Button onClick={() => setEditing(true)}>Edit project</Button>
          )}
        </div>
      </div>
      <div className="detail-grid">
        <section className="app-panel project-story">
          <span className="app-eyebrow">THE IDEA</span>
          <h2>A little more about {p.name}.</h2>
          <p>
            {p.description || "The builder hasn’t added the full story yet."}
          </p>
          <div className="tag-row">
            {p.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          <div className="project-resource-links">
            {[
              { label: "Website", url: p.website, icon: Globe },
              { label: "Repository", url: p.repository, icon: Github },
              { label: "Live demo", url: p.demo, icon: ArrowUpRight },
            ]
              .filter((l) => safeUrl(l.url))
              .map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <l.icon size={16} />
                  {l.label}
                  <ArrowUpRight size={14} />
                </a>
              ))}
          </div>
        </section>
        <aside>
          <section className="app-panel contact-context">
            <h3>Good ideas need good people.</h3>
            <p>{p.needs.join(" · ") || "Open to collaboration"}</p>
            {p.public && !owns && <CollaborationRequestButton project={p} />}
            {founder && (
              <>
                <div className="project-founder">
                  <Avatar name={founder.name} src={founder.avatar} />
                  <div>
                    <strong>{founder.name}</strong>
                    <span>{founder.headline}</span>
                  </div>
                </div>
                <Button onClick={() => setSave(true)}>
                  <Plus size={14} />
                  Save the builder
                </Button>
                <SocialLinks links={founder.links} />
              </>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                const marked = data.bookmarks.includes(p.id);
                update((w) => ({
                  ...w,
                  bookmarks: marked
                    ? w.bookmarks.filter((id) => id !== p.id)
                    : [...w.bookmarks, p.id],
                }));
                toast(marked ? "Bookmark removed." : "Project bookmarked.");
              }}
            >
              <Bookmark
                size={15}
                fill={data.bookmarks.includes(p.id) ? "currentColor" : "none"}
              />
              {data.bookmarks.includes(p.id)
                ? "Bookmarked"
                : "Bookmark project"}
            </Button>
          </section>
        </aside>
      </div>
      <ProjectTeam project={p} />
      {founder && save && (
        <SaveContactDialog
          open
          onOpenChange={setSave}
          initial={contactFromProfile(founder)}
        />
      )}
    </div>
  );
}
