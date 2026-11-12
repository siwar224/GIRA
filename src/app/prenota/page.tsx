import type { Metadata } from "next";
import { Nav } from "@/components/site/Nav";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { booking } from "@/content/booking";
import "./booking.css";

export const metadata: Metadata = {
  title: booking.page.metaTitle,
  description: booking.page.metaDescription,
  alternates: { canonical: "/prenota" },
  openGraph: { title: booking.page.metaTitle, description: booking.page.metaDescription, url: "/prenota" },
};

export default function BookingPage() {
  return (
    <>
      <Nav />
      <main id="content" className="book-page" data-nav-surface="crema">
        <BookingFlow />
      </main>
    </>
  );
}
