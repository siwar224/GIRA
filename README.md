<div align="center">

<img src="public/brand/gira-logo-rouge.png" alt="GIRA" width="220" />

# GIRA — Pasta & Mare

### Every great plate begins with a turn.

A restaurant website that feels like walking through the door:
a story told by scrolling, a plate you build with your own hands,
and a table that is set for you — and kept for you — the moment you book it.

**[Visit the live site →](https://gira-lyart.vercel.app/)**

[![CI](https://github.com/siwar224/GIRA/actions/workflows/ci.yml/badge.svg)](https://github.com/siwar224/GIRA/actions/workflows/ci.yml)
[![E2E](https://github.com/siwar224/GIRA/actions/workflows/e2e.yml/badge.svg)](https://github.com/siwar224/GIRA/actions/workflows/e2e.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-00e599?logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel)

</div>

![GIRA landing page: a forkful of spaghetti with prawns on a deep red background](docs/screenshots/hero.jpg)

---

## The story

GIRA is a small Italian kitchen built around one idea: **pasta rolled that morning, seafood bought
at the market at six, and a pan hot enough to bring them together in minutes.** Twelve shapes
rolled by hand. Forty seats, never more.

A place like that doesn't need a website that lists things. It needs one that *feels* like it —
warm, unhurried, a little theatrical, and completely reliable when you ask it to hold your table.
So the site follows a guest through one evening.

### 1 · The turn

You arrive, and a forkful of pasta begins to spin. As you scroll, it becomes a spiral of the sea
and lands as a finished plate. *Gira* means "it turns" — the whole brand lives in that one motion.

### 2 · The kitchen

The story of the kitchen unfolds: the flour, the bronze dies, the morning market. Then the menu,
a photo for every dish, and on each signature pasta a quiet invitation: *make it yours*.

### 3 · Crea il tuo — your plate

Choose a pasta, a sauce and up to three treasures from the sea, then place each ingredient exactly
where you want it on the plate. The price and the allergens follow every choice, because a guest
should never have to ask.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/crea-il-tuo.jpg" alt="Crea il tuo: linguine with prawns, mussels, clams and burrata, with the price and allergens" /></td>
    <td width="50%"><img src="docs/screenshots/prenota-table.jpg" alt="Booking: a table for two set for dinner, with day, guests and moment pickers" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Crea il tuo — your plate, turned your way</sub></td>
    <td align="center"><sub>Prenota — the table sets itself for your party</sub></td>
  </tr>
</table>

### 4 · Prenota — your table

Booking is not a form; it is the moment you set your own table. Pick lunch or dinner and the light
changes. Add a guest and a new place appears. Turn a spiral dial to your time, then choose the
exact table on a floor plan — by the window, at the chef's counter, or on the terrace under the
olive trees. You leave with a ticket, a booking code, a calendar entry, and a confirmation in your
inbox.

![Interactive floor plan with the selected window table highlighted](docs/screenshots/prenota-floor-plan.jpg)

### 5 · Before the evening

Plans change, appetites grow. With just your booking code and phone number — no account, no
password — you can find your booking, send the plates you built to the kitchen so they're ready
when you sit down, or cancel and free the table for someone else.

---

## What makes it special

- **Your table is really yours.** If two people choose the same table at the same moment, only one
  gets it — the other is told kindly and can pick again. A table is held for the whole meal.
- **Honest prices.** The restaurant calculates every bill itself; nothing can be changed from the
  browser. Nothing is paid online.
- **No account needed.** A booking code and a phone number are all a guest ever needs.
- **Respect for guests.** Personal details are kept only until the evening is over, then deleted
  automatically every night. Bots are kept out without puzzles to solve.
- **Built for everyone.** The whole site works with a keyboard and screen readers, reads clearly,
  and calms its animations for people who prefer less motion.
- **Easy to run.** Every word, price, opening hour and table is in one place, so the menu can
  change without touching the design.

---

## How it's built and delivered

The site is made to be trusted, not just admired. Every change goes through the same path before a
guest ever sees it:

1. **Proposed** on its own branch, never straight to the live site.
2. **Checked automatically** — more than 110 tests, including the "two guests, one table" case
   on a real database.
3. **Previewed** on its own private copy of the site *and* of the database, so testing never
   touches real bookings.
4. **Tried by a robot guest** that opens the preview in a real browser, books a table, finds the
   booking again and cancels it.
5. **Published** only when everything is green — and the database updates itself as part of the
   release.

| Part | Built with |
|---|---|
| Website | Next.js · React · TypeScript |
| Design & motion | Tailwind CSS · GSAP |
| Bookings & data | PostgreSQL (Neon) |
| Emails | Resend |
| Testing | Vitest · Playwright |
| Automation & hosting | GitHub Actions · Vercel |

Everything runs on free plans at this scale.

---

## Try it locally

```bash
npm install
cp .env.example .env.local   # fill in the values described inside
npm run db:migrate
npm run dev                  # http://localhost:3000
```

---

## What's next

- **The kitchen's view** — tonight's tables and pre-orders on one screen for the team
- **A waiting list** — when a moment is full, be told if a table frees up
- **Reminders** — a short note on the morning of your booking

Opening hours, address, prices and tables are demonstration content for now.

---

## License

The source code is released under the [MIT License](LICENSE).
The GIRA name, logo, photographs, video frames and illustrations are **not** covered by that
license — all rights reserved.

<div align="center">
<sub>Designed and built by <a href="https://github.com/siwar224">siwar224</a>.</sub>
</div>
