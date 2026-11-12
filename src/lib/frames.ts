import manifest from "@/data/frames.json";

export const frameManifest = manifest;

/** URL for a 1-based frame number. */
export function frameUrl(n: number, set: "desktop" | "mobile" = "desktop"): string {
  return `${manifest.basePath}/${set}/f_${String(n).padStart(manifest.pad, "0")}.webp`;
}

/** Number of frames actually used by the sequence (respects lastFrame). */
export const frameCount = Math.max(1, Math.min(manifest.lastFrame, manifest.desktop.count));
