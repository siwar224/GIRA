# syntax=docker/dockerfile:1
#
# GIRA as a container: the whole site in one small, self-contained image.
# Published to GitHub Packages with every release (see .github/workflows/package.yml).
#
#   docker run -p 3000:3000 --env-file .env.local ghcr.io/siwar224/gira:latest
#
# The image holds no secrets: the database and keys come from the environment at run time.

# ── 1 · Dependencies ─────────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── 2 · Build ────────────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app
# Public address, written into the pages at build time (links, sitemap, emails).
ARG NEXT_PUBLIC_SITE_URL=https://gira-lyart.vercel.app
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── 3 · Run ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Only what the server needs: the standalone build, its static files and the public assets.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Never run as root.
USER node
EXPOSE 3000

# Healthy = the site answers and its database has the expected schema (/api/health).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
