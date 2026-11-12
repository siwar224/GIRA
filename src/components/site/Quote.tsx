"use client";
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { quote } from "@/content/sections";

export function Quote() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".quote__bg img",
          { yPercent: -12 },
          {
            yPercent: 12,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="quote" data-nav-surface="sugo">
      <div className="quote__bg" aria-hidden="true">
        <Image src={quote.image.src} alt="" width={quote.image.width} height={quote.image.height} sizes="100vw" />
      </div>
      <figure className="quote__figure">
        <blockquote className="quote__text">
          <p>{quote.text}</p>
        </blockquote>
        <figcaption className="quote__author">— {quote.author}</figcaption>
      </figure>
    </section>
  );
}
