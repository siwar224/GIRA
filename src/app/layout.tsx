import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { site, seo } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";
import "./sections.css";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: seo.title,
  description: seo.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  icons: { icon: "/brand/gira-icone-app-1024.png", apple: "/brand/gira-icone-app-1024.png" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: `${site.name} — ${site.tagline}`,
    title: seo.title,
    description: seo.description,
    locale: seo.locale,
    images: [{ url: seo.ogImage.src, width: seo.ogImage.width, height: seo.ogImage.height, alt: seo.ogImage.alt }],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: [seo.ogImage.src],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#812116",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body id="top">{children}</body>
    </html>
  );
}
