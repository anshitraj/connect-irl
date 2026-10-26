import type { Profile } from "./types";
export const onboardingRoles = [
  "Builder",
  "Developer",
  "Engineer",
  "Founder",
  "Designer",
  "Investor",
  "Crypto enthusiast",
  "Trader",
  "Community",
  "Researcher",
  "Student",
  "Other",
] as const;
export function profileRoles(profile: {
  role: string;
  roles?: string[];
}): string[] {
  return [
    ...new Set(
      profile.roles?.length
        ? profile.roles
        : profile.role
          ? [profile.role]
          : [],
    ),
  ];
}
export function hasDeveloperRole(roles: string[]) {
  return roles.some((role) => /developer|engineer/i.test(role));
}
export function normalizeXHandle(input: string): string | null {
  let value = input.trim();
  if (/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i.test(value)) {
    try {
      const url = new URL(/^https?:/i.test(value) ? value : `https://${value}`);
      if (
        !/^(www\.)?(x|twitter)\.com$/i.test(url.hostname) ||
        url.username ||
        url.password ||
        url.port
      )
        return null;
      value = url.pathname.replace(/^\//, "").replace(/\/$/, "");
    } catch {
      return null;
    }
  }
  value = value.replace(/^@/, "");
  return /^[a-zA-Z0-9_]{1,15}$/.test(value) ? value : null;
}
export function socialProfileURL(platform: string, raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  if (platform === "X") {
    const handle = normalizeXHandle(value);
    return handle ? `https://x.com/${handle}` : null;
  }
  if (!/^https?:\/\//i.test(value)) {
    if (
      platform === "GitHub" &&
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(
        value.replace(/^@/, ""),
      )
    )
      return `https://github.com/${value.replace(/^@/, "")}`;
    if (platform === "LinkedIn" && /^[a-zA-Z0-9_-]{2,100}$/.test(value))
      return `https://www.linkedin.com/in/${value}`;
    if (platform === "Telegram" && /^@?[a-zA-Z0-9_]{1,32}$/.test(value))
      return `https://t.me/${value.replace(/^@/, "")}`;
  }
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value))
      return null;
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname.includes(".")
    )
      return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (
      platform === "GitHub" &&
      (host !== "github.com" || !/^\/[a-zA-Z0-9-]+\/?$/.test(url.pathname))
    )
      return null;
    if (
      platform === "LinkedIn" &&
      ((host !== "linkedin.com" && !host.endsWith(".linkedin.com")) ||
        !/^\/in\/[^/]+\/?$/.test(url.pathname))
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function normalizeCompanyLink(
  raw: string,
): { website: string; linkedin: string } | null {
  if (!raw.trim()) return { website: "", linkedin: "" };
  const result = socialProfileURL("Website", raw);
  if (!result) return null;
  const url = new URL(result);
  if (/(^|\.)linkedin\.com$/.test(url.hostname))
    return /^\/company\/[^/]+\/?$/.test(url.pathname)
      ? { website: "", linkedin: result }
      : null;
  return { website: result, linkedin: "" };
}
export function generatedUsername(handle: string, id: string) {
  let base = handle
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 15);
  if (!/^[a-z0-9]/.test(base) || base === "demo") base = `u${base}`;
  return `${base}-${id.replace(/-/g, "").slice(-8).toLowerCase()}`;
}
export function roleSummary(profile: Pick<Profile, "role" | "roles">) {
  return profileRoles(profile).join(" · ");
}
