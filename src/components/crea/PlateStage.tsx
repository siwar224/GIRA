"use client";
import Image from "next/image";
import { useEffect, useState, type Ref } from "react";
import { crea } from "@/content/crea";
import type { PlacedLayer } from "@/lib/crea";

type Props = {
  plateSrc: string | null;
  plateAlt: string;
  layers: PlacedLayer[];
  /** A layer that is currently flying in: it stays invisible until it lands. */
  hiddenKey: string | null;
  dropActive: boolean;
  dragging: boolean;
  ref?: Ref<HTMLDivElement>;
};

/**
 * The plate: empty plate underneath, the pasta × sauce plate cross-fading on top,
 * then ingredient layers placed in % of the plate image so they scale with it.
 */
export function PlateStage({ plateSrc, plateAlt, layers, hiddenKey, dropActive, dragging, ref }: Props) {
  // Keep the previous plate under the new one so the cross-fade never flashes the empty plate.
  const [stack, setStack] = useState<{ prev: string | null; cur: string | null }>({ prev: null, cur: plateSrc });
  useEffect(() => {
    setStack((s) => (s.cur === plateSrc ? s : { prev: s.cur, cur: plateSrc }));
  }, [plateSrc]);

  const { width, height } = crea.plate;

  return (
    <div
      ref={ref}
      className="plate"
      data-drop={dropActive || undefined}
      data-dragging={dragging || undefined}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={crea.plate.empty}
        alt={plateSrc ? "" : crea.plate.emptyAlt}
        width={width}
        height={height}
        sizes="(min-width: 1280px) 46vw, 92vw"
        priority
        className="plate__img"
      />
      {stack.prev && stack.prev !== stack.cur && (
        <Image
          key={`prev-${stack.prev}`}
          src={stack.prev}
          alt=""
          width={width}
          height={height}
          sizes="(min-width: 1280px) 46vw, 92vw"
          className="plate__img"
        />
      )}
      {stack.cur && (
        <Image
          key={stack.cur}
          src={stack.cur}
          alt={plateAlt}
          width={width}
          height={height}
          sizes="(min-width: 1280px) 46vw, 92vw"
          className="plate__img plate__img--in"
          onAnimationEnd={() => setStack((s) => ({ ...s, prev: null }))}
        />
      )}

      {layers.map((l) => (
        <span
          key={l.key}
          data-layer={l.key}
          className={l.overlay ? "plate__layer plate__layer--overlay" : "plate__layer"}
          style={{
            left: `${l.x}%`,
            top: `${l.y}%`,
            width: `${l.w}%`,
            zIndex: l.z ?? 10,
            rotate: l.rotate ? `${l.rotate}deg` : undefined,
            opacity: l.opacity,
            visibility: hiddenKey === l.key ? "hidden" : undefined,
          }}
        >
          <Image
            src={l.src}
            alt=""
            width={l.size?.[0] ?? 600}
            height={l.size?.[1] ?? 600}
            sizes={l.overlay ? "(min-width: 1280px) 46vw, 92vw" : "(min-width: 1280px) 16vw, 34vw"}
            style={
              l.clip
                ? { clipPath: l.clip, translate: l.shift ? `${l.shift[0]}% ${l.shift[1]}%` : undefined }
                : undefined
            }
          />
        </span>
      ))}

      <span className="plate__drop" aria-hidden="true">
        {crea.plate.dropHint}
      </span>
    </div>
  );
}
