import { describe, expect, it } from "vitest";
import {
  parseProfileUrl,
  safeUrl,
  searchContacts,
  vcard,
  followUpDraft,
} from "@/lib/utils";
import { projectSchema, syncSchema } from "@/lib/validation";
import type { Contact } from "@/lib/types";
const contact: Contact = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  name: "Asha Rao",
  headline: "Solana engineer",
  project: "Payment Rail",
  avatar: "",
  tags: ["Rust", "USDC"],
  links: [{ label: "Website", url: "https://example.com/" }],
  meetings: [
    {
      id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
      at: "2026-10-25T10:00:00Z",
      eventId: "ibw-2026",
      note: "Discussed payment infrastructure and hiring Rust developers.",
    },
  ],
  starred: false,
  archived: false,
  source: "manual",
  createdAt: "2026-10-25T10:00:00Z",
};
describe("Safe links and profile QR parsing", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>",
    "file:///etc/passwd",
    "https://name:secret@example.com/",
    "not a link",
  ])("rejects unsafe URL %s", (input) => expect(safeUrl(input)).toBeNull());
  it("parses only public profile paths on this app origin", () => {
    expect(
      parseProfileUrl("https://builder.test/u/asha", "https://builder.test"),
    ).toEqual({ username: "asha" });
    expect(
      parseProfileUrl(
        "https://builder.test/app/settings",
        "https://builder.test",
      ),
    ).toBeNull();
    expect(
      parseProfileUrl(
        "https://builder.test.evil/u/asha",
        "https://builder.test",
      ),
    ).toEqual({ external: "https://builder.test.evil/u/asha" });
  });
  it("keeps external social links as external contacts", () =>
    expect(
      parseProfileUrl(
        "https://www.linkedin.com/in/asha/",
        "https://builder.test",
      ),
    ).toEqual({ external: "https://www.linkedin.com/in/asha/" }));
});
describe("Grounded conference memory", () => {
  it.each([
    "Solana engineer I met at IBW",
    "Who did I meet at IBW who builds something with USDC?",
    "wallet person discussed payment infrastructure",
    "Asha",
    "Rust hiring",
  ])("finds matches based on saved fields: %s", (q) =>
    expect(searchContacts([contact], q)).toEqual([contact]),
  );
  it("returns no fabricated matches", () =>
    expect(searchContacts([contact], "Cardano healthcare")).toEqual([]));
  it("includes event identity in a follow-up draft", () => {
    expect(followUpDraft(contact)).toContain("IBW");
    expect(followUpDraft(contact)).toContain("payment infrastructure");
  });
  it("exports only public supplied fields, without private meeting notes", () => {
    const output = vcard({ ...contact, name: "Asha, Rao;Builder\nNew line" });
    expect(output).toContain("FN:Asha\\, Rao\\;Builder\\nNew line");
    expect(output).toContain("URL:https://example.com/");
    expect(output).not.toContain("Discussed");
  });
});
describe("Cloud payload validation", () => {
  it("rejects oversized notes and forged guest row IDs", () => {
    const result = syncSchema.safeParse({
      profile: null,
      contacts: [{ ...contact, id: "not-a-uuid" }],
      projects: [],
      reminders: [],
      bookmarks: [],
      eventBookmarks: [],
      blocked: [],
    });
    expect(result.success).toBe(false);
  });
  it("rejects unsafe project links", () =>
    expect(
      projectSchema.safeParse({
        id: contact.id,
        ownerId: contact.id,
        slug: "safe-project",
        name: "Rail",
        tagline: "",
        description: "",
        website: "javascript:alert(1)",
        repository: "",
        demo: "",
        tags: [],
        stage: "Building",
        needs: [],
        public: true,
      }).success,
    ).toBe(false));
  it("accepts a valid offline batch for transactional sync", () =>
    expect(
      syncSchema.safeParse({
        profile: null,
        contacts: [contact],
        projects: [],
        reminders: [],
        bookmarks: [],
        eventBookmarks: [],
        blocked: [],
        preferencesChanged: false,
      }).success,
    ).toBe(true));
});
