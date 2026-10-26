import type { Page } from "@playwright/test";
import QRCode from "qrcode";
export type ScanHarness = {
  cameraCalls: number;
  stopped: number;
  nfcCalls: number;
  nfcAborted: number;
  nextCode: string;
  emitNFC: (url: string) => void;
  releaseCamera: () => void;
};
declare global {
  interface Window {
    __scanHarness: ScanHarness;
  }
}
export async function mockScanHardware(
  page: Page,
  options: { denied?: boolean; hold?: boolean; nfc?: boolean } = {},
) {
  await page.addInitScript(({ denied, hold, nfc }) => {
    const state: ScanHarness = {
      cameraCalls: 0,
      stopped: 0,
      nfcCalls: 0,
      nfcAborted: 0,
      nextCode: "",
      emitNFC: () => {},
      releaseCamera: () => {},
    };
    window.__scanHarness = state;
    const media = {
      getTracks: () => [
        {
          stop: () => {
            state.stopped++;
          },
        },
      ],
      getVideoTracks: () => [
        {
          getCapabilities: () => ({ torch: false }),
          stop: () => {
            state.stopped++;
          },
        },
      ],
    };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        state.cameraCalls++;
        if (denied) throw new DOMException("Denied", "NotAllowedError");
        if (hold)
          await new Promise<void>((resolve) => {
            state.releaseCamera = resolve;
          });
        return media;
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return null;
      },
      set() {},
    });
    HTMLMediaElement.prototype.play = async () => {};
    Object.defineProperty(window, "BarcodeDetector", {
      configurable: true,
      value: class {
        static getSupportedFormats() {
          return Promise.resolve(["qr_code"]);
        }
        detect() {
          const value = state.nextCode;
          state.nextCode = "";
          return Promise.resolve(value ? [{ rawValue: value }] : []);
        }
      },
    });
    if (nfc)
      Object.defineProperty(window, "NDEFReader", {
        configurable: true,
        value: class {
          onreading:
            | ((event: {
                message: { records: { recordType: string; data: DataView }[] };
              }) => void)
            | null = null;
          onreadingerror: (() => void) | null = null;
          scan({ signal }: { signal: AbortSignal }) {
            state.nfcCalls++;
            signal.addEventListener("abort", () => state.nfcAborted++);
            state.emitNFC = (url) =>
              this.onreading?.({
                message: {
                  records: [
                    {
                      recordType: "url",
                      data: new DataView(new TextEncoder().encode(url).buffer),
                    },
                  ],
                },
              });
            return Promise.resolve();
          }
        },
      });
  }, options);
}
export async function uploadCode(page: Page, value: string) {
  const buffer = await QRCode.toBuffer(value, { width: 600, margin: 4 });
  await page
    .getByLabel("Upload QR image", { exact: true })
    .setInputFiles({ name: "qr.png", mimeType: "image/png", buffer });
}
