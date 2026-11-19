import type { Metadata } from "next";
import { Nav } from "@/components/site/Nav";
import { ManageBooking } from "@/components/booking/ManageBooking";
import { booking } from "@/content/booking";
import "../booking.css";

export const metadata: Metadata = {
  title: booking.manage.metaTitle,
  description: booking.manage.lead,
  alternates: { canonical: booking.manage.href },
  // A personal page: nothing here for search engines.
  robots: { index: false, follow: false },
};

export default function ManageBookingPage() {
  return (
    <>
      <Nav />
      <main id="content" className="book-page" data-nav-surface="crema">
        <ManageBooking />
      </main>
    </>
  );
}
