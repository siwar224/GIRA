// "La sala" — the team's view of a service: the room from above, lit table by table as the
// evening goes on. Private (signed in), never indexed. Words for the team stay short.

export const sala = {
  href: "/sala",
  metaTitle: "La sala | GIRA — Pasta & Mare",
  title: "La sala",
  service: { lunch: "Servizio pranzo", dinner: "Servizio serale" },
  meals: { lunch: "Pranzo", dinner: "Cena" },
  today: "Oggi",
  prevDay: "Previous day",
  nextDay: "Next day",
  time: "Servizio",
  refreshed: "Updated every minute",

  signIn: {
    eyebrow: "Per la squadra",
    title: "La sala",
    lead: "The room, as tonight's guests will fill it. Team only.",
    password: "Team password",
    submit: "Enter",
    entering: "Opening…",
    error: "That password isn't right.",
  },
  signOut: "Sign out",

  table: {
    guests: (n: number) => `${n}`,
    arriving: "Arriving",
    seated: "At the table",
    preorder: "Pre-ordered",
    free: "Free at this time",
  },

  occasions: { birthday: "Compleanno", anniversary: "Anniversario", business: "Lavoro" } as Record<string, string>,

  panel: {
    arrivals: "Arrivi",
    noArrivals: "No bookings for this service yet.",
    preorders: "Preordini",
    note: "Note",
    phone: "Phone",
    close: "Close",
    waitlist: "In attesa",
    noWaitlist: "Nobody waiting.",
    told: "Told a table freed up",
  },

  errors: {
    load: "We couldn't load the service. It will try again in a minute.",
  },
} as const;
