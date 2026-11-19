import type { Metadata } from "next";
import { Sala } from "@/components/sala/Sala";
import { sala } from "@/content/sala";
import "./sala.css";

export const metadata: Metadata = {
  title: sala.metaTitle,
  // The team's room: nothing here for search engines.
  robots: { index: false, follow: false },
};

export default function SalaPage() {
  return (
    <main id="content" className="sala-page">
      <Sala />
    </main>
  );
}
