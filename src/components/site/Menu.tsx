"use client";
import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { menu, type MenuCategory, type MenuItem } from "@/content/sections";
import { SplitHeading } from "./SplitHeading";

const price = new Intl.NumberFormat("en-GB", { style: "currency", currency: menu.currency, maximumFractionDigits: 0 });

/**
 * Tabs (WAI-ARIA pattern, arrow keys) → dish list.
 * Fine pointers: hovering/focusing a dish shows its photo in a side preview.
 * Every pointer: clicking/tapping a dish expands it with the photo inline.
 */
export function Menu() {
  const [tab, setTab] = useState(0);
  const [preview, setPreview] = useState<MenuItem | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const categories: readonly MenuCategory[] = menu.categories;
  const active = categories[tab] ?? categories[0]!;
  const shown = preview ?? active.items.find((i) => i.image) ?? null;

  const select = (i: number) => {
    setTab(i);
    setPreview(null);
    setOpen(null);
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const n = categories.length;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (tab + 1) % n;
    if (e.key === "ArrowLeft") next = (tab - 1 + n) % n;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    select(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id={menu.id} className="menu" data-nav-surface="rosso" aria-labelledby="menu-title">
      <div className="menu__head">
        <p className="eyebrow menu__eyebrow">{menu.eyebrow}</p>
        <SplitHeading id="menu-title" className="section-title">
          {menu.title}
        </SplitHeading>
        <p className="menu__note">{menu.note}</p>
        <div className="menu__crea">
          <div>
            <p className="menu__crea-title">{menu.crea.title}</p>
            <p className="menu__crea-text">{menu.crea.text}</p>
          </div>
          <a className="btn btn--primary" href={menu.crea.href}>
            {menu.crea.label} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="menu__tabs" role="tablist" aria-label={menu.eyebrow}>
        {categories.map((c, i) => (
          <button
            key={c.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`${base}-tab-${c.id}`}
            role="tab"
            type="button"
            aria-selected={i === tab}
            aria-controls={`${base}-panel`}
            tabIndex={i === tab ? 0 : -1}
            className="menu__tab"
            onClick={() => select(i)}
            onKeyDown={onTabKey}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="menu__body">
        <div
          id={`${base}-panel`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${active.id}`}
          className="menu__panel"
          tabIndex={0}
        >
          <p className="menu__intro">{active.intro}</p>
          <ul className="menu__list">
            {active.items.map((item) => {
              const key = `${active.id}-${item.name}`;
              const isOpen = open === key;
              const detailId = `${base}-${key.replace(/\W+/g, "-")}`;
              const img = item.image ?? menu.fallbackImage;
              return (
                <li
                  key={key}
                  className="menu__item"
                  data-open={isOpen || undefined}
                  onMouseEnter={() => item.image && setPreview(item)}
                >
                  <button
                    type="button"
                    className="menu__item-btn"
                    aria-expanded={isOpen}
                    aria-controls={detailId}
                    onClick={() => setOpen(isOpen ? null : key)}
                    onFocus={() => item.image && setPreview(item)}
                  >
                    <span className="menu__item-name">
                      {item.name}
                      {item.tags?.map((t) => (
                        <span key={t} className="menu__tag">
                          {t}
                        </span>
                      ))}
                    </span>
                    <span className="menu__item-leader" aria-hidden="true" />
                    <span className="menu__item-price tabular-nums">{price.format(Number(item.price))}</span>
                    <span className="menu__item-desc">{item.description}</span>
                  </button>
                  <div id={detailId} className="menu__detail" hidden={!isOpen}>
                    <div className="menu__detail-media">
                      <Image
                        src={img.src}
                        alt={img.alt}
                        width={img.width}
                        height={img.height}
                        sizes="(min-width: 768px) 26rem, 90vw"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Hover preview (fine pointers only, hidden from assistive tech: the list already says it all). */}
        <div className="menu__preview" aria-hidden="true">
          {shown?.image && (
            <Image
              key={shown.image.src}
              src={shown.image.src}
              alt=""
              width={shown.image.width}
              height={shown.image.height}
              sizes="(min-width: 1024px) 32rem, 40vw"
              className="menu__preview-img"
            />
          )}
        </div>
      </div>
    </section>
  );
}
