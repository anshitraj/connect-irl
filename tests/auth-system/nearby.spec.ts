import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openLink, requestLink } from "./magic-link";

const priya = "11111111-1111-4111-8111-111111111111";
const asha = "22222222-2222-4222-8222-222222222222";
const person = (id: string, name: string, username: string) => ({
  id,
  username,
  name,
  headline: "Building useful things",
  bio: "",
  role: "Developer",
  organization: "",
  city: "",
  avatar: "",
  tags: [],
  lookingFor: [],
  project: "",
  links: [],
  public: true,
  discoverable: true,
});
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4401/_test/reset");
});
test("Nearby now shows visible people at your event and connects in one tap", async ({
  page,
}) => {
  const later = new Date(Date.now() + 2 * 3600e3).toISOString();
  let visible = false;
  // The workspace, presence and check-in APIs are fixtures here; their SQL is tested separately.
  await page.route("**/api/workspace", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          json: {
            profile: person(priya, "Priya Shah", "priya-shah"),
            contacts: [],
            projects: [],
            reminders: [],
            bookmarks: [],
            eventBookmarks: [],
            blocked: [],
            activeEventId: "devcon-8",
            eventIds: ["devcon-8"],
          },
        })
      : route.fulfill({ json: { synced: true, contactIds: {}, contacts: [] } }),
  );
  await page.route("**/api/presence?*", (route) =>
    route.fulfill({
      json: {
        builders: [
          { profile: person(priya, "Priya Shah", "priya-shah"), eventId: "devcon-8", expiresAt: later },
          { profile: person(asha, "Asha Rao", "asha-rao"), eventId: "devcon-8", expiresAt: later },
        ],
        hasMore: false,
        checkedAt: new Date().toISOString(),
      },
    }),
  );
  await page.route("**/api/checkins*", (route) => {
    if (route.request().method() === "POST") {
      visible = route.request().postDataJSON().active;
      return route.fulfill({ json: { expiresAt: later } });
    }
    return route.fulfill({ json: { expiresAt: visible ? later : "" } });
  });
  await requestLink(page, "priya@example.com");
  await openLink(page, "priya@example.com");
  await page.goto("/app/nearby");
  await expect(page.getByRole("heading", { name: "Nearby now" })).toBeVisible();
  // You never see yourself in the list.
  await expect(page.locator(".nearby-grid .contact-card")).toHaveCount(1);
  await expect(page.getByText("You’re hidden")).toBeVisible();
  await page.getByRole("switch", { name: "Show me to people nearby" }).click();
  await expect(page.getByText("You’re visible here")).toBeVisible();
  expect(visible).toBe(true);
  await page
    .locator(".nearby-grid")
    .getByRole("button", { name: "Connect", exact: true })
    .click();
  await expect(page.locator(".nearby-grid").getByText("Connected")).toBeVisible();
  const saved = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) =>
      /^buildermatch\.user\..+\.v1$/.test(key),
    )!;
    return JSON.parse(localStorage.getItem(key)!).contacts.map(
      (contact: { profileId: string; meetings: { eventId: string }[] }) => [
        contact.profileId,
        contact.meetings[0].eventId,
      ],
    );
  });
  expect(saved).toEqual([[asha, "devcon-8"]]);
  const axe = await new AxeBuilder({ page })
    .include(".nearby")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations.map((item) => item.id)).toEqual([]);
});
