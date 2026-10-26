import { beforeEach, describe, expect, it, vi } from "vitest";

const eq = vi.fn(async () => ({ error: null }));
const update = vi.fn(() => ({ eq }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: () => ({ update }) }),
}));
const { GET, POST } = await import("@/app/api/email/unsubscribe/route");
const { unsubscribeUrl } = await import("@/lib/email/unsubscribe");

const user = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  update.mockClear();
  eq.mockClear();
});

describe("Connection email unsubscribe", () => {
  it("asks before changing anything, so mail scanners cannot unsubscribe people", async () => {
    const response = await GET(new Request(unsubscribeUrl(user)));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('method="post"');
    expect(update).not.toHaveBeenCalled();
  });
  it("turns emails off from a one-click POST with the signed link", async () => {
    const response = await POST(
      new Request(unsubscribeUrl(user), {
        method: "POST",
        body: new URLSearchParams({ "List-Unsubscribe": "One-Click" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ connection_emails: false });
    expect(eq).toHaveBeenCalledWith("id", user);
  });
  it("turns emails back on from the confirmation form", async () => {
    const link = new URL(unsubscribeUrl(user));
    const response = await POST(
      new Request(link.origin + link.pathname, {
        method: "POST",
        body: new URLSearchParams({
          u: user,
          t: link.searchParams.get("t")!,
          action: "resubscribe",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ connection_emails: true });
  });
  it("rejects forged, tampered or unsigned requests without touching data", async () => {
    const forged = new URL(unsubscribeUrl(user));
    forged.searchParams.set("u", "11111111-1111-4111-8111-111111111111");
    for (const request of [
      new Request(forged, { method: "POST" }),
      new Request("https://connectirl.xyz/api/email/unsubscribe", {
        method: "POST",
      }),
    ])
      expect((await POST(request)).status).toBe(400);
    expect((await GET(new Request(forged))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
