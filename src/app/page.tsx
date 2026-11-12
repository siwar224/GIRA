import { Nav } from "@/components/site/Nav";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { ScrollStage } from "@/components/hero/ScrollStage";
import { Marquee } from "@/components/site/Marquee";
import { Story } from "@/components/site/Story";
import { Menu } from "@/components/site/Menu";
import { Quote } from "@/components/site/Quote";
import { Visit } from "@/components/site/Visit";
import { site, seo } from "@/content/site";
import { visit } from "@/content/sections";
import { siteUrl } from "@/lib/site-url";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** schema.org Restaurant, built from the same content files as the page. */
function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: `${site.name} — ${site.tagline}`,
    description: seo.description,
    url: siteUrl,
    image: `${siteUrl}${seo.ogImage.src}`,
    servesCuisine: ["Italian", "Seafood"],
    telephone: visit.phone.display,
    email: visit.email,
    address: { "@type": "PostalAddress", streetAddress: visit.address.lines.join(", ") },
    openingHoursSpecification: visit.hours.flatMap((d) =>
      d.ranges.map(([opens, closes]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_NAMES[d.day],
        opens,
        closes,
      })),
    ),
  };
}

export default function HomePage() {
  return (
    <>
      <SmoothScroll />
      <Nav />
      <main id="content">
        <ScrollStage />
        <Marquee />
        <Story />
        <Menu />
        <Quote />
      </main>
      <Visit />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
