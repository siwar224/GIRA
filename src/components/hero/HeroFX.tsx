"use client";
import { useEffect, useRef, type RefObject } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { heroTimeline } from "@/content/timeline";

type Props = {
  /** The hero <section>: effects run only while it is on screen. */
  section: RefObject<HTMLElement | null>;
  /** Flips to true when the preloader starts leaving. */
  revealed: boolean;
};

const MOTION = "(prefers-reduced-motion: no-preference)";
const FINE_POINTER = "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)";

/**
 * Living hero: intro reveal, breathing zoom, mouse parallax, drifting particles,
 * light sweep and a badge that spins faster with scroll velocity.
 * Everything pauses once the hero scrolls away and none of it exists under reduced motion.
 */
export function HeroFX({ section, revealed }: Props) {
  const particles = useRef<HTMLCanvasElement>(null);
  const particlesActive = useRef(false);
  const { fx } = heroTimeline;

  // Before the reveal: hide the first beat behind the preloader so the intro can play it in.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      const root = section.current;
      if (!root) return;
      gsap.set(root.querySelectorAll(".beat:first-child [data-beat-line]:not(h1), .hero__hint > span"), {
        autoAlpha: 0,
        y: 18,
      });
      gsap.set(root.querySelector(".beat:first-child h1"), { autoAlpha: 0 });
    });
    return () => mm.revert();
  });

  // Intro + ambient loops (start when the preloader leaves).
  useGSAP(
    () => {
      if (!revealed) return;
      const root = section.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION, () => {
        const zoom = root.querySelector<HTMLElement>(".hero__zoom");
        const h1 = root.querySelector<HTMLElement>(".beat:first-child h1");
        const lines = root.querySelectorAll(".beat:first-child [data-beat-line]:not(h1)");
        const loops: gsap.core.Animation[] = [];

        // 1 · Intro: blur → sharp, then the headline line by line, then the supporting copy.
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro.fromTo(
          zoom,
          { scale: 1.08, filter: "blur(14px)" },
          { scale: 1, filter: "blur(0px)", duration: 1.6, ease: "power2.out", clearProps: "filter" },
          0,
        );
        let split: SplitText | null = null;
        if (h1) {
          gsap.set(h1, { autoAlpha: 1 });
          split = SplitText.create(h1, { type: "lines", mask: "lines", aria: "auto" });
          intro.from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.12 }, 0.45);
        }
        intro.to(lines, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.75);
        intro.to(".hero__hint > span", { autoAlpha: 1, y: 0, duration: 0.8 }, 1.2);

        // 2 · Breathing zoom, picks up where the intro leaves off.
        const breathe = gsap.to(zoom, {
          scale: fx.breathe,
          duration: 7,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          paused: true,
        });
        intro.call(() => void breathe.play(), undefined, 1.6);

        // 3 · Light sweep: a soft diagonal band passing every few seconds.
        loops.push(
          gsap.fromTo(
            ".hero__sweep",
            { xPercent: -120 },
            { xPercent: 120, duration: 3.2, ease: "power1.inOut", repeat: -1, repeatDelay: 5.5, delay: 2 },
          ),
        );

        // 4 · Rotating badge: constant turn, sped up by scroll velocity, eased back to rest.
        const badge = gsap.to(".hero__badge-ring", { rotation: 360, duration: fx.badgeTurn, ease: "none", repeat: -1 });
        loops.push(badge);
        gsap.from(".hero__badge", { autoAlpha: 0, scale: 0.8, duration: 1, ease: "back.out(1.6)", delay: 1.3 });

        // Pause everything when the hero is off screen; drive the badge from scroll velocity.
        let visible = true;
        const setVisible = (v: boolean) => {
          visible = v;
          particlesActive.current = v;
          loops.forEach((a) => (v ? a.resume() : a.pause()));
          // The breathing zoom only runs once the intro has finished with the same element.
          const target = intro.progress() === 1 ? breathe : intro;
          if (v) target.resume();
          else target.pause();
        };
        const st = ScrollTrigger.create({
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => setVisible(self.isActive),
          onUpdate: (self) => {
            if (!visible) return;
            const v = Math.abs(self.getVelocity());
            const boost = 1 + Math.min(v / 250, 9);
            gsap.to(badge, { timeScale: boost, duration: 0.25, overwrite: true });
            gsap.to(badge, { timeScale: 1, duration: 1.4, delay: 0.25, ease: "power2.out" });
          },
        });
        particlesActive.current = true;

        return () => {
          st.kill();
          breathe.kill();
          split?.revert();
          particlesActive.current = false;
        };
      });

      // 5 · Mouse parallax (fine pointers only): image and text drift in opposite directions.
      mm.add(FINE_POINTER, () => {
        const media = root.querySelector(".hero__media");
        const beats = root.querySelector(".hero__beats");
        const mx = gsap.quickTo(media, "x", { duration: 1.2, ease: "power3.out" });
        const my = gsap.quickTo(media, "y", { duration: 1.2, ease: "power3.out" });
        const tx = gsap.quickTo(beats, "x", { duration: 1.4, ease: "power3.out" });
        const ty = gsap.quickTo(beats, "y", { duration: 1.4, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          if (!particlesActive.current) return;
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          mx(-nx * fx.parallax.media);
          my(-ny * fx.parallax.media);
          tx(nx * fx.parallax.text);
          ty(ny * fx.parallax.text);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
      });

      return () => mm.revert();
    },
    { dependencies: [revealed] },
  );

  // 6 · Particles: ~50 specks of flour and saffron, on a 30 fps-capped canvas.
  useEffect(() => {
    if (!revealed) return;
    const canvas = particles.current;
    if (!canvas || !window.matchMedia(MOTION).matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colours = ["244, 232, 212", "228, 165, 58", "250, 233, 209"];
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const dots = Array.from({ length: fx.particles }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.8,
      vy: 0.006 + Math.random() * 0.018, // fraction of height per second, drifting up
      phase: Math.random() * Math.PI * 2,
      sway: 6 + Math.random() * 18,
      a: 0.15 + Math.random() * 0.45,
      c: colours[Math.floor(Math.random() * colours.length)]!,
    }));

    let raf = 0;
    let last = 0;
    let t = 0;
    const FRAME = 1000 / 30;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!particlesActive.current || document.hidden) {
        last = now;
        return;
      }
      if (now - last < FRAME) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.y -= d.vy * dt;
        if (d.y < -0.02) {
          d.y = 1.02;
          d.x = Math.random();
        }
        const x = d.x * w + Math.sin(t * 0.6 + d.phase) * d.sway;
        const y = d.y * h;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.c}, ${d.a * (0.6 + 0.4 * Math.sin(t + d.phase))})`;
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(loop);
    gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 2, delay: 0.8 });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [revealed, fx.particles]);

  return (
    <>
      <canvas ref={particles} className="hero__particles" aria-hidden="true" />
      <div className="hero__sweep" aria-hidden="true" />
      <div className="hero__badge" aria-hidden="true">
        <svg className="hero__badge-ring" viewBox="0 0 200 200">
          <defs>
            <path id="hero-badge-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
          </defs>
          <text>
            <textPath href="#hero-badge-circle" textLength="488" lengthAdjust="spacing">
              {fx.badgeText}
            </textPath>
          </text>
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/gira-icone-creme.png" width={960} height={960} alt="" className="hero__badge-icon" />
      </div>
    </>
  );
}
