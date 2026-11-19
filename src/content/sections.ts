// Copy for everything below the hero.
// PLACEHOLDER: address, hours, time zone, prices and the quote are invented — replace with the real ones.

export const marquee = {
  label: "GIRA in a few words",
  items: ["Pasta fresca", "Frutti di mare", "Crea il tuo", "Fatto a mano", "Pomodoro & basilico", "Dal mare alla tavola"],
} as const;

export const story = {
  id: "story",
  eyebrow: "La nostra storia",
  title: "A small kitchen that turns on one idea.",
  lead: "Pasta made the same morning, seafood bought before sunrise, and a pan hot enough to bring them together in minutes. That's the whole spiral.",
  stats: [
    { value: 12, suffix: "", label: "pasta shapes rolled by hand" },
    { value: 6, suffix: " a.m.", label: "at the fish market, every day" },
    { value: 40, suffix: "", label: "seats, never more" },
  ],
  steps: [
    { title: "Flour & eggs", body: "Durum semolina and free-range yolks, kneaded until the dough turns silk." },
    { title: "Rolled by hand", body: "Cut on bronze, dried for a few hours — never days — so the sauce holds on." },
    { title: "Fresh from the sea", body: "Mussels, prawns and the catch of the day, chosen at the market that morning." },
    { title: "Twirled to order", body: "Pasta and sea meet in the pan for minutes. It reaches your table still turning." },
  ],
  /** The signature plate, shown whole: never cropped, always at its own 1672×941 proportions. */
  plate: {
    eyebrow: "Il piatto",
    title: "Linguine allo scoglio",
    caption: "Our signature plate: hand-rolled linguine, mussels, prawns, cherry tomatoes and basil, finished in the pan in minutes.",
    image: {
      src: "/images/plate-linguine-scoglio.webp",
      width: 1672,
      height: 941,
      alt: "A white plate of linguine in tomato sauce with mussels, prawns, halved cherry tomatoes and a sprig of basil.",
    },
  },
  image: {
    src: "/images/story-spiral.webp",
    width: 941,
    height: 1672,
    alt: "A spiral of spaghetti in tomato sauce twisting upward, with prawns, mussels, cherry tomatoes and basil, against a deep red background.",
    focal: "50% 50%",
  },
} as const;

export type MenuImage = { src: string; alt: string; width: number; height: number };

export type MenuItem = {
  name: string;
  description: string;
  price: string;
  tags?: string[];
  /** Shown whole at its own proportions (the dish photos carry their name, so they are never cropped). */
  image?: MenuImage;
  /** Opens "Crea il tuo" with this dish already on the plate. */
  crea?: { pasta: "linguine" | "spaghetti" | "paccheri"; sauce?: "pomodoro" | "bianco" | "nero" | "pesto"; sea?: ("prawns" | "mussels" | "clams" | "squid" | "octopus")[]; extras?: ("burrata" | "extraPrawns" | "bread")[] };
};

export type MenuCategory = { id: string; label: string; intro: string; items: MenuItem[] };

const PORTRAIT = { width: 1122, height: 1402 } as const;
const LANDSCAPE = { width: 1672, height: 941 } as const;

export const menu = {
  id: "menu",
  eyebrow: "Il menù",
  title: "Pasta, sea, and very little in between.",
  note: "Our menu follows the market — a few dishes change every week.",
  customise: "Customise",
  customiseLabel: (dish: string) => `Customise ${dish} in Crea il tuo`,
  crea: {
    title: "Or build your own.",
    text: "Pick the pasta, the sauce and up to three treasures from the sea — and watch your plate come together.",
    label: "Crea il tuo",
    href: "/crea-il-tuo",
  },
  currency: "EUR",
  fallbackImage: { src: "/brand/gira-icone-app-1024.png", alt: "The GIRA spiral", width: 1024, height: 1024 } as MenuImage,
  categories: [
    {
      id: "pasta",
      label: "Pasta",
      intro: "Made every morning, cooked to order.",
      items: [
        {
          name: "Spaghetti al pomodoro",
          description: "San Marzano tomato, garlic confit, torn basil, a prawn on top.",
          price: "14",
          crea: { pasta: "spaghetti", sauce: "pomodoro" },
          image: {
            src: "/images/menu/spaghetti-al-pomodoro.webp",
            alt: "A plate of spaghetti in tomato sauce topped with basil and grated cheese, fresh tomatoes behind.",
            ...LANDSCAPE,
          },
        },
        {
          name: "Linguine allo scoglio",
          description: "Mussels, prawns, cherry tomatoes and garlic — our signature plate.",
          price: "24",
          tags: ["Signature"],
          crea: { pasta: "linguine", sauce: "pomodoro", sea: ["prawns", "mussels", "clams"] },
          image: {
            src: "/images/plate-linguine-scoglio.webp",
            alt: "A white plate of linguine in tomato sauce with mussels, prawns, halved cherry tomatoes and basil.",
            ...LANDSCAPE,
          },
        },
        {
          name: "Paccheri alla Norma",
          description: "Fried aubergine, slow tomato sugo, ricotta salata.",
          price: "16",
          tags: ["Vegetarian"],
          crea: { pasta: "paccheri", sauce: "pomodoro" },
          image: {
            src: "/images/menu/paccheri-alla-norma.png",
            alt: "Paccheri in tomato sauce with fried aubergine, grated ricotta salata and basil.",
            ...PORTRAIT,
          },
        },
        {
          name: "Tagliatelle ai frutti di mare",
          description: "Hand-cut ribbons, a white ragù of the day's catch, lemon zest.",
          price: "22",
          image: {
            src: "/images/menu/tagliatelle-ai-frutti-di-mare.png",
            alt: "Tagliatelle with prawns, mussels, squid rings and cherry tomatoes, topped with basil.",
            ...PORTRAIT,
          },
        },
      ],
    },
    {
      id: "mare",
      label: "Mare",
      intro: "Whatever the boats brought in this morning.",
      items: [
        {
          name: "Gamberi all'aglio",
          description: "Prawns seared with garlic, chilli and parsley, bread for the sauce.",
          price: "18",
          image: {
            src: "/images/menu/gamberi-all-aglio.png",
            alt: "Garlic prawns in a glossy butter sauce with parsley and basil on a white plate.",
            ...PORTRAIT,
          },
        },
        {
          name: "Cozze alla tarantina",
          description: "Mussels in a spicy tomato broth, grilled sourdough.",
          price: "15",
          image: {
            src: "/images/menu/cozze-alla-tarantina.png",
            alt: "Open mussels in a spicy tomato broth with garlic and parsley.",
            ...PORTRAIT,
          },
        },
        {
          name: "Frittura di paranza",
          description: "Small fish of the day, lightly fried, lemon.",
          price: "19",
          image: {
            src: "/images/menu/frittura-di-paranza.png",
            alt: "Lightly fried small fish, prawns and squid rings with lemon wedges.",
            ...PORTRAIT,
          },
        },
      ],
    },
    {
      id: "antipasti",
      label: "Antipasti",
      intro: "To share while the water boils.",
      items: [
        {
          name: "Pomodorini e burrata",
          description: "Sweet cherry tomatoes, creamy burrata, basil oil.",
          price: "12",
          tags: ["Vegetarian"],
          image: {
            src: "/images/menu/pomodorini-e-burrata.png",
            alt: "A whole burrata surrounded by roasted cherry tomatoes, basil and olive oil.",
            ...PORTRAIT,
          },
        },
        {
          name: "Bruschetta al pomodoro",
          description: "Grilled bread, raw tomato, garlic, oregano.",
          price: "8",
          tags: ["Vegan"],
          image: {
            src: "/images/menu/bruschetta-al-pomodoro.png",
            alt: "Slices of grilled bread topped with diced tomato and basil.",
            ...PORTRAIT,
          },
        },
        {
          name: "Polpo e patate",
          description: "Tender octopus, crushed potatoes, olives and parsley.",
          price: "14",
          image: {
            src: "/images/menu/polpo-e-patate.png",
            alt: "Octopus tentacles with potatoes, olives and parsley on a white plate.",
            ...PORTRAIT,
          },
        },
      ],
    },
    {
      id: "dolci",
      label: "Dolci",
      intro: "Something sweet to finish the turn.",
      items: [
        {
          name: "Tiramisù della casa",
          description: "Mascarpone, espresso, savoiardi, cocoa.",
          price: "8",
          image: {
            src: "/images/menu/tiramisu-della-casa.png",
            alt: "A square slice of tiramisù dusted with cocoa, topped with chocolate curls and mint.",
            ...PORTRAIT,
          },
        },
        {
          name: "Panna cotta agli agrumi",
          description: "Vanilla cream, citrus from Sicily.",
          price: "7",
          image: {
            src: "/images/menu/panna-cotta-agli-agrumi.png",
            alt: "A panna cotta topped with orange and blood-orange segments, citrus syrup and mint.",
            ...LANDSCAPE,
          },
        },
        {
          name: "Cannolo siciliano",
          description: "Crisp shell, sheep's ricotta, pistachio.",
          price: "6",
          image: {
            src: "/images/menu/cannolo-siciliano.png",
            alt: "A Sicilian cannolo filled with ricotta and chocolate chips, ends dipped in pistachio, with candied orange.",
            ...LANDSCAPE,
          },
        },
      ],
    },
  ] satisfies MenuCategory[],
} as const;

export const quote = {
  text: "The kind of pasta you remember on the way home — and plan the next visit around.",
  author: "A regular, table 7",
  image: {
    src: "/images/quote-orbit.webp",
    width: 1920,
    height: 1080,
    alt: "",
  },
} as const;

export type DayHours = { day: number; label: string; ranges: [string, string][] };

export const visit = {
  id: "visit",
  eyebrow: "Vieni a trovarci",
  title: "Come hungry. Leave turning.",
  address: {
    lines: ["12 Rue de la Mer", "75000 Paris"],
    mapUrl: "https://www.google.com/maps/search/?api=1&query=12+Rue+de+la+Mer+Paris",
    mapLabel: "Open in Maps",
  },
  phone: { display: "+33 1 00 00 00 00", href: "tel:+33100000000" },
  email: "ciao@gira.example",
  timeZone: "Europe/Paris",
  hoursTitle: "Opening hours",
  /** day: 0 = Sunday … 6 = Saturday. Empty ranges = closed. */
  hours: [
    { day: 1, label: "Monday", ranges: [] },
    { day: 2, label: "Tuesday", ranges: [["12:00", "14:30"], ["19:00", "22:30"]] },
    { day: 3, label: "Wednesday", ranges: [["12:00", "14:30"], ["19:00", "22:30"]] },
    { day: 4, label: "Thursday", ranges: [["12:00", "14:30"], ["19:00", "22:30"]] },
    { day: 5, label: "Friday", ranges: [["12:00", "14:30"], ["19:00", "23:00"]] },
    { day: 6, label: "Saturday", ranges: [["12:00", "15:00"], ["19:00", "23:00"]] },
    { day: 0, label: "Sunday", ranges: [["12:00", "15:30"]] },
  ] satisfies DayHours[],
  closedLabel: "Closed",
  book: { label: "Book a table", href: "/prenota" },
  badge: {
    open: "Open now",
    closed: "Closed now",
    closesAt: "until",
    opensAt: "Opens",
    today: "today at",
    tomorrow: "tomorrow at",
    on: "on",
    at: "at",
  },
  newsletter: {
    title: "La lettera",
    body: "One short email a month: the new dishes, the market, the odd secret table.",
    label: "Email address",
    placeholder: "you@example.com",
    submit: "Subscribe",
    sending: "Subscribing…",
    errors: {
      empty: "Please enter your email address.",
      invalid: "That doesn't look like an email address — check for a typo?",
    },
    success: "Grazie! You're on the list. Look out for our next letter.",
    privacy: "No spam, unsubscribe anytime.",
  },
  wordmark: "GIRA",
  legal: "© GIRA — Pasta & Mare. Demo site.",
} as const;

/**
 * Landing-page teaser for "Crea il tuo": a plate builds itself as the visitor scrolls.
 * Each stage adds to the one before; `step` lights up the matching step on the right.
 */
export const creaTeaser = {
  id: "crea",
  eyebrow: "Crea il tuo",
  title: "Your plate, turned your way.",
  lead: "Pick the pasta, the sauce and up to three treasures from the sea. We twirl it to order.",
  steps: [
    { id: "pasta", number: 1, label: "La pasta", text: "Linguine, spaghetti or paccheri, rolled this morning." },
    { id: "sugo", number: 2, label: "Il sugo", text: "Pomodoro, bianco, nero di seppia or pesto." },
    { id: "mare", number: 3, label: "Il mare", text: "Prawns, mussels, clams: drop them where you like." },
    { id: "tocco", number: 4, label: "Il tocco", text: "Burrata, chilli, a softer bite: make it yours." },
  ],
  /** What the plate shows at each scroll stage (the first is the empty plate). */
  stages: [
    { step: "pasta", pasta: null, sauce: "bianco", sea: [], extras: [] },
    { step: "pasta", pasta: "linguine", sauce: "bianco", sea: [], extras: [] },
    { step: "sugo", pasta: "linguine", sauce: "pomodoro", sea: [], extras: [] },
    { step: "mare", pasta: "linguine", sauce: "pomodoro", sea: ["prawns"], extras: [] },
    { step: "mare", pasta: "linguine", sauce: "pomodoro", sea: ["prawns", "mussels"], extras: [] },
    { step: "mare", pasta: "linguine", sauce: "pomodoro", sea: ["prawns", "mussels", "clams"], extras: [] },
    { step: "tocco", pasta: "linguine", sauce: "pomodoro", sea: ["prawns", "mussels", "clams"], extras: ["burrata"] },
  ],
  total: "Your plate",
  from: "from",
  cta: { label: "Build your plate", href: "/crea-il-tuo" },
  plateAlt: "A plate of linguine building itself: tomato sauce, prawns, mussels, clams and burrata.",
} as const;

/** The invitation card that greets visitors once the intro has played. */
export const welcomeCrea = {
  label: "New at GIRA: Crea il tuo",
  badge: "Nuovo",
  eyebrow: "Crea il tuo",
  title: "Build your own plate.",
  text: "Choose the pasta, the sauce and up to three treasures from the sea, and watch your plate come together.",
  cta: { label: "Try it", href: "/crea-il-tuo" },
  later: "Maybe later",
  closeLabel: "Close",
  image: "/crea/plates/plate-linguine-pomodoro.png",
  /** Wait after the intro so the hero gets its moment first. */
  delayMs: 2600,
} as const;
