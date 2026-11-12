/**
 * Loads an image sequence in priority order:
 *   1. the first `eager` frames immediately (these gate the preloader),
 *   2. every `stride`-th frame, fed in when the browser is idle,
 *   3. everything else.
 * `nearest(i)` always returns the closest loaded frame, so drawing never waits.
 */
type IdleHandle = number;

function requestIdle(cb: () => void): IdleHandle {
  return "requestIdleCallback" in window
    ? window.requestIdleCallback(cb, { timeout: 500 })
    : (globalThis.setTimeout(cb, 32) as unknown as number);
}

function cancelIdle(h: IdleHandle) {
  if ("cancelIdleCallback" in window) window.cancelIdleCallback(h);
  else globalThis.clearTimeout(h);
}

export type FrameLoaderOptions = {
  count: number;
  /** URL for a 0-based index. */
  url: (index: number) => string;
  eager?: number;
  stride?: number;
  concurrency?: number;
  onEagerProgress?: (loaded: number, total: number) => void;
  onFrameLoaded?: (index: number) => void;
};

export class FrameLoader {
  readonly images: (HTMLImageElement | null)[];
  private readonly loaded: boolean[];
  private readonly queue: number[] = [];
  private active = 0;
  private destroyed = false;
  private idle: IdleHandle | null = null;
  private eagerLoaded = 0;
  private readonly eagerTotal: number;

  constructor(private readonly opts: FrameLoaderOptions) {
    this.images = new Array<HTMLImageElement | null>(opts.count).fill(null);
    this.loaded = new Array<boolean>(opts.count).fill(false);
    this.eagerTotal = Math.min(opts.eager ?? 30, opts.count);
  }

  start() {
    const { count } = this.opts;
    const stride = this.opts.stride ?? 8;
    for (let i = 0; i < this.eagerTotal; i++) this.queue.push(i);
    this.pump();

    // Coarse pass first (every `stride`-th frame), then fill the gaps.
    const rest: number[] = [];
    for (let i = this.eagerTotal; i < count; i += stride) rest.push(i);
    for (let i = this.eagerTotal; i < count; i++) {
      if ((i - this.eagerTotal) % stride !== 0) rest.push(i);
    }

    const feed = () => {
      if (this.destroyed) return;
      // Small batches keep the network queue short and responsive.
      this.queue.push(...rest.splice(0, 12));
      this.pump();
      if (rest.length) this.idle = requestIdle(feed);
    };
    this.idle = requestIdle(feed);
  }

  nearest(i: number): HTMLImageElement | null {
    const n = this.opts.count;
    if (this.loaded[i]) return this.images[i] ?? null;
    for (let d = 1; d < n; d++) {
      const a = i - d;
      const b = i + d;
      if (a >= 0 && this.loaded[a]) return this.images[a] ?? null;
      if (b < n && this.loaded[b]) return this.images[b] ?? null;
    }
    return null;
  }

  destroy() {
    this.destroyed = true;
    if (this.idle !== null) cancelIdle(this.idle);
    this.queue.length = 0;
  }

  private pump() {
    const max = this.opts.concurrency ?? 6;
    while (this.active < max && this.queue.length > 0 && !this.destroyed) {
      const i = this.queue.shift();
      if (i === undefined || this.images[i]) continue;
      this.load(i);
    }
  }

  private load(i: number) {
    this.active++;
    const img = new Image();
    img.decoding = "async";
    this.images[i] = img;
    const done = (ok: boolean) => {
      this.active--;
      if (this.destroyed) return;
      if (ok) {
        this.loaded[i] = true;
        this.opts.onFrameLoaded?.(i);
      }
      if (i < this.eagerTotal) {
        this.eagerLoaded++;
        this.opts.onEagerProgress?.(this.eagerLoaded, this.eagerTotal);
      }
      this.pump();
    };
    img.onload = () => {
      // decode() keeps the first draw of this frame off the main thread.
      img.decode().then(
        () => done(true),
        () => done(true),
      );
    };
    img.onerror = () => done(false);
    img.src = this.opts.url(i);
  }
}
