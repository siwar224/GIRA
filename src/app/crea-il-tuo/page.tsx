import type { Metadata } from "next";
import { Nav } from "@/components/site/Nav";
import { CreaBuilder } from "@/components/crea/CreaBuilder";
import { crea } from "@/content/crea";
import "./crea.css";

export const metadata: Metadata = {
  title: crea.page.metaTitle,
  description: crea.page.metaDescription,
  alternates: { canonical: "/crea-il-tuo" },
  openGraph: { title: crea.page.metaTitle, description: crea.page.metaDescription, url: "/crea-il-tuo" },
};

export default function CreaPage() {
  return (
    <>
      <Nav />
      <main id="content" className="crea-page" data-nav-surface="crema">
        <CreaBuilder />
      </main>
    </>
  );
}
