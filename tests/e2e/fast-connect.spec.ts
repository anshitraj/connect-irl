import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockScanHardware, uploadCode } from "./scan-helpers";
const builder = {
  id: "22222222-2222-4222-8222-222222222222",
  username: "asha-builder",
  name: "Asha Builder",
  headline: "Solana engineer",
  bio: "",
  role: "Developer",
  organization: "Rail",
  city: "Mumbai",
  avatar: "",
  tags: ["Solana"],
  lookingFor: [],
  project: "Rail",
  links: [{ label: "GitHub", url: "https://github.com/asha" }],
  public: true,
  discoverable: true,
};
test("Add connection opens the camera in one tap and saves profile/event/time without a form", async ({
  page,
}) => {
  await mockScanHardware(page);
  await page.route("**/api/profiles/asha-builder", (route) =>
    route.fulfill({ json: { profile: builder } }),
  );
  await page.goto("/app/people");
  await page
    .getByLabel("Current event", { exact: true })
    .selectOption("ibw-2026");
  const before = Date.now();
  await page.getByRole("link", { name: "Add connection", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/scan$/);
  await expect
    .poll(() => page.evaluate(() => window.__scanHarness.cameraCalls))
    .toBe(1);
  await expect(
    page.getByText("Point at their QR. We’ll save the rest."),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => {
    window.__scanHarness.nextCode = `${location.origin}/u/asha-builder`;
  });
  await expect(
    page.getByRole("heading", { name: "Asha Builder", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("CONNECTION SAVED", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Connection successful.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Scan next", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("link", { name: "View connection", exact: true }),
  ).toBeInViewport();
  await expect(page.locator(".toast.visible")).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page })
    .include(".connection-success")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".bridge-you")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".bridge-check path")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByText("Connection successful.", { exact: true }).click();
  await page.screenshot({
    path: `test-results/success-${test.info().project.name}.png`,
  });
  expect(await page.evaluate(() => window.__scanHarness.stopped)).toBe(1);
  const contacts = await page.evaluate(
    () => JSON.parse(localStorage.getItem("buildermatch.guest.v1")!).contacts,
  );
  expect(contacts).toHaveLength(1);
  expect(contacts[0].meetings[0].eventId).toBe("ibw-2026");
  expect(Date.parse(contacts[0].meetings[0].at)).toBeGreaterThanOrEqual(before);
  await page
    .getByRole("link", { name: "View connection", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/people\/[a-f0-9-]+$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Asha Builder", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".meeting-entry")).toContainText("IBW");
});
test("NFC reads and saves a shared profile with duplicate callbacks ignored", async ({
  page,
}) => {
  await mockScanHardware(page, { nfc: true });
  await page.goto("/app/scan");
  await expect(
    page.getByText("Point at their QR. We’ll save the rest."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tap NFC", exact: true }).click();
  await expect(
    page.getByText("Hold their NFC tag near your phone."),
  ).toBeVisible();
  await page.evaluate(() => {
    window.__scanHarness.emitNFC("https://example.com/nfc-builder");
    window.__scanHarness.emitNFC("https://example.com/nfc-builder");
  });
  await expect(
    page.getByText("CONNECTION SAVED", { exact: true }),
  ).toBeVisible();
  const state = await page.evaluate(() => ({
    data: JSON.parse(localStorage.getItem("buildermatch.guest.v1")!),
    hardware: window.__scanHarness,
  }));
  expect(state.data.contacts).toHaveLength(1);
  expect(state.data.contacts[0].meetings).toHaveLength(1);
  expect(state.hardware.nfcCalls).toBe(1);
  expect(state.hardware.nfcAborted).toBe(1);
  expect(state.hardware.stopped).toBe(1);
  await page.getByRole("button", { name: "Scan next", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__scanHarness.nfcCalls))
    .toBe(2);
  expect(await page.evaluate(() => window.__scanHarness.cameraCalls)).toBe(1);
});
test("denied camera and unsupported NFC keep the QR image fallback usable", async ({
  page,
}) => {
  await mockScanHardware(page, { denied: true });
  await page.goto("/app/scan");
  await expect(page.getByText(/Camera permission is off/)).toBeVisible();
  await page.getByRole("button", { name: "Tap NFC", exact: true }).click();
  await expect(page.getByText(/NFC scanning isn’t available/)).toBeVisible();
  await uploadCode(page, "https://example.com/fallback");
  await expect(
    page.getByText("CONNECTION SAVED", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "example.com", exact: true }),
  ).toBeVisible();
});
test("late camera permission after leaving the scanner is cleaned up", async ({
  page,
}) => {
  await mockScanHardware(page, { hold: true });
  await page.goto("/app/scan");
  await expect
    .poll(() => page.evaluate(() => window.__scanHarness.cameraCalls))
    .toBe(1);
  await page
    .locator(
      ".bottom-nav a[href='/app/people'], .app-sidebar a[href='/app/people']",
    )
    .filter({ visible: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "A growing collection of hellos." }),
  ).toBeVisible();
  await page.evaluate(() => window.__scanHarness.releaseCamera());
  await expect
    .poll(() => page.evaluate(() => window.__scanHarness.stopped))
    .toBe(1);
});
test("three-step setup runs once, collects socials/event, exposes top My QR and remains editable", async ({
  page,
}) => {
  await page.goto("/app/profile");
  await page.getByLabel("Your name", { exact: true }).fill("Test Builder");
  await page.getByRole("button", { name: "Founder", exact: true }).click();
  await page.getByRole("button", { name: "Developer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Business name", { exact: true }).fill("Test Rail");
  await page
    .getByLabel("GitHub", { exact: true })
    .fill("https://github.com/test-builder");
  await page
    .getByLabel("LinkedIn", { exact: true })
    .fill("https://linkedin.com/in/test-builder");
  await page.getByLabel("X / Twitter", { exact: true }).fill("@test_builder");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose India Blockchain Week", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Choose India Blockchain Week",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page
    .locator(".app-header")
    .getByRole("button", { name: "My QR", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("img", { name: "Scannable profile QR code" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/app/settings");
  await page.getByRole("link", { name: /Edit profile & links/ }).click();
  await expect(page.locator(".setup-progress")).toHaveCount(0);
  await expect(page.getByLabel("GitHub", { exact: true })).toHaveValue(
    "https://github.com/test-builder",
  );
  await page
    .getByLabel("LinkedIn", { exact: true })
    .fill("https://linkedin.com/in/changed");
  await page
    .getByRole("button", { name: "Save my profile", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("LinkedIn", { exact: true })).toHaveValue(
    "https://linkedin.com/in/changed",
  );
  await expect(page.getByLabel("Current event", { exact: true })).toHaveValue(
    "ibw-2026",
  );
});
test("Google is the first sign-in action and alternate methods stay tucked away", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with X", exact: true }),
  ).not.toBeVisible();
  await page.getByText("Other ways to sign in", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with X", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with GitHub", exact: true }),
  ).toHaveCount(0);
});
