import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const services = vi.hoisted(() => ({
  authorize: vi.fn(),
  company: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("../../src/lib/api-security", () => ({
  authorizeMutation: services.authorize,
}));
vi.mock("../../src/lib/company-icon", () => ({
  fetchCompanyIcon: services.company,
}));
import { POST } from "../../src/app/api/profile-lookup/route";
const userId = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown) =>
  new Request("https://connectirl.xyz/api/profile-lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://connectirl.xyz",
    },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  services.upload.mockResolvedValue({ error: null });
  services.authorize.mockResolvedValue({
    user: { id: userId },
    sb: {
      storage: {
        from: () => ({
          upload: services.upload,
          getPublicUrl: () => ({
            data: {
              publicUrl:
                "https://project.supabase.co/storage/v1/object/public/avatars/company.png",
            },
          }),
        }),
      },
    },
  });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("Authenticated profile lookup API", () => {
  it("rejects unauthenticated requests before fetching a website or storing files", async () => {
    services.authorize.mockResolvedValue({
      error: Response.json({ error: "Sign in to continue." }, { status: 401 }),
    });
    expect(
      (
        await POST(
          request({ provider: "company", website: "https://company.com" }),
        )
      ).status,
    ).toBe(401);
    expect(services.company).not.toHaveBeenCalled();
    expect(services.upload).not.toHaveBeenCalled();
  });
  it("returns an honest non-blocking configuration error when the X token is absent", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "");
    const response = await POST(request({ provider: "x", handle: "asha_dev" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("configured");
  });
  it("stores a supported company icon only in the authenticated account's image folder", async () => {
    services.company.mockResolvedValue({
      bytes: Buffer.from([1, 2, 3]),
      contentType: "image/png",
      extension: "png",
    });
    const response = await POST(
      request({ provider: "company", website: "https://company.com" }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).logo).toMatch(
      /^https:\/\/project.supabase.co/,
    );
    expect(services.upload.mock.calls[0][0]).toMatch(
      new RegExp(`^${userId}/company-[a-f0-9-]+\\.png$`),
    );
    expect(services.upload.mock.calls[0][2]).toEqual({
      contentType: "image/png",
      upsert: false,
    });
  });
});
