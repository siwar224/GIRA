/** Canonical origin, from the environment (set NEXT_PUBLIC_SITE_URL in production). No trailing slash. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
