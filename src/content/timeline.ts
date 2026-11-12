// Scroll choreography for the hero. 1 unit of timeline time = 1 frame.
// Frame numbers are 1-based, matching the file names (f_0001.webp …).
//   c1 → frames   1–120  fork twirl, pasta lifts into a spiral
//   c2 → frames 121–241  the spiral turns, the sea orbits around it
//   c3 → frames 242–375  the spiral settles onto the plate
//   frame 376          the high-resolution plate photo (cream background), held at the end

export type BeatAlign = "start" | "end";

export type Beat = {
  id: string;
  /** Frame where the beat is fully visible. */
  from: number;
  /** Frame where the beat starts leaving. */
  to: number;
  align: BeatAlign;
  eyebrow?: string;
  title: string;
  body?: string;
  cta?: { href: string; label: string };
  cta2?: { href: string; label: string };
};

export const heroTimeline = {
  /** Scroll distance (px) per frame. Higher = slower scrub. */
  pxPerFrame: 12,
  /** Extra frames of "hold" at the end so the plate rests before unpinning. */
  holdFrames: 45,
  /** Frames over which a beat fades in or out. */
  fadeFrames: 14,
  /** From this frame the background is cream: nav switches to dark ink. */
  lightFromFrame: 376,
  /** Focal point (0–1) used for cover-fit cropping. */
  focal: { x: 0.5, y: 0.5 },
  /** On portrait screens, the frame is drawn this many times the viewport width (cover would crop too much). */
  portraitWidthFactor: 1.9,
  /** Living-hero effects (phase 3). All of them are off under reduced motion. */
  fx: {
    /** Text running around the rotating badge. */
    badgeText: "Pasta fresca · Frutti di mare · Fatto a mano · ",
    /** Seconds for one full badge turn at rest (scroll velocity speeds it up). */
    badgeTurn: 18,
    particles: 50,
    /** Breathing zoom amplitude (1.03 = 3 %). */
    breathe: 1.03,
    /** Mouse parallax, in px, for the image and for the text (moves the other way). */
    parallax: { media: 14, text: 8 },
  },
  beats: [
    {
      id: "beat-open",
      from: 1,
      to: 80,
      align: "start",
      eyebrow: "GIRA · Pasta & Mare",
      title: "Every great plate begins with a turn.",
      body: "Fresh pasta, twirled by hand, finished with the sea.",
    },
    {
      id: "beat-twirl",
      from: 112,
      to: 190,
      align: "end",
      eyebrow: "La pasta",
      title: "Rolled at dawn. Twirled to order.",
      body: "Bronze-cut spaghetti, slow tomato sugo and basil picked the same morning.",
    },
    {
      id: "beat-mare",
      from: 222,
      to: 290,
      align: "start",
      eyebrow: "Il mare",
      title: "The sea joins the spiral.",
      body: "Mussels, prawns and sweet cherry tomatoes. In the pan for minutes, never hours.",
    },
    {
      id: "beat-plate",
      from: 318,
      to: 362,
      align: "end",
      eyebrow: "Gira",
      title: "From the spiral to your plate.",
      body: "A small kitchen with one obsession: pasta and the sea, done properly.",
      cta: { href: "/prenota", label: "Book a table" },
      cta2: { href: "/crea-il-tuo", label: "Crea il tuo" },
    },
  ] satisfies Beat[],
} as const;
