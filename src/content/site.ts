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
      { href: "/#story", label: "Story" },
      { href: "/#menu", label: "Menu" },
      { href: "/crea-il-tuo", label: "Crea il tuo", badge: "New" },
      { href: "/#visit", label: "Visit" },
    ],
    cta: { href: "/prenota", label: "Book a table" },
    /** Shown next to the CTA once something is in the order. */
    cart: { label: "Your order", href: "/crea-il-tuo" },
  },
  /** Phones: a floating shortcut to the builder, shown between the hero and the footer. */
  floatingCrea: { href: "/crea-il-tuo", label: "Crea il tuo" },
  skipLink: "Skip to content",
  preloader: { label: "Preparing the kitchen" },
  scrollHint: "Scroll",
  /** Shown when a request to the API fails before the server can explain why. */
  api: {
    network: "We couldn't reach GIRA. Check your connection and try again.",
    generic: "Something went wrong on our side. Please try again.",
  },
} as const;

export const seo = {
  title: "GIRA — Pasta & Mare | Fresh pasta & seafood",
  description:
    "Hand-rolled pasta and the morning's catch, twirled to order. See the menu, opening hours and book a table at GIRA — Pasta & Mare.",
  ogImage: { src: "/og.jpg", width: 1200, height: 630, alt: "A plate of linguine with mussels, prawns and cherry tomatoes." },
  locale: "en_GB",
} as const;
