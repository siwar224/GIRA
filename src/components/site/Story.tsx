"use client";
import Image from "next/image";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { story } from "@/content/sections";
import { SplitHeading } from "./SplitHeading";

/**
 * Sticky intro column + animated counters + steps that light up at screen centre + parallax image.
 * Server-rendered with final values; motion is layered on only when allowed.
 */
export function Story() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Steps light up as they cross the middle of the screen (not motion, so always on).
      const steps = gsap.utils.toArray<HTMLElement>(".story__step");
      steps.forEach((step) =>
        ScrollTrigger.create({
          trigger: step,
          start: "top 55%",
          end: "bottom 45%",
          toggleClass: { targets: step, className: "is-active" },
        }),
      );

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Counters count up once when they come into view.
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          const state = { v: 0 };
          el.textContent = "0";
          gsap.to(state, {
            v: target,
            duration: 1.6,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = String(Math.round(state.v));
            },
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        // Parallax: the photo drifts slower than the page.
        gsap.fromTo(
          ".story__media img",
          { yPercent: -8 },
          {
            yPercent: 8,
            ease: "none",
            scrollTrigger: { trigger: ".story__media", start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id={story.id} className="story" data-nav-surface="crema" aria-labelledby="story-title">
      <div className="story__grid">
        <div className="story__sticky">
          <p className="eyebrow story__eyebrow">{story.eyebrow}</p>
          <SplitHeading id="story-title" className="section-title">
            {story.title}
          </SplitHeading>
          <p className="story__lead">{story.lead}</p>
          <dl className="story__stats">
            {story.stats.map((s) => (
              <div key={s.label} className="story__stat">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="story__stat-value tabular-nums">
                    <span data-count={s.value}>{s.value}</span>
                    {s.suffix}
                  </span>
                  <span className="story__stat-label" aria-hidden="true">
                    {s.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="story__flow">
          <div className="story__media">
            <Image
              src={story.image.src}
              width={story.image.width}
              height={story.image.height}
              alt={story.image.alt}
              sizes="(min-width: 1024px) 40vw, 90vw"
              style={{ objectPosition: story.image.focal }}
            />
          </div>
          <ol className="story__steps">
            {story.steps.map((step, i) => (
              <li key={step.title} className="story__step">
                <span className="story__step-num tabular-nums" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="story__step-title">{step.title}</h3>
                  <p className="story__step-body">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
