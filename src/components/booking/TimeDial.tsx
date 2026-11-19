"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { booking } from "@/content/booking";
import type { SlotStatus } from "@/lib/booking";

type Slot = { time: string; status: SlotStatus };
type Props = {
  slots: Slot[];
  value: string | null;
  onChange: (time: string) => void;
  label: string;
  /** Availability is still loading (or failed): times are shown but can't be chosen yet. */
  busy?: boolean;
};

/** Degrees between two neighbouring times on the ring. */
const STEP = 34;

/**
 * "Gira": times sit on a ring around the GIRA spiral. The ring turns so the chosen time sits
 * under the saffron marker at the top. Drag to turn it (it snaps to the nearest open time),
 * scroll, use the arrow keys, or tap a time. Full times are shown but can't be chosen.
 */
export function TimeDial({ slots, value, onChange: choose, label, busy = false }: Props) {
  const onChange = (time: string) => {
    if (!busy) choose(time);
  };
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, slots.findIndex((s) => s.time === value));
  const [drag, setDrag] = useState<{ startAngle: number; startRot: number } | null>(null);
  const [rot, setRot] = useState(-index * STEP);

  // Follow the selection (and new slot lists) when not dragging.
  useEffect(() => {
    if (!drag) setRot(-index * STEP);
  }, [index, drag, slots.length]);

  const open = slots.map((s, i) => ({ ...s, i })).filter((s) => s.status !== "full");

  const nearestOpen = (i: number) =>
    open.reduce<(typeof open)[number] | null>((best, s) => (!best || Math.abs(s.i - i) < Math.abs(best.i - i) ? s : best), null);

  const angleAt = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return; // a tap/click on a time is handled by the button
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startAngle: angleAt(e), startRot: rot });
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    let delta = angleAt(e) - drag.startAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const min = -(slots.length - 1) * STEP - STEP / 2;
    setRot(Math.min(STEP / 2, Math.max(min, drag.startRot + delta)));
  };
  const onPointerUp = () => {
    if (!drag) return;
    const moved = Math.abs(rot - drag.startRot) > 4;
    setDrag(null);
    if (!moved) return;
    const pick = nearestOpen(Math.round(-rot / STEP));
    if (pick) onChange(pick.time);
    else setRot(-index * STEP);
  };

  const step = (dir: 1 | -1) => {
    const from = value ? index : dir > 0 ? -1 : slots.length;
    const next = dir > 0 ? open.find((s) => s.i > from) : [...open].reverse().find((s) => s.i < from);
    if (next) onChange(next.time);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    }
  };

  // Scrolling over the dial turns it (one time per notch, throttled).
  const wheelLock = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - wheelLock.current < 180) return;
      wheelLock.current = now;
      stepRef.current(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const stepRef = useRef(step);
  stepRef.current = step;

  return (
    <div className="dial-wrap" data-busy={busy || undefined}>
      <div
        ref={ref}
        className="dial"
        role="radiogroup"
        aria-label={label}
        aria-busy={busy || undefined}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-dragging={drag ? "" : undefined}
      >
        <span className="dial__marker" aria-hidden="true" />
        <svg className="dial__spiral" viewBox="-100 -100 200 200" aria-hidden="true" style={{ rotate: `${rot}deg` }}>
          <path
            d={Array.from({ length: 220 }, (_, k) => {
              const t = k / 219;
              const a = t * Math.PI * 7;
              const r = 8 + t * 54;
              return `${k ? "L" : "M"}${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
            }).join(" ")}
          />
        </svg>
        <div className="dial__logo" aria-hidden="true">
          <Image src="/brand/gira-icone-app-1024.png" alt="" width={1024} height={1024} sizes="96px" />
        </div>
        {slots.map((s, i) => {
          const angle = -90 + i * STEP + rot;
          const checked = s.time === value;
          return (
            <button
              key={s.time}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={s.status === "full" || undefined}
              tabIndex={-1}
              className="dial__slot"
              data-status={s.status}
              style={{
                transform: `rotate(${angle}deg) translate(var(--dial-r)) rotate(${-angle}deg)`,
              }}
              onClick={() => s.status !== "full" && onChange(s.time)}
            >
              {s.time}
            </button>
          );
        })}
      </div>
      <ul className="dial__legend" aria-hidden="true">
        <li data-status="available">{booking.time.legend.available}</li>
        <li data-status="almost">{booking.time.legend.almost}</li>
        <li data-status="full">{booking.time.legend.full}</li>
      </ul>
    </div>
  );
}
