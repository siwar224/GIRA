"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { site } from "@/content/site";

type Props = {
  progress: number;
  done: boolean;
  /** Called the moment the exit starts (the hero intro plays alongside the logo flight). */
  onExit?: () => void;
};

/**
 * Full-screen loader for the first frames. Hidden entirely under reduced motion (CSS).
 * Exit = FLIP: the wordmark flies from the centre into the nav logo's exact box, then hands over.
 */
export function Preloader({ progress, done, onExit }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLImageElement>(null);
  const pct = Math.round(progress * 100);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useGSAP(
    () => {
      if (!done || !root.current || !logo.current) return;
      const html = document.documentElement;
      const finish = () => {
        html.dataset.loaded = "";
      };

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const navLogo = document.querySelector<HTMLElement>(".nav__logo img");
        const from = logo.current!.getBoundingClientRect();
        const to = navLogo?.getBoundingClientRect();

        const tl = gsap.timeline({
          delay: 0.15,
          onStart: () => onExitRef.current?.(),
          onComplete: () => {
            finish();
            gsap.set(root.current, { autoAlpha: 0 });
          },
        });

        tl.to(".preloader__bar, .preloader__label", { autoAlpha: 0, y: 8, duration: 0.35, ease: "power2.in" });

        if (to && to.width > 0) {
          // FLIP: invert the difference between the two boxes, then play it.
          gsap.set(logo.current, { transformOrigin: "0 0" });
          tl.to(
            logo.current,
            {
              x: to.left - from.left,
              y: to.top - from.top,
              scale: to.width / from.width,
              duration: 1.1,
              ease: "expo.inOut",
            },
            0.2,
          );
        } else {
          tl.to(logo.current, { autoAlpha: 0, duration: 0.5 }, 0.2);
        }
        // The red curtain thins out while the logo travels, revealing the hero underneath.
        tl.to(root.current, { backgroundColor: "rgba(129, 33, 22, 0)", duration: 0.9, ease: "power2.inOut" }, 0.35);
      });

      // Reduced motion (or no matchMedia match): just hand over.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        finish();
        onExitRef.current?.();
      });

      return () => {
        mm.revert();
        finish();
      };
    },
    { dependencies: [done], scope: root },
  );

  return (
    <div ref={root} className="preloader" data-done={done || undefined}>
      <div className="preloader__inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={logo}
          src={site.logo.light.src}
          width={site.logo.light.width}
          height={site.logo.light.height}
          alt=""
          className="preloader__logo"
        />
        <div
          className="preloader__bar"
          role="progressbar"
          aria-label={site.preloader.label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="preloader__label" aria-hidden="true">
          {site.preloader.label} · <span className="tabular-nums">{pct}%</span>
        </p>
      </div>
    </div>
  );
}
