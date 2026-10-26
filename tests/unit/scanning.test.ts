import { describe, expect, it } from "vitest";
import {
  contactForScannedLink,
  contactForScannedProfile,
  urlFromNFC,
} from "../../src/lib/scanning";
import { sampleProfiles } from "../../src/lib/samples";
import { createRequire } from "node:module";
import QRCode from "qrcode";
import {
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
} from "@zxing/library";
import { createQRReader } from "../../src/lib/qr-reader";
const bytes = (value: string) =>
  new DataView(new TextEncoder().encode(value).buffer);
describe("Fast scan identity", () => {
  it("decodes a valid QR pattern whose finder-dimension pass fails", async () => {
    const { PNG } = createRequire(import.meta.url)("pngjs") as {
      PNG: {
        sync: {
          read: (value: Buffer) => {
            width: number;
            height: number;
            data: Buffer;
          };
        };
      };
    };
    const value = "http://localhost:4000/u/asha-rao";
    const image = PNG.sync.read(
      await QRCode.toBuffer(value, { width: 600, margin: 4 }),
    );
    const pixels = new Int32Array(image.width * image.height);
    for (let i = 0; i < pixels.length; i++)
      pixels[i] =
        (image.data[i * 4] << 16) |
        (image.data[i * 4 + 1] << 8) |
        image.data[i * 4 + 2];
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(
        new RGBLuminanceSource(pixels, image.width, image.height),
      ),
    );
    expect((await createQRReader()).decodeBitmap(bitmap).getText()).toBe(value);
  });
  it("does not invent a decoded value for a blank image", async () => {
    const reader = await createQRReader();
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(
        new RGBLuminanceSource(
          new Uint8ClampedArray(160 * 160).fill(255),
          160,
          160,
        ),
      ),
    );
    expect(() => reader.decodeBitmap(bitmap)).toThrow();
  });
  it("stores the source profile URL for instant offline repeat scans", () => {
    const profile = sampleProfiles[0];
    const result = contactForScannedProfile(profile, "https://builder.example");
    expect(result.profileId).toBe(profile.id);
    expect(result.links[0]).toEqual({
      label: "Connect IRL",
      url: `https://builder.example/u/${profile.username}`,
    });
    expect(result.name).toBe(profile.name);
    expect(result.links.length).toBeLessThanOrEqual(12);
  });
  it("uses a factual hostname for external codes without inventing a name", () => {
    const result = contactForScannedLink("https://www.github.com/someone");
    expect(result.name).toBe("github.com");
    expect(result.headline).toBe("Scanned public link");
    expect(result.links[0].url).toBe("https://www.github.com/someone");
  });
  it("reads NDEF URL and plain URL text records", () => {
    expect(
      urlFromNFC([
        { recordType: "url", data: bytes("https://builder.example/u/asha") },
      ]),
    ).toBe("https://builder.example/u/asha");
    expect(
      urlFromNFC([
        {
          recordType: "text",
          encoding: "utf-8",
          data: bytes("https://example.com/builder"),
        },
      ]),
    ).toBe("https://example.com/builder");
  });
  it("rejects executable, credential-bearing, unsupported and oversized NDEF data", () => {
    for (const value of [
      "javascript:alert(1)",
      "https://secret:password@example.com",
      "hello",
    ]) {
      expect(
        urlFromNFC([{ recordType: "url", data: bytes(value) }]),
      ).toBeNull();
    }
    expect(
      urlFromNFC([{ recordType: "mime", data: bytes("https://example.com") }]),
    ).toBeNull();
    expect(
      urlFromNFC([{ recordType: "url", data: bytes("x".repeat(9000)) }]),
    ).toBeNull();
  });
});
