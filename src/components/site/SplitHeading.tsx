"use client";
import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { onIdle, prefersReducedMotion } from "@/lib/idle";

type Props = {
  as?: ElementType;
  id?: string;
  className?: string;
  children: ReactNode;
};

/**
 * A real heading whose lines reveal one by one when it scrolls into view.
 * The split is set up in idle time; text is fully visible until then and under reduced motion.
 */
export function SplitHeading({ as: Tag = "h2", id, className, children }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let split: SplitText | null = null;

    const cancel = onIdle(() => {
      // Already on screen? Leave it alone rather than hiding visible text.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
        autoSplit: true,
        aria: "auto",
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.09,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }),
      });
    });

    return () => {
      cancel();
      split?.revert();
    };
  }, []);

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
