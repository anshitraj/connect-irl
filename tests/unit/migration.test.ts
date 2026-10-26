import { expect, it } from "vitest";
import { mergeGuestWorkspace } from "@/lib/migration";
import { emptyWorkspace, type Contact } from "@/lib/types";
const base: Contact = {
  id: "existing",
  name: "Asha",
  headline: "",
  project: "",
  avatar: "",
  tags: ["Rust"],
  links: [{ label: "GitHub", url: "https://github.com/asha" }],
  meetings: [
    {
      id: "cloud-meeting",
      at: "2026-10-24T00:00:00Z",
      note: "Cloud context",
      eventId: "",
    },
  ],
  createdAt: "2026-10-24T00:00:00Z",
  archived: false,
  starred: false,
  source: "manual",
};
it("merges imported guests by public identity and preserves notes and reminder ownership", () => {
  const result = mergeGuestWorkspace(
    { ...emptyWorkspace, contacts: [base] },
    {
      ...emptyWorkspace,
      contacts: [
        {
          ...base,
          id: "guest-id",
          tags: ["Solana"],
          meetings: [
            {
              id: "guest-meeting",
              at: "2026-10-25T00:00:00Z",
              note: "Guest context",
              eventId: "",
            },
          ],
        },
      ],
      reminders: [
        {
          id: "follow-up",
          contactId: "guest-id",
          title: "Send demo",
          due: "2026-11-01",
          completed: false,
          draft: "",
        },
      ],
    },
  );
  expect(result.contacts).toHaveLength(1);
  expect(result.contacts[0].tags).toEqual(["Rust", "Solana"]);
  expect(result.contacts[0].meetings.map((m) => m.note)).toEqual([
    "Cloud context",
    "Guest context",
  ]);
  expect(result.reminders[0].contactId).toBe("existing");
});
it("does not upload illustrative people during guest migration", () => {
  expect(
    mergeGuestWorkspace(emptyWorkspace, {
      ...emptyWorkspace,
      contacts: [{ ...base, sample: true }],
    }).contacts,
  ).toHaveLength(0);
});
