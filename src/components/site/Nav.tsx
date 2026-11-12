"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { setActiveSurface, useNavTheme, type NavSurface } from "@/lib/nav-theme";
import { site } from "@/content/site";
import { useCart } from "@/lib/cart";

/**
 * Transparent over the hero frames, frosted glass tinted to the section below elsewhere.
 * Hides on scroll down, returns on scroll up or keyboard focus. Hairline shows reading progress.
 */
export function Nav() {
  const { surface, ink } = useNavTheme();
  const cart = useCart();
  const [hidden, setHidden] = useState(false);
  const bar = useRef<HTMLSpanElement>(null);

  // Which section is under the nav?
  useEffect(() => {
    const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-surface]")).map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top top+=40",
        end: "bottom top+=40",
        refreshPriority: -1, // after the hero pin has added its spacing
        onToggle: (self) => {
          if (self.isActive) setActiveSurface(el.dataset.navSurface as NavSurface);
        },
      }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, []);

  // Hide on scroll down + reading progress (one rAF-throttled listener).
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        if (Math.abs(y - lastY) > 6) {
          setHidden(y > lastY && y > 120);
          lastY = y;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const logo = ink === "dark" ? site.logo.dark : site.logo.light;

  return (
    <header
      className="nav"
      data-surface={surface}
      data-ink={ink}
      data-hidden={hidden || undefined}
      onFocus={() => setHidden(false)}
    >
      <a className="skip-link" href="#content">
        {site.skipLink}
      </a>
      <nav className="nav__inner" aria-label={site.nav.label}>
        <Link className="nav__logo" href="/" aria-label={`${site.name} — home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo.src} width={logo.width} height={logo.height} alt={site.logo.alt} />
        </Link>
        <ul className="nav__links">
          {site.nav.links.map((l) => (
            <li key={l.href}>
              {"badge" in l ? (
                <a href={l.href} className="nav__link--pill">
                  {l.label}
                  <span className="nav__badge">{l.badge}</span>
                </a>
              ) : (
                <a href={l.href}>{l.label}</a>
              )}
            </li>
          ))}
        </ul>
        {cart.length > 0 && (
          <a className="nav__cart" href={site.nav.cart.href}>
            {site.nav.cart.label}
            <span className="nav__cart-count tabular-nums">{cart.length}</span>
          </a>
        )}
        <a className="btn btn--primary nav__cta" href={site.nav.cta.href}>
          {site.nav.cta.label}
        </a>
      </nav>
      <span className="nav__progress" aria-hidden="true">
        <span ref={bar} />
      </span>
    </header>
  );
}
