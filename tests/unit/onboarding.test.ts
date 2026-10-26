import { describe, expect, it } from "vitest";
import {
  normalizeXHandle,
  socialProfileURL,
  profileRoles,
  generatedUsername,
  hasDeveloperRole,
  normalizeCompanyLink,
} from "../../src/lib/onboarding";
describe("Quick profile setup", () => {
  it("accepts a bare X handle or its official profile URL, without accepting lookalike domains", () => {
    expect(normalizeXHandle(" @asha_dev ")).toBe("asha_dev");
    expect(normalizeXHandle("https://twitter.com/asha_dev")).toBe("asha_dev");
    expect(normalizeXHandle("https://x.com/asha_dev?lang=en")).toBe("asha_dev");
    expect(normalizeXHandle("https://x.com.attacker.com/asha_dev")).toBeNull();
    expect(normalizeXHandle("not-a-handle")).toBeNull();
    expect(normalizeXHandle("https://x.com/asha_dev/status/123")).toBeNull();
  });
  it("normalizes optional social handles, preserves safe URLs and rejects credentials/javascript", () => {
    expect(socialProfileURL("GitHub", "asha-dev")).toBe(
      "https://github.com/asha-dev",
    );
    expect(socialProfileURL("LinkedIn", "asha-rao")).toBe(
      "https://www.linkedin.com/in/asha-rao",
    );
    expect(socialProfileURL("Telegram", "@asha_dev")).toBe(
      "https://t.me/asha_dev",
    );
    expect(socialProfileURL("LinkedIn", "javascript:alert(1)")).toBeNull();
    expect(
      socialProfileURL("Website", "https://secret@company.com"),
    ).toBeNull();
    expect(socialProfileURL("Website", "company.com")).toBe(
      "https://company.com/",
    );
  });
  it("reads legacy single-role profiles and recognizes multi-role developers", () => {
    expect(profileRoles({ role: "Designer" })).toEqual(["Designer"]);
    expect(
      profileRoles({ role: "Founder", roles: ["Founder", "Engineer"] }),
    ).toEqual(["Founder", "Engineer"]);
    expect(hasDeveloperRole(["Founder", "Engineer"])).toBe(true);
    expect(hasDeveloperRole(["Investor", "Crypto enthusiast"])).toBe(false);
  });
  it("derives a stable profile address without reserved usernames", () => {
    const result = generatedUsername(
      "asha_dev",
      "11111111-1111-4111-8111-123456789abc",
    );
    expect(result).toBe("asha_dev-56789abc");
    expect(
      generatedUsername("demo", "11111111-1111-4111-8111-123456789abc"),
    ).not.toMatch(/^demo-/);
    expect(
      generatedUsername("_asha", "11111111-1111-4111-8111-123456789abc"),
    ).toMatch(/^[a-z0-9]/);
  });
  it("distinguishes a company LinkedIn address from its website", () => {
    expect(
      normalizeCompanyLink("https://www.linkedin.com/company/rail"),
    ).toEqual({
      website: "",
      linkedin: "https://www.linkedin.com/company/rail",
    });
    expect(normalizeCompanyLink("rail.example.com")).toEqual({
      website: "https://rail.example.com/",
      linkedin: "",
    });
  });
});
