// "Prenota un tavolo" — booking. All copy, areas, tables and table-scene layout live here.
// No wine or alcohol anywhere on the table (house rule).
// PLACEHOLDER: table count, areas and booking rules are a demo; availability is simulated.

export type Meal = "lunch" | "dinner";
export type AreaId = "window" | "room" | "counter" | "terrace";
export type OccasionId = "none" | "birthday" | "anniversary" | "business";
export type TableSize = 2 | 4 | 6;

const T = "/book/tables";
const P = "/book/props";
const R = "/book/room";

export const booking = {
  page: {
    eyebrow: "Prenota un tavolo",
    title: "Set your table.",
    lead: "Choose your moment, watch your table come to life, then pick exactly where you'll sit.",
    metaTitle: "Book a table | GIRA — Pasta & Mare",
    metaDescription:
      "Book your table at GIRA — Pasta & Mare: choose lunch or dinner, your time and your table on our floor plan.",
  },

  steps: [
    { id: "moment", number: 1, label: "Apparecchia", title: "Set the table" },
    { id: "time", number: 2, label: "Gira", title: "Turn to your time" },
    { id: "table", number: 3, label: "Il tavolo", title: "Pick your table" },
    { id: "details", number: 4, label: "Conferma", title: "Your details" },
  ],

  guests: { label: "Guests", min: 1, max: 6, more: "More than 6? Call us and we'll set a long table.", unit: ["guest", "guests"] },
  date: { label: "Day", closed: "Closed", today: "Today", tomorrow: "Tomorrow", days: 14 },
  meal: {
    label: "Moment",
    options: [
      { id: "lunch", label: "Pranzo", note: "Lunch" },
      { id: "dinner", label: "Cena", note: "Dinner" },
    ] as { id: Meal; label: string; note: string }[],
    /** A booking slot before this hour counts as lunch. */
    lunchBefore: 17,
  },
  occasion: {
    label: "Occasion",
    options: [
      { id: "none", label: "Just because" },
      { id: "birthday", label: "Birthday" },
      { id: "anniversary", label: "Anniversary" },
      { id: "business", label: "Business" },
    ] as { id: OccasionId; label: string }[],
  },

  areas: [
    { id: "window", label: "Window", note: "By the tall windows", photo: { lunch: `${R}/area-window-lunch.png`, dinner: `${R}/area-window-dinner.png` } },
    { id: "room", label: "Main room", note: "In the middle of it all", photo: { lunch: `${R}/area-window-lunch.png`, dinner: `${R}/area-window-dinner.png` } },
    { id: "counter", label: "Chef's counter", note: "Watch the pasta being twirled", photo: { lunch: `${R}/area-counter-lunch.png`, dinner: `${R}/area-counter-dinner.png` } },
    { id: "terrace", label: "Terrace", note: "Under the olive trees", photo: { lunch: `${R}/area-terrace-lunch.png`, dinner: `${R}/area-terrace-dinner.png` } },
  ] as { id: AreaId; label: string; note: string; photo: Record<Meal, string> }[],
  anyArea: "Anywhere",

  time: {
    label: "Time",
    hint: "Turn the spiral, use the arrow keys, or tap a time.",
    legend: { available: "Available", almost: "Almost full", full: "Full" },
    none: "No tables left for this moment — try another day.",
    checking: "Checking which tables are free…",
    loadError: "We couldn't check which tables are free.",
    retry: "Try again",
    stepMinutes: 30,
    /** Last booking this many minutes before closing. */
    lastBeforeClose: 60,
  },

  plan: {
    label: "Floor plan",
    hint: "Tables that fit your party glow. Tap one to see it.",
    image: { lunch: `${R}/floorplan-lunch.png`, dinner: `${R}/floorplan-dinner.png` },
    width: 1448,
    height: 1086,
    seats: (n: number) => `${n} seats`,
    select: "Select this table",
    selected: "Your table",
    taken: "Already booked",
    tooSmall: "Too small for your party",
    tooBig: "Kept for larger parties",
    pickTime: "Choose a time first",
    checking: "Checking tables…",
    /** The plan and "Where to sit" stay in sync. */
    switched: (area: string) => `Switched "Where to sit" to ${area}.`,
    switchAndSelect: (area: string) => `Sit here instead (${area})`,
    otherArea: (area: string) => `This table is in ${area}.`,
    noneInArea: (area: string, time: string) => `No ${area} table is free for your party at ${time}.`,
    showAll: "Show all areas",
    inArea: (area: string, n: number) => `${n} ${area} ${n === 1 ? "table fits" : "tables fit"} your party.`,
  },

  /**
   * Tables on the floor plan: centre (x, y) in % of the plan image, size = seats.
   * Counter "tables" are pairs of stools (shown as a highlight over the stools, not a table image).
   */
  tables: [
    { id: "C1", label: "Counter 1", area: "counter", size: 2, x: 38, y: 26, counter: true },
    { id: "C2", label: "Counter 2", area: "counter", size: 2, x: 53.5, y: 26, counter: true },
    { id: "C3", label: "Counter 3", area: "counter", size: 2, x: 69.5, y: 26, counter: true },
    { id: "1", label: "Table 1", area: "window", size: 4, x: 19, y: 37 },
    { id: "2", label: "Table 2", area: "window", size: 2, x: 19, y: 60 },
    { id: "3", label: "Table 3", area: "room", size: 4, x: 39, y: 43 },
    { id: "4", label: "Table 4", area: "room", size: 6, x: 60, y: 45 },
    { id: "5", label: "Table 5", area: "room", size: 2, x: 82, y: 41 },
    { id: "6", label: "Table 6", area: "room", size: 2, x: 39, y: 64 },
    { id: "7", label: "Table 7", area: "room", size: 4, x: 61, y: 65 },
    { id: "8", label: "Table 8", area: "terrace", size: 4, x: 33, y: 90 },
    { id: "9", label: "Table 9", area: "terrace", size: 2, x: 52, y: 90 },
    { id: "10", label: "Table 10", area: "terrace", size: 2, x: 68, y: 90 },
  ] as { id: string; label: string; area: AreaId; size: TableSize; x: number; y: number; counter?: boolean }[],
  /** Width of a table image on the plan, in % of the plan width, by size. */
  tableWidthOnPlan: { 2: 12, 4: 12, 6: 14 } as Record<TableSize, number>,

  /** The "set the table" scene. Positions in % of the table image (square). */
  scene: {
    table: {
      2: { lunch: `${T}/table-2-lunch.png`, dinner: `${T}/table-2-dinner.png` },
      4: { lunch: `${T}/table-4-lunch.png`, dinner: `${T}/table-4-dinner.png` },
      6: { lunch: `${T}/table-6-lunch.png`, dinner: `${T}/table-6-dinner.png` },
    } as Record<TableSize, Record<Meal, string>>,
    imageSize: 1254,
    centre: { x: 49, y: 50 },
    /** Where each chair is, in degrees (0 = right, 90 = bottom), in the order seats are filled. */
    chairs: {
      2: [90, 270],
      4: [90, 270, 0, 180],
      6: [90, 270, 30, 210, 330, 150],
    } as Record<TableSize, number[]>,
    /** Place setting: size and distance from the centre, by table size. */
    setting: {
      src: { lunch: `${P}/setting-lunch.png`, dinner: `${P}/setting-dinner.png` },
      2: { w: 26, d: 14.5 },
      4: { w: 24, d: 15 },
      6: { w: 21, d: 18 },
    },
    /** Centrepiece, by moment (water and bread always; the candle only at dinner). */
    centre_props: {
      lunch: [
        { src: `${P}/prop-carafe.png`, dx: 4.5, dy: -3, w: 16 },
        { src: `${P}/prop-bread.png`, dx: -4.5, dy: 3, w: 15 },
      ],
      dinner: [
        { src: `${P}/prop-candle.png`, dx: 0, dy: 0, w: 12 },
        { src: `${P}/prop-water.png`, dx: 5.5, dy: -3.5, w: 15 },
        { src: `${P}/prop-bread.png`, dx: -5.5, dy: 3.5, w: 14 },
      ],
    },
    /** At dinner with an occasion, the candle steps aside so both show. */
    candleWithOccasion: { dx: 4.5, dy: 4.5 },
    occasion: {
      birthday: { src: `${P}/prop-birthday.png`, dx: 0, dy: -1, w: 15 },
      anniversary: { src: `${P}/prop-flowers.png`, dx: 0, dy: -1, w: 15 },
      business: { src: `${P}/prop-business.png`, dx: 0, dy: -1, w: 17 },
    },
    /** The guest's name card sits in front of the first place setting. */
    namecard: { src: `${P}/prop-namecard.png`, w: 16 },
  },

  details: {
    name: { label: "Name", placeholder: "Your name", error: "Please tell us your name." },
    phone: { label: "Phone", placeholder: "+33 6 00 00 00 00", error: "We need a phone number in case of changes." },
    email: { label: "Email", placeholder: "you@example.com", error: "That doesn't look like an email address." },
    note: { label: "Anything we should know?", placeholder: "Allergies, high chair, a surprise…", max: 200 },
    confirm: "Confirm booking",
    confirming: "Confirming…",
    missing: "Choose a time and a table first.",
    /** The chosen table was booked by someone else while this page was open. */
    tableGone: "That table has just been booked by someone else. Please pick another one.",
  },

  summary: {
    title: "Your booking",
    empty: "Choose a time",
    at: "at",
    table: "Table",
  },

  ticket: {
    brand: "GIRA",
    sub: "Pasta & Mare",
    confirmed: "Reservation confirmed",
    code: "Booking code",
    showAtDoor: "Show this code at the door",
    calendar: "Add to calendar",
    share: "Share with your guests",
    shared: "Copied — paste it to your guests",
    preorder: "Pre-order your plate: Crea il tuo",
    another: "Make another booking",
    manage: "Manage or cancel",
    emailed: (email: string) => `A confirmation is on its way to ${email}.`,
    calendarTitle: "Table at GIRA — Pasta & Mare",
    rows: { name: "Name", when: "When", guests: "Guests", table: "Table", occasion: "Occasion" },
  },

  /** "Find or cancel a booking" (/prenota/gestisci): the code and the phone number prove it's yours. */
  manage: {
    href: "/prenota/gestisci",
    metaTitle: "Your booking | GIRA — Pasta & Mare",
    eyebrow: "La tua prenotazione",
    title: "Find your booking.",
    lead: "Enter your booking code and the phone number you booked with. No account needed.",
    lookup: {
      code: { label: "Booking code", placeholder: "GIRA-XXXXXXXX" },
      phone: { label: "Phone", placeholder: "+33 6 00 00 00 00" },
      submit: "Find my booking",
      searching: "Looking…",
      codeError: "A booking code looks like GIRA-XXXXXXXX (it's on your ticket).",
      notFound: "We couldn't find a booking with that code and phone number.",
      another: "Look up another booking",
    },
    rows: { when: "When", guests: "Guests", table: "Table", occasion: "Occasion", email: "Email", note: "Note" },
    past: "This booking is in the past, so it can no longer be changed.",
    cancel: {
      title: "Can't make it?",
      body: "Cancelling frees your table for someone else.",
      button: "Cancel this booking",
      confirm: "Yes, cancel it",
      keep: "Keep my booking",
      cancelling: "Cancelling…",
      done: "Your booking is cancelled. We hope to see you another time.",
      bookAgain: "Book a new table",
    },
    preorder: {
      title: "Pre-order your plates",
      lead: "Build your plates in Crea il tuo, then send them here: the kitchen will have them ready for your table.",
      saved: "Your pre-order",
      yourCart: "In your order (not sent yet)",
      send: (n: number) => `Send ${n} ${n === 1 ? "plate" : "plates"} with my booking`,
      replace: (n: number) => `Replace my pre-order with these ${n} ${n === 1 ? "plate" : "plates"}`,
      sending: "Sending…",
      sent: "Sent to the kitchen. Prices are confirmed by the restaurant.",
      remove: "Remove",
      total: "Total",
      estimate: "Estimated total",
      build: "Build a plate",
      none: "No plates yet.",
      empty: "Add at least one plate first.",
      tooMany: "Up to 10 plates per booking — call us for more.",
      payNote: "Nothing is paid online: you pay at the restaurant.",
    },
  },

  /** Booking length, for the calendar entry. */
  durationMinutes: 120,
} as const;
