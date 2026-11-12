// Copy for everything below the hero.
// PLACEHOLDER: address, hours, time zone, prices and the quote are invented — replace with the real ones.

export const marquee = {
  label: "GIRA in a few words",
  items: ["Pasta fresca", "Frutti di mare", "Fatto a mano", "Pomodoro & basilico", "Dal mare alla tavola"],
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
  image: {
    src: "/images/story-spiral.webp",
    width: 760,
    height: 1080,
    alt: "A spiral of spaghetti in tomato sauce, wrapped around prawns and basil, against a deep red background.",
    focal: "50% 40%",
  },
} as const;

export type MenuItem = {
  name: string;
  description: string;
  price: string;
  tags?: string[];
  image?: { src: string; alt: string; focal?: string };
};

export type MenuCategory = { id: string; label: string; intro: string; items: MenuItem[] };

export const menu = {
  id: "menu",
  eyebrow: "Il menù",
  title: "Pasta, sea, and very little in between.",
  note: "Our menu follows the market — a few dishes change every week.",
  currency: "EUR",
  fallbackImage: { src: "/brand/gira-icone-app-1024.png", alt: "The GIRA spiral" },
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
          image: {
            src: "/images/spaghetti-pomodoro.webp",
            alt: "A forkful of spaghetti in tomato sauce topped with a prawn and a basil leaf.",
            focal: "45% 40%",
          },
        },
        {
          name: "Linguine allo scoglio",
          description: "Mussels, prawns, cherry tomatoes and white wine — our signature plate.",
          price: "24",
          tags: ["Signature"],
          image: {
            src: "/images/linguine-scoglio.webp",
            alt: "A white plate of linguine with mussels, prawns, cherry tomatoes and basil.",
          },
        },
        {
          name: "Paccheri alla Norma",
          description: "Fried aubergine, slow tomato sugo, ricotta salata.",
          price: "16",
          tags: ["Vegetarian"],
        },
        {
          name: "Tagliatelle ai frutti di mare",
          description: "Hand-cut ribbons, a white ragù of the day's catch, lemon zest.",
          price: "22",
          image: {
            src: "/images/spirale-mare.webp",
            alt: "Twisting pasta surrounded by mussels, prawns, tomatoes and basil.",
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
          image: { src: "/images/gamberi.webp", alt: "Close-up of seared prawns with basil on pasta." },
        },
        {
          name: "Cozze alla tarantina",
          description: "Mussels in a spicy tomato broth, grilled sourdough.",
          price: "15",
          image: { src: "/images/cozze.webp", alt: "Open mussels in tomato sauce on a white plate." },
        },
        { name: "Frittura di paranza", description: "Small fish of the day, lightly fried, lemon.", price: "19" },
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
          image: { src: "/images/pomodorini.webp", alt: "Halved cherry tomatoes and a mussel in tomato sauce." },
        },
        { name: "Bruschetta al pomodoro", description: "Grilled bread, raw tomato, garlic, oregano.", price: "8", tags: ["Vegan"] },
        { name: "Polpo e patate", description: "Tender octopus, crushed potatoes, olives and parsley.", price: "14" },
      ],
    },
    {
      id: "dolci",
      label: "Dolci",
      intro: "Something sweet to finish the turn.",
      items: [
        { name: "Tiramisù della casa", description: "Mascarpone, espresso, savoiardi, cocoa.", price: "8" },
        { name: "Panna cotta agli agrumi", description: "Vanilla cream, citrus from Sicily.", price: "7" },
        { name: "Cannolo siciliano", description: "Crisp shell, sheep's ricotta, pistachio.", price: "6" },
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
