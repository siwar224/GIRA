// "Crea il tuo" — build-your-own plate. All copy, options, prices and allergens live here.
// PLACEHOLDER prices: replace with the real ones. Allergens follow the 14 EU allergens; check them with the kitchen.

export type AllergenId = "gluten" | "egg" | "milk" | "crustaceans" | "molluscs" | "nuts" | "sulphites";

export const allergenLabels: Record<AllergenId, string> = {
  gluten: "Gluten",
  egg: "Egg",
  milk: "Milk",
  crustaceans: "Crustaceans",
  molluscs: "Molluscs",
  nuts: "Nuts",
  sulphites: "Sulphites",
};

/** A layer drawn on the plate. Position and size are % of the plate image (1448×1086). */
export type Layer = { src: string; x: number; y: number; w: number; rotate?: number; z?: number };

export type PastaId = "linguine" | "spaghetti" | "paccheri" | "tagliatelle";
export type SauceId = "pomodoro" | "bianco" | "nero" | "pesto";
export type SeafoodId = "prawns" | "mussels" | "clams" | "squid" | "octopus";
export type ExtraId = "burrata" | "extraPrawns" | "bread";
export type SpiceId = "dolce" | "medio" | "piccante" | "calabrese";
export type RemoveId = "garlic" | "basil" | "cheese";
export type CookingId = "aldente" | "softer";
export type PortionId = "normale" | "abbondante";

const ING = "/crea/ing";

export const crea = {
  page: {
    title: "Crea il tuo",
    lead: "Build your own plate: choose the pasta, the sauce and the sea — we twirl it to order.",
    metaTitle: "Crea il tuo — build your own pasta | GIRA — Pasta & Mare",
    metaDescription:
      "Choose your pasta shape, sauce, seafood and finishing touches, and watch your plate come together. Pickup order at GIRA — Pasta & Mare.",
    backToMenu: "Back to the menu",
  },
  steps: [
    { id: "pasta", number: 1, label: "La pasta", title: "Choose your pasta shape" },
    { id: "sugo", number: 2, label: "Il sugo", title: "Pick a sauce" },
    { id: "mare", number: 3, label: "Il mare", title: "Add the sea" },
    { id: "tocco", number: 4, label: "Il tocco", title: "Make it yours" },
  ],
  nav: { back: "Back", next: "Next", review: "Review" },

  plate: {
    /** Natural size of every plate image: they all share the same framing. */
    width: 1448,
    height: 1086,
    empty: "/crea/plates/plate-empty.png",
    emptyAlt: "An empty white plate, waiting for your pasta.",
    dropHint: "Drop it on the plate",
    dragHint: "Drag ingredients onto the plate — or just tap them",
  },

  pastas: [
    { id: "linguine", label: "Linguine", price: 12, allergens: ["gluten"], icon: null },
    { id: "spaghetti", label: "Spaghetti", price: 12, allergens: ["gluten"], icon: null },
    { id: "paccheri", label: "Paccheri", price: 13, allergens: ["gluten"], icon: null },
    {
      id: "tagliatelle",
      label: "Tagliatelle",
      price: 13,
      allergens: ["gluten", "egg"],
      icon: "/crea/icons/icon-tagliatelle.png",
    },
  ] as { id: PastaId; label: string; price: number; allergens: AllergenId[]; icon: string | null }[],

  sauces: [
    {
      id: "pomodoro",
      label: "Pomodoro",
      note: "San Marzano tomato",
      price: 0,
      allergens: [],
      icon: "/crea/icons/icon-sauce-pomodoro.png",
    },
    {
      id: "bianco",
      label: "Bianco",
      note: "White wine & garlic",
      price: 1,
      allergens: ["sulphites"],
      icon: "/crea/icons/icon-sauce-bianco.png",
    },
    {
      id: "nero",
      label: "Nero di seppia",
      note: "Squid ink",
      price: 3,
      allergens: ["molluscs"],
      icon: "/crea/icons/icon-sauce-nero.png",
    },
    {
      id: "pesto",
      label: "Pesto",
      note: "Basil, pine nuts, parmesan",
      price: 2,
      allergens: ["nuts", "milk"],
      icon: "/crea/icons/icon-sauce-pesto.png",
    },
  ] as { id: SauceId; label: string; note: string; price: number; allergens: AllergenId[]; icon: string }[],

  /** Which pasta × sauce plates exist. A combination without a photo is offered as "not available". */
  plates: {
    "linguine-pomodoro": "/crea/plates/plate-linguine-pomodoro.png",
    "linguine-bianco": "/crea/plates/plate-linguine-bianco.png",
    "linguine-nero": "/crea/plates/plate-linguine-nero.png",
    "linguine-pesto": "/crea/plates/plate-linguine-pesto.png",
    "spaghetti-pomodoro": "/crea/plates/plate-spaghetti-pomodoro.png",
    "spaghetti-bianco": "/crea/plates/plate-spaghetti-bianco.png",
    "spaghetti-nero": "/crea/plates/plate-spaghetti-nero.png",
    "spaghetti-pesto": "/crea/plates/plate-spaghetti-pesto.png",
    "paccheri-pomodoro": "/crea/plates/plate-paccheri-pomodoro.png",
  } as Partial<Record<`${PastaId}-${SauceId}`, string>>,
  unavailableSauce: "Not available with this pasta",

  seafood: {
    title: "Seafood",
    max: 3,
    maxReached: "You can choose up to 3 — remove one to swap.",
    items: [
      { id: "prawns", label: "Prawns", price: 5, allergens: ["crustaceans"], img: `${ING}/ing-prawns.png` },
      { id: "mussels", label: "Mussels", price: 4, allergens: ["molluscs"], img: `${ING}/ing-mussels.png` },
      { id: "clams", label: "Clams", price: 4, allergens: ["molluscs"], img: `${ING}/ing-clams.png` },
      { id: "squid", label: "Squid", price: 4, allergens: ["molluscs"], img: `${ING}/ing-squid.png` },
      { id: "octopus", label: "Octopus", price: 6, allergens: ["molluscs"], img: `${ING}/ing-octopus.png` },
    ] as { id: SeafoodId; label: string; price: number; allergens: AllergenId[]; img: string }[],
    /** Where the 1st, 2nd and 3rd seafood land on the plate. */
    slots: [
      { x: 36, y: 38, w: 21, rotate: -8 },
      { x: 62, y: 36, w: 21, rotate: 10 },
      { x: 50, y: 60, w: 22, rotate: -2 },
    ] as Omit<Layer, "src">[],
  },

  spice: {
    title: "Spice level",
    options: [
      { id: "dolce", label: "Dolce", chillies: 0 },
      { id: "medio", label: "Medio", chillies: 1 },
      { id: "piccante", label: "Piccante", chillies: 2 },
      { id: "calabrese", label: "Calabrese", chillies: 3 },
    ] as { id: SpiceId; label: string; chillies: number }[],
  },

  remove: {
    title: "Remove ingredients",
    options: [
      { id: "garlic", label: "No garlic" },
      { id: "basil", label: "No basil" },
      { id: "cheese", label: "No cheese" },
    ] as { id: RemoveId; label: string }[],
  },

  extras: {
    title: "Add extras",
    items: [
      { id: "burrata", label: "Burrata", price: 4, allergens: ["milk"], img: `${ING}/ing-burrata.png` },
      { id: "extraPrawns", label: "Extra prawns", price: 6, allergens: ["crustaceans"], img: `${ING}/ing-prawns.png` },
      { id: "bread", label: "Bread for the sauce", price: 2, allergens: ["gluten"], img: `${ING}/ing-bread.png` },
    ] as { id: ExtraId; label: string; price: number; allergens: AllergenId[]; img: string }[],
  },

  cooking: {
    title: "Cooking",
    options: [
      { id: "aldente", label: "Al dente classico" },
      { id: "softer", label: "A bit softer" },
    ] as { id: CookingId; label: string }[],
  },

  portion: {
    title: "Portion",
    options: [
      { id: "normale", label: "Normale", price: 0 },
      { id: "abbondante", label: "Abbondante", price: 4 },
    ] as { id: PortionId; label: string; price: number }[],
  },

  note: { title: "Note for the chef", placeholder: "Any special request…", max: 200 },

  /** Garnish layers drawn on top of the pasta. */
  layers: {
    basil: { src: `${ING}/ing-basil.png`, x: 53, y: 27, w: 15, rotate: 6, z: 30 },
    cheese: { src: `${ING}/ing-cheese.png`, x: 47, y: 45, w: 17, z: 12 },
    chilli: { src: `${ING}/ing-chilli.png`, x: 40, y: 55, w: 12, rotate: -12, z: 25 },
    chilliHot: { src: `${ING}/ing-chilli.png`, x: 60, y: 54, w: 11, rotate: 24, z: 25 },
    burrata: { src: `${ING}/ing-burrata.png`, x: 55, y: 49, w: 19, z: 22 },
    extraPrawns: { src: `${ING}/ing-prawns.png`, x: 42, y: 63, w: 17, rotate: 18, z: 21 },
    /** Bread sits beside the plate, not on it. */
    bread: { src: `${ING}/ing-bread.png`, x: 88, y: 78, w: 24, rotate: -6, z: 40 },
  } satisfies Record<string, Layer>,

  summary: {
    yourPlate: "La tua Gira",
    choosePasta: "Start by choosing a pasta",
    allergens: "Allergens",
    noAllergens: "Choose a pasta to see allergens",
    total: "Total",
    from: "from",
    addToCart: "Add to order",
    added: "Added to your order",
    addedBody: "Your plate is in the order. Pickup and checkout arrive with the next version of the site.",
    another: "Create another",
    inOrder: "in your order",
  },

  announce: {
    added: "added",
    removed: "removed",
    total: "Total",
  },
} as const;
