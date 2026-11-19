import { describe, expect, it } from "vitest";
import { booking } from "@/content/booking";
import { bookingCancellation, bookingConfirmation } from "@/server/email-templates";

const data = {
  to: "giulia@example.com",
  code: "GIRA-ABCD2345",
  name: "<b>Giulia</b> Rossi",
  date: "2026-11-21",
  time: "19:30",
  guests: 2,
  tableId: "1",
};

describe("booking emails", () => {
  it("confirms with the code, the time, the table and a link to manage the booking", () => {
    const mail = bookingConfirmation(data);
    expect(mail.to).toBe(data.to);
    expect(mail.subject).toContain(data.code);
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain(data.code);
      expect(body).toContain("19:30");
      expect(body).toContain("Table 1");
      expect(body).toContain(`${booking.manage.href}?code=${data.code}`);
    }
  });

  it("never lets a guest's name inject HTML", () => {
    const { html } = bookingConfirmation(data);
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;Giulia&lt;/b&gt;");
  });

  it("confirms a cancellation", () => {
    const mail = bookingCancellation(data);
    expect(mail.subject).toContain("cancelled");
    expect(mail.text).toContain(data.code);
  });
});
