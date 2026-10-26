import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { CollaborationWorkspace } from "../../src/lib/collaboration";
import type { Profile, Project } from "../../src/lib/types";
const owner = "11111111-1111-4111-8111-111111111111";
const builder = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const requestId = "44444444-4444-4444-8444-444444444444";
const invitationId = "55555555-5555-4555-8555-555555555555";
const profile = (id: string, name: string): Profile => ({
  id,
  username: name.toLowerCase().replaceAll(" ", "-"),
  name,
  headline: "Solana developer",
  bio: "Building payment infrastructure.",
  role: "Developer",
  organization: "",
  city: "Mumbai",
  avatar: "",
  tags: ["Solana"],
  lookingFor: ["Collaborators"],
  project: "Payment Rail",
  links: [],
  public: true,
  discoverable: true,
});
const profiles = [
  profile(owner, "Project Owner"),
  profile(builder, "Asha Builder"),
];
const project: Project = {
  id: projectId,
  slug: "payment-rail",
  name: "Payment Rail",
  tagline: "Better payments, built together",
  description: "Payment infrastructure for builders.",
  ownerId: owner,
  public: true,
  website: "",
  repository: "",
  demo: "",
  tags: ["Solana"],
  stage: "Building",
  needs: ["Collaborators"],
};
const inbox = (viewerId: string): CollaborationWorkspace => ({
  viewerId,
  projects: [project],
  profiles,
  requests: [],
  invitations: [],
  memberships: [],
});
async function stubProject(page: Page, viewerId: string) {
  await page.route("**/api/projects/payment-rail", (r) =>
    r.fulfill({ json: { project } }),
  );
  await page.route("**/api/founders/**", (r) =>
    r.fulfill({ json: { profile: profiles[0] } }),
  );
  await page.route("**/api/projects/payment-rail/team", (r) =>
    r.fulfill({ json: { viewerId, profiles, members: [] } }),
  );
}
async function noAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
// API fixtures exercise UI transitions only. Real ownership, RLS, consent, and
// privacy are tested separately against actual PostgreSQL migrations.
test("owner reviews a request and sees team membership after acceptance", async ({
  page,
}) => {
  const state = inbox(owner);
  state.requests = [
    {
      id: requestId,
      project_id: projectId,
      sender_id: builder,
      message: "I can help build the Solana integration.",
      status: "pending",
      created_at: "2026-10-25T10:00:00Z",
    },
  ];
  const actions: unknown[] = [];
  await page.route("**/api/collaboration", async (route) => {
    if (route.request().method() === "POST") {
      const action = route.request().postDataJSON();
      actions.push(action);
      state.requests[0].status = action.body.decision;
      state.memberships.push({
        project_id: projectId,
        user_id: builder,
        role: "Collaborator",
      });
      await route.fulfill({ json: { saved: true } });
    } else await route.fulfill({ json: state });
  });
  await page.goto("/app/collaboration");
  await expect(
    page.getByText("I can help build the Solana integration."),
  ).toBeVisible();
  await noAxeViolations(page);
  await page.getByRole("button", { name: "Accept & add to team" }).click();
  await expect(page.locator(".collaboration-card")).toContainText("accepted");
  expect(actions).toEqual([
    {
      action: "respond_request",
      target: requestId,
      body: { decision: "accepted" },
    },
  ]);
  await page.getByRole("button", { name: "Teams", exact: true }).click();
  await expect(page.locator(".collaboration-team")).toContainText(
    "Payment Rail",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/collaboration-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("an invited builder accepts and can find the project in Teams", async ({
  page,
}) => {
  const state = inbox(builder);
  state.invitations = [
    {
      id: invitationId,
      project_id: projectId,
      invited_by: owner,
      invitee_id: builder,
      role: "Engineer",
      status: "pending",
      created_at: "2026-10-25T10:00:00Z",
    },
  ];
  await page.route("**/api/collaboration", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        action: "respond_invitation",
        target: invitationId,
        body: { decision: "accepted" },
      });
      state.invitations[0].status = "accepted";
      state.memberships = [
        { project_id: projectId, user_id: builder, role: "Engineer" },
      ];
      await route.fulfill({ json: { saved: true } });
    } else await route.fulfill({ json: state });
  });
  await page.goto("/app/collaboration");
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page.locator(".collaboration-card")).toContainText("accepted");
  await page.getByRole("button", { name: "Teams", exact: true }).click();
  await expect(page.locator(".collaboration-team")).toContainText("Engineer");
});
test("a collaboration request is submitted from a project and can be withdrawn", async ({
  page,
}) => {
  await stubProject(page, builder);
  const state = inbox(builder);
  await page.route("**/api/collaboration", async (route) => {
    if (route.request().method() === "POST") {
      const action = route.request().postDataJSON();
      if (action.action === "request") {
        expect(action.body.message).toBe(
          "I would love to contribute Rust engineering.",
        );
        state.requests = [
          {
            id: requestId,
            project_id: projectId,
            sender_id: builder,
            message: action.body.message,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ];
      } else {
        expect(action.action).toBe("withdraw_request");
        state.requests = [];
      }
      await route.fulfill({ json: { saved: true } });
    } else await route.fulfill({ json: state });
  });
  await page.goto("/app/projects/payment-rail");
  await page.getByRole("button", { name: "Let’s collaborate" }).click();
  await page
    .getByLabel("A little introduction")
    .fill("I would love to contribute Rust engineering.");
  await page
    .getByRole("button", { name: "Send collaboration request" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/app/collaboration");
  await page.getByRole("button", { name: "Sent", exact: true }).click();
  await page.getByRole("button", { name: "Withdraw request" }).click();
  await expect(page.getByText("Nothing sent, yet.")).toBeVisible();
});
test("an owner invites, changes a role, and removes a member with confirmation", async ({
  page,
}) => {
  await stubProject(page, owner);
  const actions: { action: string; body: Record<string, string> }[] = [];
  let members = [
    { project_id: projectId, user_id: builder, role: "Contributor" },
  ];
  await page.route("**/api/projects/payment-rail/team", (r) =>
    r.fulfill({ json: { viewerId: owner, profiles, members } }),
  );
  await page.route("**/api/collaboration", async (route) => {
    const action = route.request().postDataJSON();
    actions.push(action);
    if (action.action === "set_member_role") members[0].role = action.body.role;
    if (action.action === "remove_member") members = [];
    await route.fulfill({ json: { saved: true } });
  });
  await page.goto("/app/projects/payment-rail");
  await page.getByRole("button", { name: "Invite builder" }).click();
  await page.getByLabel("Connect IRL username").fill("next-builder");
  await page.getByLabel("Team role", { exact: true }).fill("Designer");
  await page.getByRole("button", { name: "Send team invitation" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Team role for Asha Builder").fill("Engineer");
  await page.getByRole("button", { name: "Save role" }).click();
  await expect(page.locator(".team-member .team-identity")).toContainText(
    "Engineer",
  );
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Remove this team member?",
  );
  await page
    .getByRole("button", { name: "Remove member", exact: true })
    .click();
  await expect(page.locator(".team-member")).toHaveCount(0);
  expect(actions.map((a) => a.action)).toEqual([
    "invite",
    "set_member_role",
    "remove_member",
  ]);
  expect(actions[0].body).toEqual({
    username: "next-builder",
    role: "Designer",
  });
});
test("venue discovery filters real response data, saves context, and removes expired check-ins", async ({
  page,
}) => {
  const params: URLSearchParams[] = [];
  await page.route("**/api/presence?*", (r) => {
    params.push(new URL(r.request().url()).searchParams);
    return r.fulfill({
      json: {
        builders: [
          {
            profile: profiles[1],
            eventId: "ibw-2026",
            expiresAt: new Date(Date.now() + 60000).toISOString(),
          },
        ],
        hasMore: false,
        checkedAt: new Date().toISOString(),
      },
    });
  });
  await page.goto("/app/discover");
  await page.getByRole("button", { name: "At a venue" }).click();
  await page.getByLabel("Choose a venue").selectOption("ibw-2026");
  await expect(
    page.getByRole("heading", { name: "Asha Builder" }),
  ).toBeVisible();
  await page.getByLabel("Venue ecosystem").selectOption("Solana");
  await page.getByLabel("Venue role").selectOption("Developer");
  await page
    .getByLabel("Venue collaboration goal")
    .selectOption("Collaborators");
  await page.getByLabel("Search venue builders").fill("payment");
  await expect.poll(() => params.at(-1)?.get("q")).toBe("payment");
  expect(Object.fromEntries(params.at(-1)!)).toMatchObject({
    event: "ibw-2026",
    ecosystem: "Solana",
    role: "Developer",
    goal: "Collaborators",
    page: "0",
  });
  await noAxeViolations(page);
  await page
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Where did you meet?"),
  ).toHaveValue("ibw-2026");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await page.goto("/app/people");
  await expect(page.getByRole("link", { name: /Asha Builder/ })).toBeVisible();
  // Use the browser clock to test expiry without a real-time delay.
  await page.clock.install();
  await page.route("**/api/presence?*", (r) =>
    r.fulfill({
      json: {
        builders: [
          {
            profile: profiles[1],
            eventId: "devcon-8",
            expiresAt: new Date(Date.now() + 3000).toISOString(),
          },
        ],
        hasMore: false,
        checkedAt: new Date().toISOString(),
      },
    }),
  );
  await page.goto("/app/discover");
  await page.getByRole("button", { name: "At a venue" }).click();
  await expect(
    page.getByRole("heading", { name: "Asha Builder" }),
  ).toBeVisible();
  await page.clock.fastForward(5000);
  await expect(page.getByRole("heading", { name: "Asha Builder" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Room for the next hello.")).toBeVisible();
});
test("cloud failures show honest empty states and failed changes preserve the request", async ({
  page,
  request,
}) => {
  const crossOrigin = await request.post("/api/collaboration", {
    headers: { Origin: "https://other.example" },
    data: { action: "request", target: projectId, body: { message: "test" } },
  });
  expect(crossOrigin.status()).toBe(403);
  const state = inbox(owner);
  state.requests = [
    {
      id: requestId,
      project_id: projectId,
      sender_id: builder,
      message: "A pending introduction",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ];
  await page.route("**/api/collaboration", (r) =>
    r.fulfill(
      r.request().method() === "POST"
        ? { status: 503, json: { error: "Service unavailable. Try again." } }
        : { json: state },
    ),
  );
  await page.goto("/app/collaboration");
  await page.getByRole("button", { name: "Accept & add to team" }).click();
  await expect(page.locator(".form-error[role='alert']")).toContainText(
    "Service unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Accept & add to team" }),
  ).toBeEnabled();
  await page.route("**/api/presence?*", (r) =>
    r.fulfill({
      status: 401,
      json: { error: "Sign in to see voluntary check-ins." },
    }),
  );
  await page.goto("/app/discover");
  await page.getByRole("button", { name: "At a venue" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in to see check-ins" }),
  ).toBeVisible();
  await expect(page.locator(".presence-builder")).toHaveCount(0);
});
