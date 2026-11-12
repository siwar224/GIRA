import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/crea-il-tuo`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/prenota`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  ];
}
