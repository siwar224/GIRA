/** Run work when the browser is idle (falls back to a short timeout). Returns a cancel function. */
export function onIdle(cb: () => void, timeout = 800): () => void {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(cb, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(cb, 60);
  return () => globalThis.clearTimeout(id);
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
