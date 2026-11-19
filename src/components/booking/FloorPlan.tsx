"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { booking, type AreaId, type Meal } from "@/content/booking";
import { fits, type Table } from "@/lib/booking";

type Props = {
  meal: Meal;
  time: string | null;
  /** Is this table already held at the chosen time? */
  isTaken: (tableId: string) => boolean;
  /** Availability is still loading (or failed): the plan stays locked. */
  busy: boolean;
  guests: number;
  area: AreaId | null;
  value: string | null;
  /** Select a table (also sets "Where to sit" to its area). */
  onChange: (tableId: string) => void;
  /** Clear the area filter. */
  onShowAll: () => void;
};

type TableState = "free" | "taken" | "small" | "big";

/**
 * The room from above (lunch or night version) with every table placed on it in code.
 * Tables that fit the party and are free at the chosen time glow; tapping one opens its card
 * with the area photo in the same light. Counter seats are highlighted over the real stools.
 */
export function FloorPlan({ meal, time, isTaken, busy, guests, area, value, onChange, onShowAll }: Props) {
  const [focus, setFocus] = useState<string | null>(value);
  const P = booking.plan;

  const stateOf = (t: Table): TableState => {
    if (t.size < guests) return "small";
    if (!fits(t.size, guests)) return "big";
    if (time && isTaken(t.id)) return "taken";
    return "free";
  };

  const areaLabel = (id: AreaId) => booking.areas.find((a) => a.id === id)?.label ?? id;
  const freeInArea = area ? booking.tables.filter((t) => t.area === area && stateOf(t) === "free") : [];

  // Choosing an area (or a time) opens the plan on that area: its selected or first free table.
  useEffect(() => {
    if (!area) return;
    const first = booking.tables.find((t) => t.area === area && t.id === value) ?? freeInArea[0];
    setFocus(first ? first.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, time, guests]);
  useEffect(() => {
    if (value) setFocus(value);
  }, [value]);

  const shown = booking.tables.find((t) => t.id === focus) ?? null;
  const shownState = shown ? stateOf(shown) : null;
  const shownArea = shown ? booking.areas.find((a) => a.id === shown.area) : null;

  return (
    <div className="plan" data-meal={meal} data-locked={!time || busy || undefined} aria-busy={busy || undefined}>
      {area && time && !busy && (
        <div className="plan__status" role="status">
          {freeInArea.length ? (
            <p>{P.inArea(areaLabel(area), freeInArea.length)}</p>
          ) : (
            <>
              <p>{P.noneInArea(areaLabel(area), time)}</p>
              <button type="button" className="btn btn--ghost" onClick={onShowAll}>
                {P.showAll}
              </button>
            </>
          )}
        </div>
      )}

      <div className="plan__room" style={{ aspectRatio: `${P.width} / ${P.height}` }}>
        {(["lunch", "dinner"] as Meal[]).map((m) => (
          <Image
            key={m}
            src={P.image[m]}
            alt={m === meal ? "Floor plan of the restaurant: window side, main room, chef's counter and terrace." : ""}
            width={P.width}
            height={P.height}
            sizes="(min-width: 1024px) 60vw, 96vw"
            className="plan__img"
            data-on={m === meal || undefined}
          />
        ))}

        {booking.tables.map((t) => {
          const st = stateOf(t);
          const w = booking.tableWidthOnPlan[t.size];
          const reason =
            st === "taken" ? P.taken : st === "small" ? P.tooSmall : st === "big" ? P.tooBig : P.seats(t.size);
          return (
            <button
              key={t.id}
              type="button"
              className={t.counter ? "plan__table plan__table--counter" : "plan__table"}
              data-state={st}
              data-selected={value === t.id || undefined}
              data-focus={focus === t.id || undefined}
              data-dim={(area && t.area !== area) || undefined}
              style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.counter ? "11%" : `${w}%` }}
              aria-label={`${t.label}, ${reason}`}
              aria-pressed={value === t.id}
              disabled={!time || busy}
              onClick={() => {
                setFocus(t.id);
                // In the chosen area (or anywhere): select straight away. Another area: show its
                // card first, so switching "Where to sit" is always a deliberate choice.
                if (st === "free" && (!area || t.area === area)) onChange(t.id);
              }}
            >
              {!t.counter && (
                <Image
                  src={booking.scene.table[t.size][meal]}
                  alt=""
                  width={booking.scene.imageSize}
                  height={booking.scene.imageSize}
                  sizes="10vw"
                />
              )}
              <span className="plan__num" aria-hidden="true">
                {t.counter ? t.label.replace("Counter ", "C") : t.id}
              </span>
            </button>
          );
        })}

        {!time ? <p className="plan__lock">{P.pickTime}</p> : busy && <p className="plan__lock">{P.checking}</p>}
      </div>

      {shown && shownArea && (
        <div className="plan__card" aria-live="polite">
          <div className="plan__card-media">
            <Image src={shownArea.photo[meal]} alt="" width={1448} height={1086} sizes="(min-width: 1024px) 22rem, 90vw" />
          </div>
          <div className="plan__card-body">
            <p className="plan__card-title">
              {shown.label} <span>· {shownArea.label}</span>
            </p>
            <p className="plan__card-meta">
              {P.seats(shown.size)} · {shownArea.note}
            </p>
            {value === shown.id ? (
              <p className="plan__card-ok">✓ {P.selected}</p>
            ) : shownState === "free" ? (
              <>
                {area && shown.area !== area && <p className="plan__card-meta">{P.otherArea(shownArea.label)}</p>}
                <button type="button" className="btn btn--primary" onClick={() => onChange(shown.id)}>
                  {area && shown.area !== area ? P.switchAndSelect(shownArea.label) : P.select}
                </button>
              </>
            ) : (
              <p className="plan__card-no">
                {shownState === "taken" ? P.taken : shownState === "small" ? P.tooSmall : P.tooBig}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
