import "server-only";
import { db } from "./db";

/**
 * Adds an address to the list. Signing up twice is not an error and changes nothing, so
 * the response is the same either way and never reveals who is already subscribed.
 * Expects an email already trimmed, lower-cased and validated (see newsletterRequest).
 */
export async function subscribe(email: string): Promise<void> {
  await db()`
    INSERT INTO newsletter_subscribers (email)
    VALUES (${email})
    ON CONFLICT (email) DO NOTHING
  `;
}
