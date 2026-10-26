import QRCode from "qrcode";
const cache = new Map<string, Promise<string>>();
export function profileQRImage(value: string, size: number, dark = false) {
  const key = JSON.stringify([value, size, dark]);
  const existing = cache.get(key);
  if (existing) return existing;
  const image = QRCode.toDataURL(value, {
    width: size * 2,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: dark ? "#e8fff1" : "#103e2d",
      light: dark ? "#101d17" : "#ffffff",
    },
  });
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, image);
  void image.catch(() => {
    if (cache.get(key) === image) cache.delete(key);
  });
  return image;
}
