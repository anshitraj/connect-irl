import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const auth = vi.hoisted(() => ({ getUser: vi.fn(), create: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: auth.create }));
import { proxy } from "../../src/proxy";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  auth.getUser.mockResolvedValue({
    data: { user: { id: "member" } },
    error: null,
  });
  auth.create.mockImplementation((_url, _key, options) => {
    options.cookies.setAll([
      {
        name: "sb-test-auth-token",
        value: "refreshed",
        options: { path: "/", sameSite: "lax" },
      },
    ]);
    return { auth: { getUser: auth.getUser } };
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("Returning member entry", () => {
  it("redirects a verified signed-in member from the root and retains refreshed cookies", async () => {
    const response = await proxy(
      new NextRequest("https://connectirl.xyz/", {
        headers: { cookie: "sb-test-auth-token=valid" },
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://connectirl.xyz/app");
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("keeps first-time visitors on the landing page without an auth round trip", async () => {
    const response = await proxy(new NextRequest("https://connectirl.xyz/"));
    expect(response.status).toBe(200);
    expect(auth.create).not.toHaveBeenCalled();
  });
  it("does not trust a forged or expired login cookie", async () => {
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Expired" },
    });
    const response = await proxy(
      new NextRequest("https://connectirl.xyz/", {
        headers: { cookie: "sb-test-auth-token=forged" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
