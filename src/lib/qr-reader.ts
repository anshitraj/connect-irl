import type { BinaryBitmap, DecodeHintType as Hint } from "@zxing/library";

export async function createQRReader() {
  const [{ BrowserCodeReader }, { QRCodeReader, DecodeHintType }] =
    await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const reader = new QRCodeReader();
  return new BrowserCodeReader(
    {
      decode(image: BinaryBitmap, hints?: Map<Hint, unknown>) {
        try {
          return reader.decode(image, hints);
        } catch {
          // Some valid, straight-on QR patterns confuse the finder-pattern pass.
          // A second, bounded pure-matrix pass handles those without network work.
          return reader.decode(
            image,
            new Map([
              ...(hints || new Map<Hint, unknown>()),
              [DecodeHintType.PURE_BARCODE, true],
            ]),
          );
        }
      },
      reset() {
        reader.reset();
      },
    },
    undefined,
    { delayBetweenScanAttempts: 120 },
  );
}
