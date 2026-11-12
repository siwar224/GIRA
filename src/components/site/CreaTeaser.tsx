"use client";
import { useMemo, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { creaTeaser } from "@/content/sections";
import type { ExtraId, PastaId, SauceId, SeafoodId } from "@/content/crea";
import { formatPrice, initialSelection, layersOf, plateFor, priceOf, type Selection } from "@/lib/crea";
import { PlateStage } from "@/components/crea/PlateStage";
import { SplitHeading } from "./SplitHeading";

const LAST = creaTeaser.stages.length - 1;

function selectionAt(i: number): Selection {
  const s = creaTeaser.stages[Math.max(0, Math.min(LAST, i))]!;
  return {
    ...initialSelection,
    pasta: s.pasta as PastaId | null,
    sauce: s.sauce as SauceId,
    seafood: [...s.sea] as SeafoodId[],
    extras: [...s.extras] as ExtraId[],
  };
}

/**
 * "Crea il tuo" on the landing page: while the section is pinned (sticky), scrolling builds a
 * plate stage by stage — pasta, sauce, seafood, burrata — and lights up the matching step.
 * Reduced motion: the finished plate and all four steps, no pinning.
 */
export function CreaTeaser() {
  const root = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(LAST); // SSR / reduced motion: the finished plate

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        setStage(0);
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            // Spread the stages over the first 85 % of the scroll, then hold the finished plate.
            const i = Math.min(LAST, Math.floor((self.progress / 0.85) * LAST + 0.15));
            setStage((prev) => (prev === i ? prev : i));
          },
        });
        return () => {
          st.kill();
          setStage(LAST);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const sel = useMemo(() => selectionAt(stage), [stage]);
  const layers = useMemo(() => layersOf(sel), [sel]);
  const activeStep = creaTeaser.stages[stage]!.step;
  const activeIndex = creaTeaser.steps.findIndex((s) => s.id === activeStep);

  return (
    <section
      ref={root}
      id={creaTeaser.id}
      className="crea-teaser"
      data-nav-surface="crema"
      aria-labelledby="crea-teaser-title"
    >
      <div className="crea-teaser__sticky">
        <div className="crea-teaser__plate">
          <PlateStage
            plateSrc={plateFor(sel.pasta, sel.sauce)}
            plateAlt={creaTeaser.plateAlt}
            layers={layers}
            hiddenKey={null}
            dropActive={false}
            dragging={false}
            sizes="(min-width: 1024px) 48vw, 92vw"
          />
        </div>

        <div className="crea-teaser__copy">
          <p className="eyebrow crea-teaser__eyebrow">{creaTeaser.eyebrow}</p>
          <SplitHeading id="crea-teaser-title" className="section-title crea-teaser__title">
            {creaTeaser.title}
          </SplitHeading>
          <p className="crea-teaser__lead">{creaTeaser.lead}</p>

          <ol className="crea-teaser__steps">
            {creaTeaser.steps.map((s, i) => (
              <li
                key={s.id}
                className="crea-teaser__step"
                data-active={i === activeIndex || undefined}
                data-done={i < activeIndex || undefined}
              >
                <span className="crea-teaser__num" aria-hidden="true">
                  {s.number}
                </span>
                <span>
                  <span className="crea-teaser__label">{s.label}</span>
                  <span className="crea-teaser__text">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="crea-teaser__foot">
            <p className="crea-teaser__total" aria-hidden="true">
              <span>{creaTeaser.total}</span>
              <strong key={stage} className="tabular-nums">
                {!sel.pasta && <small>{creaTeaser.from} </small>}
                {formatPrice(priceOf(sel))}
              </strong>
            </p>
            <a className="btn btn--primary crea-teaser__cta" href={creaTeaser.cta.href}>
              {creaTeaser.cta.label} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
