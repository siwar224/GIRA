import { expect, test } from "@playwright/test";

/**
 * The guest's whole journey, in a real browser, against a Vercel preview:
 * set a table → turn to a time → pick a table → confirm → get a ticket,
 * then find the booking with its code and phone number and cancel it (which also
 * leaves the preview's database as it was).
 */
test("a guest books a table, finds the booking again and cancels it", async ({ page }) => {
  const phone = "+33 6 12 34 56 78";

  await page.goto("/prenota");

  // 1 · A day that isn't today (today may already be past its last booking time).
  await page.locator("label.day:not([data-closed])").nth(1).click();

  // 2 · Wait for live availability, then turn the dial to the first free time.
  await expect(page.locator(".dial-wrap")).not.toHaveAttribute("data-busy", /.*/);
  const dial = page.getByRole("radiogroup", { name: "Time", exact: true });
  await dial.press("ArrowRight");
  await expect(dial.getByRole("radio", { checked: true })).toHaveCount(1);

  // 3 · The first table that is free for two at that time.
  const table = page.locator('.plan__table[data-state="free"]:not([disabled])').first();
  await table.press("Enter");
  await expect(page.locator('.plan__table[aria-pressed="true"]')).toHaveCount(1);

  // 4 · Details, then confirm.
  await page.locator("#book-name").fill("E2E Test");
  await page.locator("#book-phone").fill(phone);
  await page.getByRole("button", { name: "Confirm booking" }).click();

  // The ticket, with a code issued by the server.
  const codeOnTicket = page.locator(".ticket__code");
  await expect(codeOnTicket).toHaveText(/^GIRA-[A-HJ-NP-Z2-9]{8}$/);
  const code = (await codeOnTicket.textContent())!.trim();

  // 5 · Find it again: the link carries the code, the phone proves it's ours.
  await page.getByRole("link", { name: "Manage or cancel" }).click();
  await expect(page).toHaveURL(/\/prenota\/gestisci\?code=/);
  await expect(page.locator("#manage-code")).toHaveValue(code);
  await page.locator("#manage-phone").fill(phone);
  await page.getByRole("button", { name: "Find my booking" }).click();
  await expect(page.locator(".ticket__code")).toHaveText(code);

  // 6 · Cancel it, with the confirmation step.
  await page.getByRole("button", { name: "Cancel this booking" }).click();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Your booking is cancelled/);
});

test("the same code and a wrong phone number find nothing", async ({ page }) => {
  await page.goto("/prenota/gestisci?code=GIRA-ABCD2345");
  await page.locator("#manage-phone").fill("+33 6 00 00 00 00");
  await page.getByRole("button", { name: "Find my booking" }).click();
  // By its text: Next.js adds its own (empty) role="alert" route announcer to every page.
  await expect(page.getByText(/couldn't find a booking/)).toBeVisible();
});
