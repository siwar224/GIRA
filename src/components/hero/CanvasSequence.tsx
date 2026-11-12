"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { FrameLoader } from "@/lib/frame-loader";

export type CanvasSequenceHandle = {
  /** Draw the frame at this 0-based index (or the nearest loaded one). */
  draw: (index: number) => void;
};

type Props = {
  loader: FrameLoader | null;
  focal: { x: number; y: number };
  /** Portrait screens: draw the frame this many times the viewport width instead of full cover. */
  portraitWidthFactor: number;
  className?: string;
  onFirstDraw?: () => void;
  ref?: Ref<CanvasSequenceHandle>;
};

/** Background colour of a frame, sampled once from its top-left corner and cached. */
const edgeColour = new WeakMap<HTMLImageElement, string>();
let sampler: CanvasRenderingContext2D | null = null;

function sampleEdge(img: HTMLImageElement): string {
  const cached = edgeColour.get(img);
  if (cached) return cached;
  if (!sampler) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    sampler = c.getContext("2d", { willReadFrequently: true });
  }
  let colour = "#812116";
  if (sampler) {
    sampler.drawImage(img, 4, 4, 8, 8, 0, 0, 1, 1);
    const [r, g, b] = sampler.getImageData(0, 0, 1, 1).data;
    colour = `rgb(${r},${g},${b})`;
  }
  edgeColour.set(img, colour);
  return colour;
}

export function CanvasSequence({ loader, focal, portraitWidthFactor, className, onFirstDraw, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef(0);
  const drawn = useRef<HTMLImageElement | null>(null);
  const size = useRef({ w: 0, h: 0 });
  const firstDrawDone = useRef(false);
  const onFirstDrawRef = useRef(onFirstDraw);
  onFirstDrawRef.current = onFirstDraw;

  const render = (force = false) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !loader) return;
    const img = loader.nearest(current.current);
    if (!img || (!force && img === drawn.current)) return;
    drawn.current = img;

    const { w, h } = size.current;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!w || !h || !iw || !ih) return;

    const cover = Math.max(w / iw, h / ih);
    const contain = Math.min(w / iw, h / ih);
    const scale = h > w ? Math.max(contain, Math.min(cover, (w * portraitWidthFactor) / iw)) : cover;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) * focal.x;
    const dy = (h - dh) * focal.y;

    if (dw < w || dh < h) {
      ctx.fillStyle = sampleEdge(img);
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, dx, dy, dw, dh);

    if (!firstDrawDone.current) {
      firstDrawDone.current = true;
      onFirstDrawRef.current?.();
    }
  };

  useImperativeHandle(ref, () => ({
    draw: (index: number) => {
      current.current = index;
      render();
    },
  }));

  // Keep the backing store matched to CSS size × DPR (capped at 2 to save memory).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(true);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
