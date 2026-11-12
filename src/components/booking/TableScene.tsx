"use client";
import Image from "next/image";
import { booking, type Meal, type OccasionId, type TableSize } from "@/content/booking";

type Props = {
  guests: number;
  size: TableSize;
  meal: Meal;
  occasion: OccasionId;
  name: string;
};

type Item = { key: string; src: string; x: number; y: number; w: number; rotate?: number; z: number; label?: string };

/**
 * "Apparecchia la tavola": the table seen from above, built in layers.
 * Table size follows the party, each guest gets a place setting facing their chair,
 * lunch and dinner cross-fade (different light, candle at dinner), the occasion adds a touch,
 * and the guest's name appears on the place card. Layers are % of the square table image.
 */
export function TableScene({ guests, size, meal, occasion, name }: Props) {
  const S = booking.scene;
  const c = S.centre;
  const items: Item[] = [];

  // Place settings, one per guest, each turned towards its chair.
  const set = S.setting[size];
  S.chairs[size].slice(0, guests).forEach((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    items.push({
      key: `setting-${size}-${i}`,
      src: S.setting.src[meal],
      x: c.x + Math.cos(rad) * set.d,
      y: c.y + Math.sin(rad) * set.d,
      w: set.w,
      rotate: deg - 90,
      z: 10,
    });
  });

  // Centrepiece for the moment, then the occasion on top.
  S.centre_props[meal].forEach((p, i) => {
    const aside = occasion !== "none" && p.src.endsWith("prop-candle.png") ? S.candleWithOccasion : null;
    items.push({
      key: `centre-${meal}-${i}`,
      src: p.src,
      x: c.x + (aside ? aside.dx : p.dx),
      y: c.y + (aside ? aside.dy : p.dy),
      w: p.w,
      z: aside ? 26 : 20,
    });
  });
  if (occasion !== "none") {
    const o = S.occasion[occasion];
    items.push({ key: `occasion-${occasion}`, src: o.src, x: c.x + o.dx, y: c.y + o.dy, w: o.w, z: 25 });
  }

  // Name card in front of the first guest (bottom chair), only once a name is typed.
  const first = name.trim().split(/\s+/)[0] ?? "";
  const cardY = c.y + set.d * 0.38;

  return (
    <div className="table-scene" data-meal={meal}>
      {(["lunch", "dinner"] as Meal[]).map((m) => (
        <Image
          key={`${size}-${m}`}
          src={S.table[size][m]}
          alt=""
          width={S.imageSize}
          height={S.imageSize}
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="table-scene__table"
          data-on={m === meal || undefined}
          priority={m === meal}
        />
      ))}

      {items.map((it) => (
        <span
          key={it.key}
          className="table-scene__item"
          style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.w}%`, zIndex: it.z }}
        >
          <Image
            src={it.src}
            alt=""
            width={800}
            height={800}
            sizes="(min-width: 1024px) 12vw, 26vw"
            style={{ rotate: it.rotate ? `${it.rotate}deg` : undefined }}
          />
        </span>
      ))}

      {first && (
        <span className="table-scene__card" style={{ left: `${c.x}%`, top: `${cardY}%`, width: `${S.namecard.w}%` }}>
          <Image src={S.namecard.src} alt="" width={800} height={800} sizes="10vw" />
          <span className="table-scene__card-name">{first}</span>
        </span>
      )}
    </div>
  );
}
