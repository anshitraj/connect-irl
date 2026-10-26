import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const root = dirname(require.resolve("maplibre-gl/package.json"));
await mkdir(new URL("../public/vendor/", import.meta.url), { recursive: true });
await copyFile(
  join(root, "dist/maplibre-gl-worker.mjs"),
  new URL("../public/vendor/maplibre-gl-worker.mjs", import.meta.url),
);
await copyFile(
  join(root, "LICENSE.txt"),
  new URL("../public/vendor/maplibre-LICENSE.txt", import.meta.url),
);
console.log("Prepared self-hosted MapLibre worker.");
