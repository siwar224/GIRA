"use client";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { gsap } from "@/lib/gsap";
import { booking } from "@/content/booking";
import { allergenLabels, crea, type ExtraId, type PastaId, type RemoveId, type SeafoodId } from "@/content/crea";
import {
  allergensOf,
  detailsOf,
  fitSauce,
  formatPrice,
  initialSelection,
  layersOf,
  nameOf,
  pastaAvailable,
  plateFor,
  clampToPlate,
  placeKey,
  priceOf,
  sauceAvailable,
  selectionFromQuery,
  type Point,
  type Selection,
} from "@/lib/crea";
import { addToCart, useCart } from "@/lib/cart";
import { PlateStage } from "./PlateStage";

type Draggable = { kind: "sea"; id: SeafoodId } | { kind: "extra"; id: ExtraId };
type Drag = { item: Draggable; src: string; x: number; y: number; active: boolean; startX: number; startY: number };

const STEP_IDS = crea.steps.map((s) => s.id);
type StepId = (typeof STEP_IDS)[number];

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CreaBuilder() {
  const [sel, setSel] = useState<Selection>(initialSelection);
  const [step, setStep] = useState<StepId>("pasta");
  const [announce, setAnnounce] = useState("");
  const [warning, setWarning] = useState("");
  const [drag, setDrag] = useState<Drag | null>(null);
  const [overPlate, setOverPlate] = useState(false);
  const [flyingKey, setFlyingKey] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const plateRef = useRef<HTMLDivElement>(null);
  const addedRef = useRef<HTMLHeadingElement>(null);
  const pendingFly = useRef<{ key: string; from: DOMRect; src: string } | null>(null);
  const suppressClick = useRef(false);
  const cart = useCart();

  const price = priceOf(sel);
  const allergens = allergensOf(sel);
  const layers = useMemo(() => layersOf(sel), [sel]);
  const plateSrc = plateFor(sel.pasta, sel.sauce);
  const name = nameOf(sel);
  const pastas = crea.pastas.filter((p) => pastaAvailable(p.id));

  // ── Updates ────────────────────────────────────────────────────────
  const update = (patch: Partial<Selection>) => {
    setAdded(false);
    setSel((s) => ({ ...s, ...patch }));
  };

  const choosePasta = (id: PastaId) => {
    setAdded(false);
    setSel((s) => ({ ...s, pasta: id, sauce: fitSauce(id, s.sauce) }));
    setWarning("");
  };

  // Latest selection, readable from event handlers without stale closures.
  const selRef = useRef(sel);
  selRef.current = sel;

  /**
   * Toggle a seafood or extra. `from` = the tile it came from (for the fly-in), null when dropped.
   * Side effects stay outside React state updaters: in development React runs updaters twice,
   * which would add and then remove the ingredient.
   */
  const toggle = useCallback((item: Draggable, from: Element | null, at?: Point) => {
    const s = selRef.current;
    const key = placeKey(item);
    const placements = { ...s.placements };
    if (at) placements[key] = at;
    setAdded(false);
    if (!s.pasta) {
      setWarning(crea.summary.choosePasta);
      return;
    }
    if (item.kind === "sea") {
      const has = s.seafood.includes(item.id);
      if (!has && s.seafood.length >= crea.seafood.max) {
        setWarning(crea.seafood.maxReached);
        return;
      }
      setWarning("");
      const meta = crea.seafood.items.find((x) => x.id === item.id)!;
      if (!has && from) pendingFly.current = { key: `sea-${item.id}`, from: from.getBoundingClientRect(), src: meta.img };
      setAnnounce(`${meta.label} ${has ? crea.announce.removed : crea.announce.added}`);
      if (has) delete placements[key];
      const next = {
        ...s,
        placements,
        seafood: has ? s.seafood.filter((x) => x !== item.id) : [...s.seafood, item.id],
      };
      selRef.current = next;
      setSel(next);
      return;
    }
    const has = s.extras.includes(item.id);
    const meta = crea.extras.items.find((x) => x.id === item.id)!;
    if (!has && from) pendingFly.current = { key: item.id, from: from.getBoundingClientRect(), src: meta.img };
    setAnnounce(`${meta.label} ${has ? crea.announce.removed : crea.announce.added}`);
    if (has) delete placements[key];
    const next = { ...s, placements, extras: has ? s.extras.filter((x) => x !== item.id) : [...s.extras, item.id] };
    selRef.current = next;
    setSel(next);
  }, []);

  const toggleRemove = (id: RemoveId) =>
    update({ remove: sel.remove.includes(id) ? sel.remove.filter((x) => x !== id) : [...sel.remove, id] });

  // ── Fly-in: a copy of the tile image arcs onto its spot on the plate ──
  useLayoutEffect(() => {
    const fly = pendingFly.current;
    pendingFly.current = null;
    if (!fly || reduced() || document.hidden) return;
    const target = plateRef.current?.querySelector<HTMLElement>(`[data-layer="${fly.key}"]`);
    if (!target) return;
    const to = target.getBoundingClientRect();
    const ghost = document.createElement("img");
    ghost.src = fly.src;
    ghost.alt = "";
    ghost.className = "crea-ghost";
    Object.assign(ghost.style, {
      left: `${fly.from.left}px`,
      top: `${fly.from.top}px`,
      width: `${fly.from.width}px`,
      height: `${fly.from.height}px`,
    });
    // A single-piece layer (e.g. one prawn) flies as that piece, not the whole cut-out.
    const targetImg = target.querySelector("img");
    if (targetImg?.style.clipPath) {
      ghost.style.clipPath = targetImg.style.clipPath;
      ghost.style.translate = targetImg.style.translate;
    }
    document.body.appendChild(ghost);
    setFlyingKey(fly.key);

    const dx = to.left + to.width / 2 - (fly.from.left + fly.from.width / 2);
    const dy = to.top + to.height / 2 - (fly.from.top + fly.from.height / 2);
    const scale = to.width / fly.from.width;
    const tl = gsap.timeline({
      onComplete: () => {
        ghost.remove();
        setFlyingKey(null);
        gsap.fromTo(target, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" });
      },
    });
    tl.to(ghost, { x: dx, duration: 0.6, ease: "power1.inOut" }, 0)
      .to(ghost, { y: dy - Math.min(140, Math.abs(dx) * 0.35 + 60), duration: 0.3, ease: "power2.out" }, 0)
      .to(ghost, { y: dy, duration: 0.3, ease: "power2.in" }, 0.3)
      .to(ghost, { scale, rotate: 8, duration: 0.6, ease: "power1.inOut" }, 0);
    return () => {
      tl.kill();
      ghost.remove();
    };
  }, [sel]);

  // ── Drag & drop (mouse / pen). Touch and keyboard use tap / Enter. ──
  // The live drag lives in a ref (read by the window listeners); state only drives rendering.
  const dragRef = useRef<Drag | null>(null);

  const onTilePointerDown = (e: ReactPointerEvent<HTMLButtonElement>, item: Draggable, src: string) => {
    if (e.pointerType === "touch" || e.button !== 0 || !sel.pasta) return;
    e.preventDefault(); // no text selection / native image drag while dragging
    const d = { item, src, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, active: false };
    dragRef.current = d;
    setDrag(d);
  };

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const overPlateAt = (x: number, y: number) => {
      const r = plateRef.current?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6;
      const next = { ...d, x: e.clientX, y: e.clientY, active };
      dragRef.current = next;
      setDrag(next);
      setOverPlate(active && overPlateAt(e.clientX, e.clientY));
    };
    const end = (e: PointerEvent, dropped: boolean) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setOverPlate(false);
      if (!d?.active) return; // a plain click: the button's onClick handles it
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      if (!dropped || !overPlateAt(e.clientX, e.clientY)) return;
      // Where on the plate, in % of the plate image (the same units as the layers).
      const r = plateRef.current!.getBoundingClientRect();
      const at = clampToPlate({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      });
      const s = selRef.current;
      const already = d.item.kind === "sea" ? s.seafood.includes(d.item.id) : s.extras.includes(d.item.id);
      if (!already) {
        toggle(d.item, null, at);
        return;
      }
      // Already on the plate: move it to the new spot.
      const next = { ...s, placements: { ...s.placements, [placeKey(d.item)]: at } };
      selRef.current = next;
      setSel(next);
      setAdded(false);
    };
    const up = (e: PointerEvent) => end(e, true);
    const cancel = (e: PointerEvent) => end(e, false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [dragging, toggle]);

  const onTileClick = (e: React.MouseEvent<HTMLButtonElement>, item: Draggable) => {
    if (suppressClick.current) return;
    toggle(item, e.currentTarget.querySelector("img"));
  };

  // ── Steps (one at a time below 1280px; all visible on wide screens) ──
  const stepIndex = STEP_IDS.indexOf(step);
  const goStep = (id: StepId) => {
    setStep(id);
    document.getElementById(`crea-step-${id}`)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "nearest" });
  };

  const onAdd = () => {
    if (!sel.pasta) {
      setWarning(crea.summary.choosePasta);
      goStep("pasta");
      return;
    }
    addToCart({
      kind: "crea",
      name: `${crea.summary.yourPlate}: ${name}`,
      details: detailsOf(sel),
      allergens: allergens.map((a) => allergenLabels[a]),
      price,
      selection: sel,
    });
    setAdded(true);
    setAnnounce(crea.summary.added);
  };

  useEffect(() => {
    if (added) addedRef.current?.focus();
  }, [added]);

  const startOver = () => {
    setSel(initialSelection);
    setAdded(false);
    setWarning("");
    goStep("pasta");
  };

  // Opened from a "Customise" link? Start from that plate, on the step where it gets personal.
  useEffect(() => {
    const preset = selectionFromQuery(new URLSearchParams(window.location.search));
    if (!preset) return;
    selRef.current = preset;
    setSel(preset);
    setStep(preset.seafood.length ? "tocco" : "mare");
  }, []);

  // Clear the warning on its own after a moment.
  useEffect(() => {
    if (!warning) return;
    const t = window.setTimeout(() => setWarning(""), 4000);
    return () => window.clearTimeout(t);
  }, [warning]);

  const seaCount = sel.seafood.length;

  return (
    <div className="crea" data-step={step} data-dragging={drag?.active || undefined}>
      {/* ── Header + stepper ── */}
      <header className="crea__head">
        <div>
          <p className="eyebrow crea__eyebrow">GIRA · Pasta &amp; Mare</p>
          <h1 className="crea__title">{crea.page.title}</h1>
          <p className="crea__lead">{crea.page.lead}</p>
        </div>
        <nav aria-label="Steps" className="stepper">
          <ol>
            {crea.steps.map((s, i) => {
              const done =
                (s.id === "pasta" && !!sel.pasta) ||
                (s.id === "sugo" && !!sel.pasta) ||
                (s.id === "mare" && seaCount > 0);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="stepper__btn"
                    aria-current={step === s.id ? "step" : undefined}
                    data-done={done || undefined}
                    onClick={() => goStep(s.id)}
                  >
                    <span className="stepper__num" aria-hidden="true">
                      {s.number}
                    </span>
                    <span className="stepper__label">{s.label}</span>
                  </button>
                  {i < crea.steps.length - 1 && <span className="stepper__line" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <div className="crea__grid">
        {/* ── 1 · Pasta + 2 · Sauce ── */}
        <div className="crea__col crea__col--left">
          <section id="crea-step-pasta" className="crea__section" data-active={step === "pasta" || undefined}>
            <h2 className="crea__h2">
              <span className="crea__h2-num">1</span> {crea.steps[0].title}
            </h2>
            <div className="choice-grid choice-grid--pasta" role="radiogroup" aria-label={crea.steps[0].title}>
              {pastas.map((p) => {
                const icon = p.icon ?? plateFor(p.id, "pomodoro");
                return (
                  <label key={p.id} className="choice" data-checked={sel.pasta === p.id || undefined}>
                    <input
                      type="radio"
                      name="pasta"
                      value={p.id}
                      checked={sel.pasta === p.id}
                      onChange={() => choosePasta(p.id)}
                      className="sr-only"
                    />
                    <span className="choice__media choice__media--pasta" data-crop={!p.icon || undefined}>
                      {icon && <Image src={icon} alt="" width={400} height={300} sizes="120px" />}
                    </span>
                    <span className="choice__label">{p.label}</span>
                    <span className="choice__price">{formatPrice(p.price)}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section id="crea-step-sugo" className="crea__section" data-active={step === "sugo" || undefined}>
            <h2 className="crea__h2">
              <span className="crea__h2-num">2</span> {crea.steps[1].title}
            </h2>
            <div className="choice-grid choice-grid--sauce" role="radiogroup" aria-label={crea.steps[1].title}>
              {crea.sauces.map((s) => {
                const ok = sauceAvailable(sel.pasta, s.id);
                return (
                  <label
                    key={s.id}
                    className="choice choice--row"
                    data-checked={(sel.pasta && sel.sauce === s.id) || undefined}
                    data-disabled={!ok || undefined}
                  >
                    <input
                      type="radio"
                      name="sauce"
                      value={s.id}
                      checked={sel.sauce === s.id}
                      disabled={!ok}
                      onChange={() => update({ sauce: s.id })}
                      className="sr-only"
                    />
                    <span className="choice__media choice__media--sauce">
                      <Image src={s.icon} alt="" width={400} height={400} sizes="64px" />
                    </span>
                    <span className="choice__text">
                      <span className="choice__label">{s.label}</span>
                      <span className="choice__note">{ok ? s.note : crea.unavailableSauce}</span>
                    </span>
                    <span className="choice__price">{s.price ? `+${formatPrice(s.price)}` : "—"}</span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Plate + 3 · Sea ── */}
        <div className="crea__col crea__col--center">
          <div className="crea__plate-wrap">
            <PlateStage
              ref={plateRef}
              plateSrc={plateSrc}
              plateAlt={name ? `${crea.summary.yourPlate}: ${name}` : crea.plate.emptyAlt}
              layers={layers}
              hiddenKey={flyingKey}
              dropActive={overPlate && !!drag?.active}
              dragging={!!drag?.active}
              priority
            />
            <p className="crea__plate-name" aria-hidden="true">
              {name ? (
                <>
                  <span>{crea.summary.yourPlate}</span> {name}
                </>
              ) : (
                <span>{crea.summary.choosePasta}</span>
              )}
            </p>
          </div>

          <section id="crea-step-mare" className="crea__section crea__tray" data-active={step === "mare" || undefined}>
            <h2 className="crea__h2">
              <span className="crea__h2-num">3</span> {crea.steps[2].title}{" "}
              <span className="crea__count">
                ({seaCount}/{crea.seafood.max})
              </span>
            </h2>
            <p className="crea__hint">{crea.plate.dragHint}</p>
            <div className="tile-row">
              {crea.seafood.items.map((it) => {
                const on = sel.seafood.includes(it.id);
                const full = !on && seaCount >= crea.seafood.max;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className="tile"
                    aria-pressed={on}
                    aria-disabled={full || !sel.pasta || undefined}
                    data-full={full || undefined}
                    onPointerDown={(e) => onTilePointerDown(e, { kind: "sea", id: it.id }, it.img)}
                    onClick={(e) => onTileClick(e, { kind: "sea", id: it.id })}
                  >
                    <Image src={it.img} alt="" width={600} height={600} sizes="96px" draggable={false} />
                    <span className="tile__label">{it.label}</span>
                    <span className="tile__price">+{formatPrice(it.price)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── 4 · Il tocco ── */}
        <div className="crea__col crea__col--right">
          <section id="crea-step-tocco" className="crea__section crea__panel" data-active={step === "tocco" || undefined}>
            <h2 className="crea__h2">
              <span className="crea__h2-num">4</span> {crea.steps[3].title}
            </h2>

            <fieldset className="opt">
              <legend className="opt__title">{crea.spice.title}</legend>
              <div className="spice">
                {crea.spice.options.map((o) => (
                  <label key={o.id} className="spice__opt" data-checked={sel.spice === o.id || undefined}>
                    <input
                      type="radio"
                      name="spice"
                      value={o.id}
                      checked={sel.spice === o.id}
                      onChange={() => update({ spice: o.id })}
                      className="sr-only"
                    />
                    <span className="spice__dot" aria-hidden="true" />
                    <span className="spice__chillies" aria-hidden="true">
                      {"🌶".repeat(o.chillies) || "·"}
                    </span>
                    <span className="spice__label">{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="opt">
              <legend className="opt__title">{crea.remove.title}</legend>
              <div className="checks">
                {crea.remove.options.map((o) => (
                  <label key={o.id} className="check">
                    <input type="checkbox" checked={sel.remove.includes(o.id)} onChange={() => toggleRemove(o.id)} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="opt">
              <legend className="opt__title">{crea.extras.title}</legend>
              <div className="tile-row tile-row--extras">
                {crea.extras.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className="tile tile--extra"
                    aria-pressed={sel.extras.includes(it.id)}
                    aria-disabled={!sel.pasta || undefined}
                    onPointerDown={(e) => onTilePointerDown(e, { kind: "extra", id: it.id }, it.img)}
                    onClick={(e) => onTileClick(e, { kind: "extra", id: it.id })}
                  >
                    <Image src={it.img} alt="" width={600} height={600} sizes="80px" draggable={false} />
                    <span className="tile__label">{it.label}</span>
                    <span className="tile__price">+{formatPrice(it.price)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="opt">
              <legend className="opt__title">{crea.cooking.title}</legend>
              <div className="segment">
                {crea.cooking.options.map((o) => (
                  <label key={o.id} className="segment__opt" data-checked={sel.cooking === o.id || undefined}>
                    <input
                      type="radio"
                      name="cooking"
                      checked={sel.cooking === o.id}
                      onChange={() => update({ cooking: o.id })}
                      className="sr-only"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="opt">
              <legend className="opt__title">{crea.portion.title}</legend>
              <div className="segment">
                {crea.portion.options.map((o) => (
                  <label key={o.id} className="segment__opt" data-checked={sel.portion === o.id || undefined}>
                    <input
                      type="radio"
                      name="portion"
                      checked={sel.portion === o.id}
                      onChange={() => update({ portion: o.id })}
                      className="sr-only"
                    />
                    {o.label}
                    {o.price ? ` (+${formatPrice(o.price)})` : ""}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="opt">
              <label htmlFor="crea-note" className="opt__title">
                {crea.note.title}
              </label>
              <textarea
                id="crea-note"
                className="note"
                rows={2}
                maxLength={crea.note.max}
                placeholder={crea.note.placeholder}
                value={sel.note}
                onChange={(e) => update({ note: e.target.value })}
                aria-describedby="crea-note-count"
              />
              <p id="crea-note-count" className="note__count tabular-nums">
                {sel.note.length}/{crea.note.max}
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile step navigation */}
      <div className="crea__stepnav">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={stepIndex === 0}
          onClick={() => goStep(STEP_IDS[stepIndex - 1] ?? "pasta")}
        >
          {crea.nav.back}
        </button>
        {stepIndex < STEP_IDS.length - 1 && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => goStep(STEP_IDS[stepIndex + 1] ?? "tocco")}
            disabled={step === "pasta" && !sel.pasta}
          >
            {crea.nav.next}
          </button>
        )}
      </div>

      {/* ── Summary bar ── */}
      <div className="crea__bar">
        {added ? (
          <div className="crea__added">
            <h2 ref={addedRef} tabIndex={-1} className="crea__added-title">
              ✓ {crea.summary.added}
            </h2>
            <p className="crea__added-body">
              {crea.summary.addedBody}{" "}
              <strong className="tabular-nums">
                {cart.length} {crea.summary.inOrder}
              </strong>
            </p>
            <div className="crea__added-actions">
              <button type="button" className="btn btn--primary" onClick={startOver}>
                {crea.summary.another}
              </button>
              <Link href={booking.manage.href} className="btn btn--ghost">
                {crea.summary.sendWithBooking}
              </Link>
              <Link href="/#menu" className="btn btn--ghost">
                {crea.page.backToMenu}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="crea__allergens">
              <span className="crea__allergens-title">⚠ {crea.summary.allergens}:</span>{" "}
              {allergens.length
                ? allergens.map((a) => allergenLabels[a]).join(", ")
                : crea.summary.noAllergens}
            </p>
            <p className="crea__total">
              <span>{crea.summary.total}</span>
              <strong className="tabular-nums">
                {!sel.pasta && <small>{crea.summary.from} </small>}
                {formatPrice(price)}
              </strong>
            </p>
            <button type="button" className="btn btn--primary crea__cta" onClick={onAdd}>
              {crea.summary.addToCart}
            </button>
          </>
        )}
      </div>

      <p className="crea__warning" role="alert">
        {warning}
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {drag?.active && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={drag.src} alt="" className="crea-drag" style={{ left: drag.x, top: drag.y }} />
      )}
    </div>
  );
}
