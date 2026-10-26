"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  QrCode,
  Upload,
  LoaderCircle,
  Building2,
  Sparkles,
  Code2,
  Rocket,
  Users,
  Wallet,
  PenTool,
  GraduationCap,
  FlaskConical,
  CircleUserRound,
  Layers,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { profileSchema } from "@/lib/validation";
import { uid } from "@/lib/utils";
import { events } from "@/lib/events";
import {
  generatedUsername,
  hasDeveloperRole,
  normalizeCompanyLink,
  normalizeXHandle,
  onboardingRoles,
  profileRoles,
  socialProfileURL,
} from "@/lib/onboarding";
import { Avatar, Button, ButtonLink, Tag } from "./ui";
import { useWorkspace } from "./workspace-provider";
import { SocialLogo } from "./social-logo";
import { EventLogo } from "./event-brand";
import { useProfilePhoto } from "./use-profile-photo";
const platforms = ["X", "LinkedIn", "GitHub", "Website", "Telegram", "Discord"];
const placeholders: Record<string, string> = {
  X: "@yourhandle",
  LinkedIn: "https://linkedin.com/in/you",
  GitHub: "Your GitHub username",
  Website: "https://your.site",
  Telegram: "@yourhandle",
  Discord: "https://discord.com/users/your-id",
};
const roleIcons = {
  Builder: Layers,
  Developer: Code2,
  Engineer: Code2,
  Founder: Rocket,
  Designer: PenTool,
  Investor: Wallet,
  Trader: Wallet,
  "Crypto enthusiast": Sparkles,
  Community: Users,
  Researcher: FlaskConical,
  Student: GraduationCap,
  Other: CircleUserRound,
};
const blankCompany = {
  name: "",
  designation: "",
  website: "",
  linkedin: "",
  logo: "",
};
export function ProfileSetup() {
  const { data, user } = useWorkspace();
  return (
    <ProfileSetupForm
      key={
        data.profile ? `saved-${data.profile.id}` : `new-${user?.id || "guest"}`
      }
    />
  );
}
function ProfileSetupForm() {
  const { data, user, update, toast, demo } = useWorkspace();
  const router = useRouter();
  const existing = data.profile;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState("");
  const [failedLogo, setFailedLogo] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const [event, setEvent] = useState(data.activeEventId || "");
  const [eventPicked, setEventPicked] = useState(
    Boolean(data.activeEventId || existing),
  );
  const [roles, setRoles] = useState<string[]>(
    existing ? profileRoles(existing) : [],
  );
  const [form, setForm] = useState<Profile>(
    () =>
      existing || {
        id: user?.id || uid(),
        username: "",
        name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
        headline: "",
        bio: "",
        role: "",
        organization: "",
        city: "",
        avatar:
          typeof user?.user_metadata?.avatar_url === "string" &&
          user.user_metadata.avatar_url.startsWith("https://")
            ? user.user_metadata.avatar_url
            : "",
        tags: [],
        lookingFor: [],
        project: "",
        links: [],
        public: true,
        discoverable: false,
      },
  );
  const [socials, setSocials] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      platforms.map((platform) => {
        const url =
          existing?.links.find(
            (link) =>
              link.label === platform ||
              (platform === "X" && link.label === "Twitter"),
          )?.url || "";
        return [
          platform,
          platform === "X" ? normalizeXHandle(url) || url : url,
        ];
      }),
    ),
  );
  const [companyLink, setCompanyLink] = useState(
    existing?.company?.website || existing?.company?.linkedin || "",
  );
  const normalizedHandle = normalizeXHandle(socials.X || "");
  const companyAddress = normalizeCompanyLink(companyLink);
  const developer = hasDeveloperRole(roles);
  const founder = roles.includes("Founder");
  const company = form.company || {
    ...blankCompany,
    name: founder ? form.organization || form.project : "",
  };
  const canLookup = Boolean(user && !demo);
  const xPhoto = useProfilePhoto(
    "x",
    normalizedHandle || "",
    canLookup,
    existing?.avatarSource === "x" && normalizedHandle
      ? { key: normalizedHandle, photo: existing.avatar }
      : undefined,
  );
  const websitePhoto = useProfilePhoto(
    "company",
    founder ? companyAddress?.website || "" : "",
    canLookup,
    existing?.company?.logo
      ? { key: existing.company.website, photo: existing.company.logo }
      : undefined,
  );
  const candidateAvatar =
    form.avatarSource === "upload" ? form.avatar : xPhoto.photo || form.avatar;
  const candidateLogo = websitePhoto.photo || company.logo;
  const shownAvatar = candidateAvatar === failedAvatar ? "" : candidateAvatar;
  const shownCompanyLogo = candidateLogo === failedLogo ? "" : candidateLogo;
  useEffect(() => {
    heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);
  const field = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const companyField = (key: keyof typeof blankCompany, value: string) =>
    setForm((current) => ({
      ...current,
      company: {
        ...blankCompany,
        name: current.organization || current.project,
        ...current.company,
        [key]: value,
      },
    }));
  const socialField = (platform: string, value: string) => {
    setSocials((current) => ({ ...current, [platform]: value }));
    if (platform === "X" && normalizeXHandle(value) !== normalizedHandle)
      setForm((current) =>
        current.avatarSource === "x"
          ? { ...current, avatar: "", avatarSource: undefined }
          : current,
      );
  };
  const toggleRole = (role: string) =>
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : current.length < 8
          ? [...current, role]
          : current,
    );
  const normalizedLinks = () => {
    const result = form.links.filter(
      (link) => !platforms.includes(link.label) && link.label !== "Twitter",
    );
    for (const platform of platforms) {
      const value = socials[platform]?.trim();
      if (!value) continue;
      const url = socialProfileURL(platform, value);
      if (!url)
        throw new Error(
          `Check your ${platform === "X" ? "X / Twitter username" : `${platform} link`}.`,
        );
      result.push({ label: platform, url });
    }
    return result;
  };
  const validateYou = () => {
    if (!form.name.trim())
      throw new Error("What should we call you? Add your name to continue.");
    if (!roles.length)
      throw new Error(
        "Choose at least one role. You can choose more than one.",
      );
  };
  const validateLinks = () => {
    if (!existing && !normalizedHandle)
      throw new Error("Enter your X / Twitter username to continue.");
    normalizedLinks();
    if (founder && !companyAddress)
      throw new Error("Use a company website or a LinkedIn company-page URL.");
  };
  const submit = () => {
    setError("");
    try {
      validateYou();
      if (!existing && step === 0) {
        setStep(1);
        return;
      }
      validateLinks();
      if (!existing && step === 1) {
        setStep(2);
        return;
      }
      if (!existing && !eventPicked)
        throw new Error(
          "Choose your event, or select ‘Not attending an event yet’.",
        );
      const business =
        founder && (company.name || company.designation || companyLink)
          ? { ...company, ...companyAddress, logo: shownCompanyLogo }
          : existing?.company;
      const parsed = profileSchema.safeParse({
        ...form,
        avatar: shownAvatar,
        avatarSource:
          form.avatarSource === "upload"
            ? "upload"
            : xPhoto.photo && shownAvatar
              ? "x"
              : form.avatarSource,
        id: user?.id || form.id,
        username: existing
          ? form.username
          : generatedUsername(normalizedHandle!, user?.id || form.id),
        role: roles[0],
        roles,
        links: normalizedLinks(),
        company: business,
        organization: business?.name || form.organization,
        project: form.project || business?.name || "",
        headline:
          form.headline ||
          (business?.name && business.designation
            ? `${business.designation} at ${business.name}`.slice(0, 180)
            : roles.join(" · ")),
      });
      if (!parsed.success)
        throw new Error(
          parsed.error.issues[0]?.message || "Check your profile details.",
        );
      update((workspace) => ({
        ...workspace,
        profile: parsed.data,
        activeEventId: event,
      }));
      toast(
        existing ? "Profile updated." : "You’re ready. Go meet your people.",
      );
      if (!existing) router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check your details.");
    }
  };
  const photoStatus = (
    <div className="photo-lookup-message" role="status">
      {xPhoto.status === "loading" ? (
        <>
          <LoaderCircle size={13} className="spin" /> Looking up your public X
          photo… You can continue.
        </>
      ) : xPhoto.photo ? (
        <>
          <Check size={13} />{" "}
          {shownAvatar
            ? "Your public X photo is ready."
            : "Using your initials for now. You can add a photo later."}
        </>
      ) : (
        xPhoto.message ||
        (!canLookup && normalizedHandle
          ? "Automatic photos become available after sign-in and X API setup. You can continue now."
          : "Your photo appears here when you enter your X username.")
      )}
      {xPhoto.status === "unavailable" && (
        <button type="button" onClick={xPhoto.retry}>
          Try again
        </button>
      )}
    </div>
  );
  const socialInput = (platform: string, optional = true) => (
    <label
      key={platform}
      className={`social-field social-field-${platform.toLowerCase()}`}
    >
      <span className="social-input-label">
        <SocialLogo platform={platform} />
        {platform === "X" ? "X / Twitter" : platform}
        {optional && <small>Optional</small>}
      </span>
      <input
        aria-label={platform === "X" ? "X / Twitter" : platform}
        required={!optional}
        type={
          platform === "X" || platform === "GitHub" || platform === "Telegram"
            ? "text"
            : "url"
        }
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={platform === "X" ? 200 : 2048}
        value={socials[platform] || ""}
        onChange={(e) => socialField(platform, e.target.value)}
        placeholder={placeholders[platform]}
      />
    </label>
  );
  const about = (
    <section className="setup-section">
      <h2>
        {existing ? "A little about you." : "Hey, welcome. What’s your name?"}
      </h2>
      <label>
        Your name
        <input
          required
          maxLength={100}
          autoComplete="name"
          value={form.name}
          onChange={(e) => field("name", e.target.value)}
          placeholder="What should we call you?"
        />
      </label>
      <fieldset className="field-group">
        <legend>
          What do you do?{" "}
          <span className="field-hint">Choose all that fit.</span>
        </legend>
        <div className="role-picker multi-role-picker">
          {[...new Set([...onboardingRoles, ...roles])].map((role) => {
            const Icon =
              roleIcons[role as keyof typeof roleIcons] || CircleUserRound;
            return (
              <button
                key={role}
                type="button"
                className={roles.includes(role) ? "active" : ""}
                aria-pressed={roles.includes(role)}
                onClick={() => toggleRole(role)}
              >
                <Icon size={15} />
                {role}
                {roles.includes(role) && <Check size={13} />}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="selected-role-summary" aria-live="polite">
        {roles.length ? (
          <>
            <Sparkles size={15} />
            {roles.join(" · ")}
          </>
        ) : (
          "A builder can wear more than one hat."
        )}
      </div>
    </section>
  );
  const companySection = (
    <div className="setup-company">
      <div className="company-heading">
        <Building2 size={19} />
        <div>
          <h3>Your company</h3>
          <p>For your founder hat. These details are optional.</p>
        </div>
      </div>
      <div className="company-preview">
        <Avatar
          name={company.name || "Company"}
          src={shownCompanyLogo}
          onImageError={() => setFailedLogo(candidateLogo)}
        />
        <div>
          <strong>{company.name || "Your company"}</strong>
          <small>{company.designation || "Your designation"}</small>
          {shownCompanyLogo && <small>Website icon</small>}
        </div>
      </div>
      <div className="form-row">
        <label>
          Business name
          <input
            maxLength={100}
            value={company.name}
            onChange={(e) => companyField("name", e.target.value)}
            placeholder="What’s your business called?"
          />
        </label>
        <label>
          Designation
          <input
            maxLength={100}
            value={company.designation}
            onChange={(e) => companyField("designation", e.target.value)}
            placeholder="Founder, CEO, CTO…"
          />
        </label>
      </div>
      <label>
        Company website or LinkedIn
        <input
          type="url"
          maxLength={2048}
          value={companyLink}
          onChange={(e) => {
            const next = e.target.value;
            if (normalizeCompanyLink(next)?.website !== companyAddress?.website)
              companyField("logo", "");
            setCompanyLink(next);
          }}
          placeholder="https://your-company.com"
        />
      </label>
      <p className="form-footnote" role="status">
        {websitePhoto.status === "loading"
          ? "Looking for a website icon… You can continue."
          : websitePhoto.message ||
            (companyAddress?.linkedin
              ? "Add a company website later to use its site icon."
              : "A supported website icon is added automatically where available; otherwise we’ll use company initials.")}
      </p>
    </div>
  );
  const links = (
    <section className="setup-section">
      <h2>Your links. A familiar face.</h2>
      <div className="setup-social-photo">
        <div className="social-photo-avatar">
          <Avatar
            name={form.name || "You"}
            src={shownAvatar}
            size="lg"
            onImageError={() => setFailedAvatar(candidateAvatar)}
          />
          {xPhoto.status === "loading" && (
            <span className="photo-loading-ring" />
          )}
        </div>
        <div>
          <strong>{form.name || "Your public profile"}</strong>
          <small>{roles.join(" · ")}</small>
          {normalizedHandle && <span>@{normalizedHandle}</span>}
        </div>
      </div>
      {socialInput("X", Boolean(existing))}
      {photoStatus}
      {xPhoto.photo && form.avatarSource === "upload" && (
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            setForm((current) => ({
              ...current,
              avatar: xPhoto.photo,
              avatarSource: "x",
            }))
          }
        >
          Use X photo instead
        </Button>
      )}
      {socialInput("LinkedIn")}
      {(developer || existing) && socialInput("GitHub")}
      {(founder || (existing && existing.company)) && companySection}
      <details className="setup-more">
        <summary>More social links (optional)</summary>
        <div className="setup-socials">
          {platforms
            .filter(
              (platform) =>
                !["X", "LinkedIn"].includes(platform) &&
                !(platform === "GitHub" && (developer || existing)),
            )
            .map((platform) => socialInput(platform))}
        </div>
      </details>
    </section>
  );
  const eventSection = (
    <section className="setup-section setup-event-step">
      <h2>Which event are you attending?</h2>
      <p className="form-footnote">
        Your connections will remember this event and the time you meet. You can
        change it later.
      </p>
      <div className="setup-event-logos" aria-label="Choose your event">
        {events.map((item) => (
          <button
            type="button"
            key={item.id}
            className={event === item.id ? "selected" : ""}
            aria-label={`Choose ${item.name}`}
            aria-pressed={event === item.id}
            onClick={() => {
              setEvent(item.id);
              setEventPicked(true);
            }}
          >
            <EventLogo event={item} decorative />
            <span>{item.shortName}</span>
            <small>{item.dates}</small>
            {event === item.id && <Check size={14} />}
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        aria-pressed={eventPicked && !event}
        className="skip-event"
        onClick={() => {
          setEvent("");
          setEventPicked(true);
        }}
      >
        {eventPicked && !event && <Check size={14} />}Not attending an event yet
      </Button>
      <details className="setup-more">
        <summary>Profile visibility</summary>
        <div className="profile-privacy-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.public}
              onChange={(e) => {
                field("public", e.target.checked);
                if (!e.target.checked) field("discoverable", false);
              }}
            />
            <span>
              Share a public profile
              <small>
                Your profile and social links can be viewed. Notes stay private.
              </small>
            </span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              disabled={!form.public}
              checked={form.discoverable}
              onChange={(e) => field("discoverable", e.target.checked)}
            />
            <span>
              Let people discover me
              <small>Event selection doesn’t publish a venue check-in.</small>
            </span>
          </label>
        </div>
      </details>
      <p className="form-footnote">
        {form.public
          ? "Your shared profile is public."
          : "Your profile is private."}{" "}
        Edit your details anytime in Settings.
      </p>
    </section>
  );
  const advanced = (
    <section className="setup-section">
      <h2>Profile details</h2>
      <div className="setup-avatar">
        <Avatar
          name={form.name || "You"}
          src={shownAvatar}
          size="lg"
          onImageError={() => setFailedAvatar(candidateAvatar)}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!user || demo || uploading}
          onClick={() => upload.current?.click()}
        >
          <Upload size={14} />
          {uploading ? "Uploading…" : "Change photo"}
        </Button>
        <input
          ref={upload}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Upload avatar"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            setError("");
            try {
              const body = new FormData();
              body.append("file", file);
              const response = await fetch("/api/avatar", {
                method: "POST",
                body,
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setForm((current) => ({
                ...current,
                avatar: result.url,
                avatarSource: "upload",
              }));
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Photo could not upload.",
              );
            } finally {
              setUploading(false);
            }
          }}
        />
      </div>
      <label>
        Username
        <input
          required
          maxLength={40}
          pattern="[a-z0-9][a-z0-9_-]{1,39}"
          value={form.username}
          onChange={(e) =>
            field(
              "username",
              e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
            )
          }
        />
      </label>
      <label>
        A one-line introduction
        <input
          maxLength={180}
          value={form.headline}
          onChange={(e) => field("headline", e.target.value)}
        />
      </label>
      <label>
        What are you building?
        <input
          maxLength={100}
          value={form.project}
          onChange={(e) => field("project", e.target.value)}
        />
      </label>
      <details className="setup-more">
        <summary>More about you</summary>
        <div className="form-stack">
          <label>
            Organization
            <input
              maxLength={100}
              value={form.organization}
              onChange={(e) => field("organization", e.target.value)}
            />
          </label>
          <label>
            City
            <input
              maxLength={100}
              value={form.city}
              onChange={(e) => field("city", e.target.value)}
            />
          </label>
          <label>
            A little more about you
            <textarea
              maxLength={2000}
              rows={3}
              value={form.bio}
              onChange={(e) => field("bio", e.target.value)}
            />
          </label>
          <label>
            Skills & interests
            <input
              value={form.tags.join(", ")}
              onChange={(e) =>
                field(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .slice(0, 20),
                )
              }
            />
          </label>
          <label>
            Open to
            <input
              value={form.lookingFor.join(", ")}
              onChange={(e) =>
                field(
                  "lookingFor",
                  e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .slice(0, 20),
                )
              }
            />
          </label>
        </div>
      </details>
    </section>
  );
  return (
    <div className="simple-onboarding streamlined-onboarding">
      <div className="page-heading" ref={heading}>
        <div>
          <span className="app-eyebrow">
            {existing
              ? "YOUR PROFILE, YOUR WAY"
              : "ONE PROFILE. YOUR NEXT GREAT HELLO."}
          </span>
          <h1>
            {existing
              ? "Your profile & links."
              : step === 0
                ? "Let’s get you connected."
                : step === 1
                  ? "Make it easy to say hello."
                  : "Your people are out there."}
          </h1>
          <p>
            {existing
              ? "Update your details whenever you like."
              : step === 0
                ? "Three quick steps. Start with you."
                : step === 1
                  ? "Your X photo comes along for the introduction."
                  : "Pick your event, then you’re ready to connect."}
          </p>
        </div>
        {existing && (
          <ButtonLink href="/app">
            <QrCode size={15} />
            My workspace
          </ButtonLink>
        )}
      </div>
      {!existing && (
        <div
          className="setup-progress"
          aria-label={`Onboarding step ${step + 1} of 3`}
        >
          {["You", "Your links", "Your event"].map((label, index) => (
            <span
              key={label}
              className={index === step ? "active" : index < step ? "done" : ""}
            >
              <b>{index < step ? <Check size={13} /> : index + 1}</b>
              {label}
            </span>
          ))}
        </div>
      )}
      <form
        noValidate
        className="app-panel form-stack simple-profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="setup-step" key={existing ? "editing" : step}>
          {(existing || step === 0) && about}
          {existing && advanced}
          {(existing || step === 1) && links}
          {(existing || step === 2) && eventSection}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row setup-actions">
          {!existing && step > 0 && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setStep(step - 1);
                setError("");
              }}
            >
              <ArrowLeft size={14} />
              Back
            </Button>
          )}
          <Button type="submit" disabled={uploading}>
            {existing
              ? "Save my profile"
              : step < 2
                ? "Continue"
                : "Finish setup"}
            {!existing && step < 2 ? (
              <ArrowRight size={15} />
            ) : (
              <Check size={15} />
            )}
          </Button>
        </div>
        <Tag>Private meeting notes. Always.</Tag>
      </form>
    </div>
  );
}
