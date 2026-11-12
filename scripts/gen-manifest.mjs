// Counts the hero frames and writes src/data/frames.json.
// Nothing else in the app hard-codes the frame count.
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FRAME_RE = /^f_(\d{4})\.webp$/;

function count(dir) {
  try {
    return readdirSync(join(root, "public", "frames", dir)).filter((f) => FRAME_RE.test(f)).length;
  } catch {
    return 0;
  }
}

const desktop = count("desktop");
const mobile = count("mobile");

// Optional cut: set LAST_FRAME to stop the sequence early (frames after it are never requested).
const envLast = Number.parseInt(process.env.LAST_FRAME ?? "", 10);
const lastFrame = Number.isFinite(envLast) && envLast > 0 ? Math.min(envLast, desktop) : desktop;

const manifest = {
  generatedAt: new Date().toISOString(),
  basePath: "/frames",
  pattern: "f_{n}.webp",
  pad: 4,
  width: 1920,
  height: 1080,
  desktop: { count: desktop },
  mobile: { count: mobile },
  lastFrame,
};

mkdirSync(join(root, "src", "data"), { recursive: true });
writeFileSync(join(root, "src", "data", "frames.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`[frames] desktop=${desktop} mobile=${mobile} lastFrame=${lastFrame}`);
