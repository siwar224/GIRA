export const site = {
  name: "GIRA",
  tagline: "Pasta & Mare",
  description:
    "GIRA — Pasta & Mare. Hand-twirled pasta and the morning's catch, served in one spiral.",
  logo: {
    light: { src: "/brand/gira-logo-creme.png", width: 1512, height: 546 },
    dark: { src: "/brand/gira-logo-rouge.png", width: 1514, height: 546 },
    alt: "GIRA — Pasta & Mare",
  },
  nav: {
    label: "Main",
    links: [
      { href: "#story", label: "Story" },
      { href: "#menu", label: "Menu" },
      { href: "#visit", label: "Visit" },
    ],
    cta: { href: "#visit", label: "Book a table" },
  },
  skipLink: "Skip to content",
  preloader: { label: "Preparing the kitchen" },
  scrollHint: "Scroll",
} as const;

export const seo = {
  title: "GIRA — Pasta & Mare | Fresh pasta & seafood",
  description:
    "Hand-rolled pasta and the morning's catch, twirled to order. See the menu, opening hours and book a table at GIRA — Pasta & Mare.",
  ogImage: { src: "/og.jpg", width: 1200, height: 630, alt: "A plate of linguine with mussels, prawns and cherry tomatoes." },
  locale: "en_GB",
} as const;
