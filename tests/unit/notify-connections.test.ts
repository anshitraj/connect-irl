import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const eq = vi.fn(async () => ({ error: null }));
const update = vi.fn(() => ({ eq }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc, from: () => ({ update }) }),
}));
const { notifyNewConnections } = await import("@/lib/email/notify-connections");

const row = {
  receiptId: "44444444-4444-4444-8444-444444444444",
  recipientId: "22222222-2222-4222-8222-222222222222",
  email: "bob@example.com",
  actor: { name: "Alice Example", username: "alice", headline: "", avatar: "" },
};
const env = { ...process.env };
beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  rpc.mockReset();
  update.mockClear();
  eq.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Connection email delivery", () => {
  it("does nothing, and never touches the database, when email is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await notifyNewConnections(row.recipientId)).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends one idempotent, unsubscribable email per claimed receipt", async () => {
    rpc.mockResolvedValue({ data: [row], error: null });
    const fetcher = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await notifyNewConnections("11111111-1111-4111-8111-111111111111"),
    ).toBe(1);
    expect(rpc).toHaveBeenCalledWith("claim_connection_emails", {
      actor: "11111111-1111-4111-8111-111111111111",
    });
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test");
    expect(headers["Idempotency-Key"]).toBe(
      `connection-receipt-${row.receiptId}`,
    );
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["bob@example.com"]);
    expect(body.from).toBe("Connect IRL <hello@connectirl.xyz>");
    expect(body.subject).toBe("Alice just connected with you on Connect IRL");
    expect(body.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    expect(body.headers["List-Unsubscribe"]).toMatch(
      /^<https:\/\/connectirl\.xyz\/api\/email\/unsubscribe\?u=22222222-/,
    );
    expect(update).not.toHaveBeenCalled();
  });
  it("releases the receipt when the provider rejects it so a later sync retries", async () => {
    rpc.mockResolvedValue({ data: [row], error: null });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    expect(
      await notifyNewConnections("11111111-1111-4111-8111-111111111111"),
    ).toBe(0);
    expect(update).toHaveBeenCalledWith({ emailed_at: null });
    expect(eq).toHaveBeenCalledWith("id", row.receiptId);
  });
  it("swallows database failures and malformed rows", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    rpc.mockResolvedValueOnce({ data: null, error: new Error("down") });
    expect(await notifyNewConnections(row.recipientId)).toBe(0);
    rpc.mockResolvedValueOnce({
      data: [{ ...row, email: "not-an-email" }],
      error: null,
    });
    expect(await notifyNewConnections(row.recipientId)).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
