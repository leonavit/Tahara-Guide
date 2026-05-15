import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/pwa/bloom-icon.svg"));

const outputs = [
  { path: "public/pwa/icon.svg", copy: true },
  { path: "public/pwa/apple-touch-icon.png", size: 180 },
  { path: "public/pwa/icon-192.png", size: 192 },
  { path: "public/pwa/icon-512.png", size: 512 },
  { path: "public/favicon.ico", size: 32 },
];

for (const output of outputs) {
  if (output.copy) {
    continue;
  }

  await sharp(svg).resize(output.size, output.size).png().toFile(join(root, output.path));
  console.log(`Wrote ${output.path}`);
}

await sharp(svg).resize(32, 32).png().toFile(join(root, "public/pwa/favicon-32.png"));
console.log("Wrote public/pwa/favicon-32.png");
