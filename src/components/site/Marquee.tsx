import { marquee } from "@/content/sections";

/** CSS-only marquee. The visible copy is read once; the duplicate is hidden from assistive tech. */
export function Marquee() {
  const row = (hidden: boolean) => (
    <ul className="marquee__row" aria-hidden={hidden || undefined}>
      {marquee.items.map((item) => (
        <li key={item}>
          <span>{item}</span>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="marquee__dot">
            <path
              d="M12 12.5c.6-.6 0-1.6-.8-1.4-1.3.3-1.3 2.4 0 2.9 1.9.7 3.4-1.5 2.6-3.3-1.1-2.4-4.6-2.2-5.7.1-1.4 3 1.2 6.2 4.4 5.6 3.9-.8 4.9-5.8 2.3-8.4-3.2-3.3-9.2-1.8-10.2 2.7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="marquee" data-nav-surface="crema" aria-label={marquee.label}>
      <div className="marquee__track">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
