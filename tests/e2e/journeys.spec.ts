import { test, expect } from "@playwright/test";
import QRCode from "qrcode";
import { mockScanHardware, uploadCode } from "./scan-helpers";
test("landing navigation, interactive steps, and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Never lose a great conference connection again.",
    }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Save the person/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Saved, with the good stuff.",
  );
  await page.getByRole("button", { name: "NFC", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A simple tap. A big possibility." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/landing-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("external contact → saved note → natural search → follow-up → complete", async ({
  page,
}) => {
  await mockScanHardware(page);
  await page.route("**/api/profiles/asha-rao", (route) =>
    route.fulfill({
      json: {
        profile: {
          id: "22222222-2222-4222-8222-222222222222",
          username: "asha-rao",
          name: "Asha Rao",
          headline: "Solana engineer",
          bio: "",
          role: "Developer",
          organization: "Rail",
          city: "Mumbai",
          avatar: "",
          tags: ["Solana"],
          lookingFor: [],
          project: "Payment Rail",
          links: [],
          public: true,
          discoverable: true,
        },
      },
    }),
  );
  await page.goto("/app/scan");
  await page
    .getByLabel("Current event", { exact: true })
    .selectOption("ibw-2026");
  await uploadCode(page, `${test.info().project.use.baseURL}/u/asha-rao`);
  await expect(
    page.getByText("CONNECTION SAVED", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "View connection", exact: true })
    .click();
  await page
    .getByLabel("Private meeting note", { exact: true })
    .fill(
      "Discussed USDC payment infrastructure and Rust engineering. Send the demo.",
    );
  await page
    .getByLabel("Meeting event", { exact: true })
    .selectOption("ibw-2026");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.goto("/app/people");
  await page
    .getByPlaceholder(/Try ‘Solana engineer’/)
    .fill("Who did I meet at IBW who builds something with USDC?");
  await expect(page.getByRole("link", { name: /Asha Rao/ })).toBeVisible();
  await page.getByRole("link", { name: /Asha Rao/ }).click();
  await expect(
    page.getByText(
      "Discussed USDC payment infrastructure and Rust engineering. Send the demo.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Private meeting note", exact: true })
    .fill("Second meeting: send the repository link.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("Second meeting: send the repository link.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Follow up", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("What’s next?")
    .fill("Send Asha the payment demo");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create follow-up", exact: true })
    .click();
  await page.goto("/app/follow-ups");
  await expect(
    page.getByRole("heading", { name: "Send Asha the payment demo" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Complete Send Asha the payment demo",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /Completed/ }).click();
  await expect(
    page.getByRole("heading", { name: "Send Asha the payment demo" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/follow-ups-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("profile onboarding, QR generation, public local preview, repeated save deduplication", async ({
  page,
}) => {
  await page.goto("/app/profile");
  await page.getByLabel("Your name").fill("Test Builder");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Founder", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await page.getByLabel("X / Twitter", { exact: true }).fill("@test_builder");
  await page.getByLabel("Business name", { exact: true }).fill("Test Rail");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Not attending an event yet", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await page
    .locator("main")
    .getByRole("button", { name: "Show my QR", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("img", { name: "Scannable profile QR code" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  const username = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("buildermatch.guest.v1")!).profile
        .username,
  );
  await page.goto(`/u/${username}`);
  await expect(
    page.getByRole("heading", { name: "Test Builder", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Local preview/)).toBeVisible();
  await page
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("A note, just for you")
    .fill("First meeting");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add another meeting", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("A note, just for you")
    .fill("Met again");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await page.goto("/app/people");
  await expect(page.locator(".contact-card")).toHaveCount(1);
  await page
    .locator("main")
    .getByRole("link", { name: /Test Builder/ })
    .click();
  await expect(page.getByText("First meeting", { exact: true })).toBeVisible();
  await expect(page.getByText("Met again", { exact: true })).toBeVisible();
});
test("QR image upload decodes a real QR and external links do not fabricate names", async ({
  page,
}) => {
  await page.goto("/app/scan");
  const png = await QRCode.toBuffer("https://example.com/real-project", {
    width: 600,
    margin: 4,
  });
  await page
    .getByLabel("Upload QR image", { exact: true })
    .setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByText("CONNECTION SAVED", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "example.com", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("buildermatch.guest.v1")!).contacts[0]
          .links[0].url,
    ),
  ).toBe("https://example.com/real-project");
});
test("project creation, persisted editing, discovery, and bookmarks", async ({
  page,
}) => {
  await page.goto("/app/projects/new");
  await page.getByLabel("Project name").fill("Open Rail");
  await page.getByLabel("In one sentence").fill("Payments for open builders.");
  await page
    .getByLabel("The story behind it")
    .fill("An actual persisted project draft.");
  await page.getByLabel(/Ecosystems & technologies/).fill("Solana, Rust");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Open Rail", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("An actual persisted project draft.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page
    .getByLabel("In one sentence")
    .fill("Updated payment infrastructure.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("Updated payment infrastructure.", { exact: true }),
  ).toBeVisible();
  await page.goto("/app/projects");
  await page
    .getByRole("button", { name: "Bookmark Open Rail", exact: true })
    .click();
  await page.getByRole("button", { name: "Bookmarked", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Open Rail", exact: true }),
  ).toBeVisible();
});
test("verified event details and NFC fallback are honest and usable", async ({
  page,
}) => {
  await page.goto("/app/events");
  await page
    .getByRole("link", { name: "Devcon 8 India", exact: false })
    .click();
  await expect(
    page.getByText("Jio World Convention Centre", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get directions", exact: true }),
  ).toHaveAttribute("href", /google.com\/maps\/dir/);
  await page.goto("/app/scan");
  await page.getByRole("button", { name: "Tap NFC", exact: true }).click();
  await expect(page.getByText(/NFC scanning isn’t available/)).toBeVisible();
  await page.getByRole("button", { name: "Scan QR", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open camera", exact: true }),
  ).toBeVisible();
});
test("guest offline saving survives reload and server APIs reject unconfigured writes", async ({
  page,
  context,
  request,
}) => {
  await mockScanHardware(page);
  await page.goto("/app/scan");
  await expect(
    page.getByText("Point at their QR. We’ll save the rest."),
  ).toBeVisible();
  await context.setOffline(true);
  await page.evaluate(() => {
    window.__scanHarness.nextCode = "https://offline.example/builder";
  });
  await expect(
    page.getByText("CONNECTION SAVED", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Offline · saved locally", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.goto("/app/people");
  await page.reload();
  await expect(
    page.getByRole("link", { name: /offline.example/ }),
  ).toBeVisible();
  const response = await request.post("/api/workspace", {
    data: {},
    headers: { Origin: "https://evil.example" },
  });
  expect(response.status()).toBe(403);
});
test("all main routes load without runtime errors or horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/app",
    "/app/people",
    "/app/discover",
    "/app/projects",
    "/app/events",
    "/app/scan",
    "/app/follow-ups",
    "/app/profile",
    "/app/settings",
    "/login",
    "/privacy",
    "/terms",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
  await page.goto("/app?demo=1");
  await expect(
    page.getByText("You’re exploring sample people and projects.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/workspace-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("CSV import, contact edits, and safe merging preserve meeting context", async ({
  page,
}) => {
  await page.goto("/app/people");
  await page.getByLabel("Import contacts", { exact: true }).setInputFiles({
    name: "contacts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "name,headline,project,url,notes\nAsha Rao,Engineer,Rail,https://example.com/asha,First conversation\nAsha R.,Founder,Rail,,Second conversation",
    ),
  });
  await expect(page.locator(".contact-card")).toHaveCount(2);
  await page.getByRole("link", { name: /Asha R\. Founder/ }).click();
  await page
    .getByRole("button", { name: "Edit contact details", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Asha Rao duplicate");
  await page
    .getByRole("button", { name: "Save contact details", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Asha Rao duplicate", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Merge with another record", exact: true })
    .click();
  const select = page.getByRole("dialog").getByLabel("Keep this connection");
  await select.selectOption({ label: "Asha Rao · Rail" });
  await page
    .getByRole("button", { name: "Merge these records", exact: true })
    .click();
  await expect(
    page.getByText("First conversation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Second conversation", { exact: true }),
  ).toBeVisible();
  await page.goto("/app/people");
  await expect(page.locator(".contact-card")).toHaveCount(1);
});
