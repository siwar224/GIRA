import {
  allergenLabels,
  crea,
  type AllergenId,
  type CookingId,
  type ExtraId,
  type Layer,
  type PastaId,
  type PortionId,
  type RemoveId,
  type SauceId,
  type SeafoodId,
  type SpiceId,
} from "@/content/crea";

export type Selection = {
  pasta: PastaId | null;
  sauce: SauceId;
  seafood: SeafoodId[]; // in the order they were added (decides their slot on the plate)
  spice: SpiceId;
  remove: RemoveId[];
  extras: ExtraId[];
  cooking: CookingId;
  portion: PortionId;
  note: string;
  /**
   * Where the user dropped an ingredient on the plate (% of the plate image), keyed by
   * placeKey(). Without an entry, the ingredient uses its default spot.
   */
  placements: Partial<Record<string, Point>>;
};

export type Point = { x: number; y: number };

/** Key used for placements and plate layers: "sea-prawns", "burrata", … */
export const placeKey = (item: { kind: "sea" | "extra"; id: string }) =>
  item.kind === "sea" ? `sea-${item.id}` : item.id;

/** Keep a dropped point on the plate (the rim and the bread corner are fine, the table is not). */
export const clampToPlate = (p: Point): Point => ({
  x: Math.min(88, Math.max(12, p.x)),
  y: Math.min(86, Math.max(14, p.y)),
});

export const initialSelection: Selection = {
  pasta: null,
  sauce: "pomodoro",
  seafood: [],
  spice: "medio",
  remove: [],
  extras: [],
  cooking: "aldente",
  portion: "normale",
  note: "",
  placements: {},
};

export const plateFor = (pasta: PastaId | null, sauce: SauceId): string | null =>
  pasta ? (crea.plates[`${pasta}-${sauce}`] ?? null) : null;

/** A pasta is offered only when at least one of its plates exists. */
export const pastaAvailable = (pasta: PastaId) => crea.sauces.some((s) => plateFor(pasta, s.id));

export const sauceAvailable = (pasta: PastaId | null, sauce: SauceId) => !pasta || plateFor(pasta, sauce) !== null;

/** First sauce that works with a pasta (keeps the current one when possible). */
export function fitSauce(pasta: PastaId, current: SauceId): SauceId {
  if (sauceAvailable(pasta, current)) return current;
  return crea.sauces.find((s) => sauceAvailable(pasta, s.id))?.id ?? current;
}

const byId = <T extends { id: string }>(list: readonly T[], id: string) => list.find((x) => x.id === id);

export function priceOf(sel: Selection): number {
  const base = sel.pasta ? (byId(crea.pastas, sel.pasta)?.price ?? 0) : Math.min(...crea.pastas.map((p) => p.price));
  const sauce = byId(crea.sauces, sel.sauce)?.price ?? 0;
  const sea = sel.seafood.reduce((sum, id) => sum + (byId(crea.seafood.items, id)?.price ?? 0), 0);
  const extras = sel.extras.reduce((sum, id) => sum + (byId(crea.extras.items, id)?.price ?? 0), 0);
  const portion = byId(crea.portion.options, sel.portion)?.price ?? 0;
  return base + sauce + sea + extras + portion;
}

export function allergensOf(sel: Selection): AllergenId[] {
  if (!sel.pasta) return [];
  const set = new Set<AllergenId>();
  const add = (list?: readonly AllergenId[]) => list?.forEach((a) => set.add(a));
  add(byId(crea.pastas, sel.pasta)?.allergens);
  add(byId(crea.sauces, sel.sauce)?.allergens);
  sel.seafood.forEach((id) => add(byId(crea.seafood.items, id)?.allergens));
  sel.extras.forEach((id) => add(byId(crea.extras.items, id)?.allergens));
  if (!sel.remove.includes("cheese")) set.add("milk");
  return Object.keys(allergenLabels).filter((a) => set.has(a as AllergenId)) as AllergenId[];
}

/** "Linguine · Nero di seppia · Prawns & Mussels" */
export function nameOf(sel: Selection): string {
  if (!sel.pasta) return "";
  const parts = [byId(crea.pastas, sel.pasta)?.label, byId(crea.sauces, sel.sauce)?.label];
  const sea = sel.seafood.map((id) => byId(crea.seafood.items, id)?.label ?? "");
  if (sea.length) parts.push(sea.length > 1 ? `${sea.slice(0, -1).join(", ")} & ${sea.at(-1)}` : sea[0]);
  return parts.filter(Boolean).join(" · ");
}

/** Short kitchen-ticket lines for everything that isn't the default. */
export function detailsOf(sel: Selection): string[] {
  const lines: string[] = [];
  const spice = byId(crea.spice.options, sel.spice);
  if (spice && sel.spice !== initialSelection.spice) lines.push(spice.label);
  sel.remove.forEach((id) => lines.push(byId(crea.remove.options, id)?.label ?? id));
  sel.extras.forEach((id) => lines.push(`+ ${byId(crea.extras.items, id)?.label ?? id}`));
  if (sel.cooking !== initialSelection.cooking) lines.push(byId(crea.cooking.options, sel.cooking)?.label ?? "");
  if (sel.portion !== initialSelection.portion) lines.push(byId(crea.portion.options, sel.portion)?.label ?? "");
  if (sel.note.trim()) lines.push(`“${sel.note.trim()}”`);
  return lines.filter(Boolean);
}

export type PlacedLayer = Layer & { key: string; label: string };

/** Everything drawn on top of the pasta, keyed so additions/removals can animate. */
export function layersOf(sel: Selection): PlacedLayer[] {
  if (!sel.pasta) return [];
  const L = crea.layers;
  const out: PlacedLayer[] = [];
  // Grated cheese: dusted over the pasta (everything else sits on top of it).
  if (!sel.remove.includes("cheese")) out.push({ ...L.cheese, key: "cheese", label: "Cheese" });
  sel.seafood.forEach((id, i) => {
    const item = byId(crea.seafood.items, id);
    const defaultSlot = crea.seafood.slots[i];
    if (!item || !defaultSlot) return;
    // Dropped by the user? Then it goes exactly where they put it.
    const placed = sel.placements[`sea-${id}`];
    const slot = placed ? { ...defaultSlot, ...placed } : defaultSlot;
    if (item.pieces && item.piece) {
      // Several single pieces (e.g. three prawns) fanned around the slot; tighter in the side slots.
      const spread = placed ? 0.75 : i === 0 ? 1 : 0.65;
      item.pieces.forEach((pc, j) =>
        out.push({
          src: pc.src ?? item.piece!,
          flip: pc.flip,
          x: slot.x + pc.dx * spread,
          y: slot.y + pc.dy * spread,
          w: pc.w,
          rotate: pc.rotate,
          z: 20 - i,
          key: j === 1 ? `sea-${id}` : `sea-${id}-${j}`,
          label: item.label,
        }),
      );
      return;
    }
    out.push({ ...slot, src: item.img, z: 20 - i, key: `sea-${id}`, label: item.label });
  });
  const at = (key: string) => sel.placements[key] ?? {};
  if (sel.extras.includes("burrata")) out.push({ ...L.burrata, ...at("burrata"), key: "burrata", label: "Burrata" });
  if (sel.extras.includes("extraPrawns"))
    out.push({ ...L.extraPrawns, ...at("extraPrawns"), key: "extraPrawns", label: "Extra prawns" });
  const chillies = byId(crea.spice.options, sel.spice)?.chillies ?? 0;
  if (chillies >= 2) out.push({ ...L.chilli, key: "chilli", label: "Chilli" });
  if (chillies >= 3) out.push({ ...L.chilliHot, key: "chilliHot", label: "Chilli" });
  if (!sel.remove.includes("basil")) out.push({ ...L.basil, key: "basil", label: "Basil" });
  if (sel.extras.includes("bread")) out.push({ ...L.bread, ...at("bread"), key: "bread", label: "Bread" });
  return out;
}

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);
