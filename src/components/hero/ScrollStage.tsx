"use client";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { FrameLoader } from "@/lib/frame-loader";
import { frameCount, frameManifest, frameUrl } from "@/lib/frames";
import { setHeroInk } from "@/lib/nav-theme";
import { heroTimeline } from "@/content/timeline";
import { site } from "@/content/site";
import { CanvasSequence, type CanvasSequenceHandle } from "./CanvasSequence";
import { Preloader } from "./Preloader";
import { HeroFX } from "./HeroFX";

const EAGER_FRAMES = 30;
const PRELOADER_TIMEOUT_MS = 8000;

export function ScrollStage() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<CanvasSequenceHandle>(null);
  const debugEl = useRef<HTMLSpanElement>(null);
  const currentFrame = useRef(0);

  const [loader, setLoader] = useState<FrameLoader | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [canvasLive, setCanvasLive] = useState(false);
  const [debug, setDebug] = useState(false);
  /** True once the preloader starts leaving: the intro reveal plays from here. */
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("debug"));
  }, []);

  // Frames are only downloaded when motion is allowed.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: no-preference)");
    if (!mql.matches) {
      // Reduced motion: the static poster is the final (cream) frame, so the nav uses dark ink.
      setHeroInk("dark");
      return;
    }

    const l = new FrameLoader({
      count: frameCount,
      url: (i) => frameUrl(i + 1),
      eager: EAGER_FRAMES,
      stride: 8,
      onEagerProgress: (loaded, total) => {
        setProgress(loaded / total);
        if (loaded >= total) setReady(true);
      },
      onFrameLoaded: (i) => {
        // A closer frame arrived: redraw so the scrub sharpens as frames stream in.
        if (Math.abs(i - currentFrame.current) <= 8) canvas.current?.draw(currentFrame.current);
      },
    });
    setLoader(l);
    l.start();
    const timeout = window.setTimeout(() => setReady(true), PRELOADER_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timeout);
      l.destroy();
    };
  }, []);

  useGSAP(
    () => {
      if (!loader || !stage.current) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const { pxPerFrame, holdFrames, fadeFrames, lightFromFrame, beats } = heroTimeline;
        const last = frameCount - 1;
        const proxy = { frame: 0 };

        const update = () => {
          const f = Math.round(proxy.frame);
          currentFrame.current = f;
          canvas.current?.draw(f);
          const light = f + 1 >= lightFromFrame;
          setHeroInk(light ? "dark" : "light");
          section.current?.toggleAttribute("data-light", light);
          if (debugEl.current) debugEl.current.textContent = `${f + 1} / ${frameCount}`;
        };

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: stage.current,
            start: "top top",
            end: () => `+=${(last + holdFrames) * pxPerFrame}`,
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // 1 unit of time = 1 frame.
        tl.to(proxy, { frame: last, duration: last, onUpdate: update }, 0);
        tl.to({}, { duration: holdFrames }, last);
        tl.to(".hero__hint", { autoAlpha: 0, duration: 20 }, 0);

        // Text beats enter/leave at the frame numbers from content/timeline.ts (1-based).
        beats.forEach((beat, i) => {
          const el = stage.current?.querySelector<HTMLElement>(`[data-beat="${beat.id}"]`);
          if (!el) return;
          const inner = el.querySelectorAll<HTMLElement>("[data-beat-line]");
          if (i > 0) {
            const at = Math.max(0, beat.from - 1 - fadeFrames);
            tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: fadeFrames * 0.6 }, at);
            tl.fromTo(
              inner,
              { yPercent: 40, autoAlpha: 0 },
              { yPercent: 0, autoAlpha: 1, duration: fadeFrames, stagger: 2, ease: "power2.out" },
              at,
            );
          }
          tl.to(
            inner,
            { yPercent: -30, autoAlpha: 0, duration: fadeFrames, stagger: 1.5, ease: "power2.in" },
            beat.to - 1,
          );
          tl.set(el, { autoAlpha: 0 }, beat.to - 1 + fadeFrames + 3);
        });

        update();
        ScrollTrigger.refresh();
        return () => setHeroInk("light");
      });

      return () => mm.revert();
    },
    { dependencies: [loader], scope: section },
  );

  const firstFrame = frameUrl(1);
  const lastFrame = frameUrl(frameCount);

  return (
    <section
      ref={section}
      className="hero"
      aria-labelledby="hero-title"
      data-nav-surface="hero"
      data-canvas-live={canvasLive || undefined}
      style={{ "--portrait-factor": heroTimeline.portraitWidthFactor } as React.CSSProperties}
    >
      <div ref={stage} className="hero__stage">
        {/* Media layers: parallax (x/y) > zoom (intro blur + breathing scale) > poster + canvas. */}
        <div className="hero__media">
          <div className="hero__zoom">
            {/* LCP: a real image of frame 1. Under reduced motion the final frame is shown instead. */}
            <picture className="hero__poster">
              <source media="(prefers-reduced-motion: reduce)" srcSet={lastFrame} />
              { }
              <img
                src={firstFrame}
                width={frameManifest.width}
                height={frameManifest.height}
                alt=""
                fetchPriority="high"
                decoding="async"
              />
            </picture>

            <CanvasSequence
              ref={canvas}
              loader={loader}
              focal={heroTimeline.focal}
              portraitWidthFactor={heroTimeline.portraitWidthFactor}
              className="hero__canvas"
              onFirstDraw={() => setCanvasLive(true)}
            />
          </div>
        </div>
        <div className="hero__scrim" aria-hidden="true" />
        <HeroFX section={section} revealed={revealed} />

        <div className="hero__beats">
          {heroTimeline.beats.map((beat, i) => {
            const Heading = i === 0 ? "h1" : "h2";
            return (
              <div key={beat.id} className="beat" data-beat={beat.id} data-align={beat.align}>
                {beat.eyebrow && (
                  <p className="beat__eyebrow" data-beat-line>
                    {beat.eyebrow}
                  </p>
                )}
                <Heading id={i === 0 ? "hero-title" : undefined} className="beat__title" data-beat-line>
                  {beat.title}
                </Heading>
                {beat.body && (
                  <p className="beat__body" data-beat-line>
                    {beat.body}
                  </p>
                )}
                {beat.cta && (
                  <p data-beat-line>
                    <a className="btn btn--primary" href={beat.cta.href}>
                      {beat.cta.label}
                    </a>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="hero__hint" aria-hidden="true">
          <span>{site.scrollHint}</span>
        </p>
      </div>

      <Preloader progress={progress} done={ready} onExit={() => setRevealed(true)} />

      {debug && (
        <div className="debug-badge" role="status">
          frame <span ref={debugEl}>–</span>
        </div>
      )}
    </section>
  );
}
