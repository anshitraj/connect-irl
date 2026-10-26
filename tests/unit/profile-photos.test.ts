import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { ClientRequest, IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
const network = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: network.lookup }));
vi.mock("node:https", () => ({ request: network.request }));
import {
  isPublicAddress,
  companyIconOrigin,
  imageForStorage,
  fetchCompanyIcon,
} from "../../src/lib/company-icon";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  network.lookup.mockReset();
  network.request.mockReset();
});
describe("Public company icons", () => {
  it("blocks local, private, metadata, multicast, mapped and special-use addresses", () => {
    for (const address of [
      "127.0.0.1",
      "0.0.0.0",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "198.18.0.1",
      "224.0.0.1",
      "::1",
      "fc00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "2001:db8::1",
      "2001:0db8::1",
      "2001::1",
      "2002:7f00:1::",
    ])
      expect(isPublicAddress(address), address).toBe(false);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });
  it("fetches icons only from a public HTTPS origin and rejects credentials or custom ports", () => {
    expect(companyIconOrigin("https://company.com/about?q=private").href).toBe(
      "https://company.com/",
    );
    for (const url of [
      "http://company.com",
      "https://localhost",
      "https://127.0.0.1",
      "https://user:password@company.com",
      "https://company.com:8443",
      "https://metadata.internal",
      "https://company.local",
    ])
      expect(() => companyIconOrigin(url)).toThrow();
  });
  it("does not upload HTML/SVG as a company image", () => {
    expect(imageForStorage(Buffer.from('<svg onload="alert(1)"/>'))).toBeNull();
    expect(
      imageForStorage(Buffer.from("<html>not an image</html>")),
    ).toBeNull();
  });
  it("rejects mixed DNS answers before any HTTPS request", async () => {
    network.lookup.mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);
    await expect(fetchCompanyIcon("https://company.com")).rejects.toThrow(
      /public address/,
    );
    expect(network.request).not.toHaveBeenCalled();
  });
  it("pins the validated IP while preserving the public TLS hostname", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhQkAAAAASUVORK5CYII=",
      "base64",
    );
    network.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    network.request.mockImplementation(
      (
        _url: URL,
        _options: RequestOptions,
        callback: (response: IncomingMessage) => void,
      ) => {
        const req = new EventEmitter() as ClientRequest;
        req.end = (() => {
          queueMicrotask(() => {
            const response = Readable.from([png]) as IncomingMessage;
            response.statusCode = 200;
            response.headers = {};
            callback(response);
          });
          return req;
        }) as ClientRequest["end"];
        req.destroy = (error) => {
          if (error) req.emit("error", error);
          return req;
        };
        return req;
      },
    );
    expect((await fetchCompanyIcon("https://company.com/about")).bytes).toEqual(
      png,
    );
    const options = network.request.mock.calls[0][1];
    const callback = vi.fn();
    options.lookup("company.com", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
    expect(options.servername).toBe("company.com");
  });
  it("extracts a PNG icon from an ICO container without accepting oversized dimensions", () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhQkAAAAASUVORK5CYII=",
      "base64",
    );
    const header = Buffer.alloc(22);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    header.writeUInt32LE(png.length, 14);
    header.writeUInt32LE(22, 18);
    expect(imageForStorage(Buffer.concat([header, png]))?.bytes).toEqual(png);
    const oversized = Buffer.from(png);
    oversized.writeUInt32BE(999999, 16);
    expect(imageForStorage(oversized)).toBeNull();
  });
});
describe("Official X photo lookup", () => {
  it("keeps the bearer credential server-side and returns only the matching public photo", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-server-only-token");
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          username: "Asha_Dev",
          profile_image_url:
            "https://pbs.twimg.com/profile_images/123/photo_normal.jpg",
        },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const { lookupXPhoto } = await import("../../src/lib/x-profile");
    const photo = await lookupXPhoto("asha_dev");
    expect(photo).toEqual({
      handle: "Asha_Dev",
      avatar: "https://pbs.twimg.com/profile_images/123/photo_normal.jpg",
    });
    expect(JSON.stringify(photo)).not.toContain("test-server-only-token");
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.x.com/2/users/by/username/asha_dev?user.fields=profile_image_url",
    );
    expect(options.headers.Authorization).toBe("Bearer test-server-only-token");
    await lookupXPhoto("ASHA_DEV");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not return an arbitrary upstream image URL", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: {
            username: "bad",
            profile_image_url: "https://127.0.0.1/private.png",
          },
        }),
      ),
    );
    const { lookupXPhoto } = await import("../../src/lib/x-profile");
    await expect(lookupXPhoto("bad")).rejects.toThrow(/photo/);
  });
  it("fails honestly when the API token is missing, without making a network request", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { lookupXPhoto } = await import("../../src/lib/x-profile");
    await expect(lookupXPhoto("asha")).rejects.toThrow(/configured/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
