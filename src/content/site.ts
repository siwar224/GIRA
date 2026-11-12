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

export const intro = {
  id: "story",
  eyebrow: "Pasta & Mare",
  title: "One turn of the fork. The whole sea on the plate.",
  body: [
    "At GIRA, the pasta is rolled every morning and the seafood arrives before the doors open. Nothing waits, nothing sits — it all meets in the pan for a few minutes and comes to you still turning.",
    "The story, the menu and how to find us arrive in the next version of this page.",
  ],
} as const;

export const footer = {
  id: "visit",
  line: "GIRA · Pasta & Mare",
  note: "Visit details coming soon.",
} as const;
