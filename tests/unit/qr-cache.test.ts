import { describe, expect, it, vi } from "vitest";
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test"),
  },
}));
import QRCode from "qrcode";
import { profileQRImage } from "../../src/lib/profile-qr";
describe("Instant repeat QR display", () => {
  it("shares one generation promise for the same code and options", async () => {
    const first = profileQRImage("https://connectirl.xyz/u/asha", 250);
    const second = profileQRImage("https://connectirl.xyz/u/asha", 250);
    expect(first).toBe(second);
    expect(await first).toContain("data:image/png");
    expect(QRCode.toDataURL).toHaveBeenCalledTimes(1);
  });
  it("generates a different code for a different identity", async () => {
    await profileQRImage("https://connectirl.xyz/u/priya", 250);
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      "https://connectirl.xyz/u/priya",
      expect.any(Object),
    );
  });
});
