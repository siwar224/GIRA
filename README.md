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
[![Release](https://img.shields.io/github/v/release/siwar224/GIRA?label=release&color=812116)](https://github.com/siwar224/GIRA/releases)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fsiwar224%2Fgira-2496ed?logo=docker&logoColor=white)](https://github.com/siwar224/GIRA/pkgs/container/gira)
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

And when every table is taken? Join the **waiting list**. The moment someone cancels, the first
guests waiting are told by email that a table has freed up.

### 6 · La sala — the room, from the other side

The team has its own view of the evening: the same room guests choose their table in, seen from
behind the pass. As the service moves through the evening, each table lights up with who is
sitting there, how many, the occasion — a birthday, an anniversary — and whether plates were
pre-ordered. One tap shows the details and the dishes the kitchen should have ready. The waiting
list sits alongside, so a freed table never stays empty for long.

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
2. **Checked automatically** — more than 130 tests, including the "two guests, one table" case
   on a real database.
3. **Previewed** on its own private copy of the site *and* of the database, so testing never
   touches real bookings.
4. **Tried by a robot guest** that opens the preview in a real browser, books a table, finds the
   booking again and cancels it.
5. **Tasted before serving.** The new version is built out of sight, checked one last time —
   pages, database, version — and only then shown to guests. If anything is off, guests simply
   keep the previous version.
6. **Recorded** as a numbered release (v1.0, v1.1, …) with a list of what changed, so every
   version can be traced — and returned to.
7. **Packaged** as a ready-to-run Docker image of that same version, published on GitHub
   Packages — the whole restaurant, portable to any server.

| Part | Built with |
|---|---|
| Website | Next.js · React · TypeScript |
| Design & motion | Tailwind CSS · GSAP |
| Bookings & data | PostgreSQL (Neon) |
| Emails | Resend |
| Testing | Vitest · Playwright |
| Automation & hosting | GitHub Actions · Vercel |
| Packaging | Docker · GitHub Packages |

Everything runs on free plans at this scale.

---

## Try it locally

```bash
npm install
cp .env.example .env.local   # fill in the values described inside
npm run db:migrate
npm run dev                  # http://localhost:3000
```

Or run a released version straight from its package, no install needed:

```bash
docker run -p 3000:3000 --env-file .env.local ghcr.io/siwar224/gira:latest
```

---

## What's next

- **Reminders** — a short note on the morning of your booking, with a one-tap way to cancel
- **La sala, live** — tables that change the moment guests arrive, marked by the team as they sit
- **A menu that changes with the market** — today's catch, updated by the kitchen itself

Opening hours, address, prices and tables are demonstration content for now.

---

## License

The source code is released under the [MIT License](LICENSE).
The GIRA name, logo, photographs, video frames and illustrations are **not** covered by that
license — all rights reserved.

<div align="center">
<sub>Designed and built by <a href="https://github.com/siwar224">siwar224</a>.</sub>
</div>
