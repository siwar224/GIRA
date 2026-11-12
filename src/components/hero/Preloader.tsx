"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { site } from "@/content/site";

type Props = { progress: number; done: boolean };

/** Full-screen loader for the first frames. Hidden entirely under reduced motion (CSS). */
export function Preloader({ progress, done }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const pct = Math.round(progress * 100);

  useGSAP(
    () => {
      if (!done || !root.current) return;
      gsap.to(root.current, {
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.inOut",
        delay: 0.15,
      });
    },
    { dependencies: [done], scope: root },
  );

  return (
    <div ref={root} className="preloader" data-done={done || undefined}>
      <div className="preloader__inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
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
