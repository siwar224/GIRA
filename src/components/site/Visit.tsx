"use client";
import { visit } from "@/content/sections";
import { OpenBadge, useTodayInZone } from "./OpenBadge";
import { Newsletter } from "./Newsletter";
import { SplitHeading } from "./SplitHeading";

export function Visit() {
  const today = useTodayInZone();

  return (
    <footer id={visit.id} className="visit" data-nav-surface="sugo" aria-labelledby="visit-title">
      <div className="visit__grid">
        <div className="visit__intro">
          <p className="eyebrow visit__eyebrow">{visit.eyebrow}</p>
          <SplitHeading id="visit-title" className="section-title">
            {visit.title}
          </SplitHeading>
          <OpenBadge />
        </div>

        <address className="visit__address">
          {visit.address.lines.map((l) => (
            <span key={l}>{l}</span>
          ))}
          <a href={visit.address.mapUrl} target="_blank" rel="noopener noreferrer" className="visit__link">
            {visit.address.mapLabel} <span aria-hidden="true">↗</span>
          </a>
          <a href={visit.phone.href} className="visit__link">
            {visit.phone.display}
          </a>
          <a href={`mailto:${visit.email}`} className="visit__link">
            {visit.email}
          </a>
        </address>

        <div className="visit__hours">
          <h3 className="visit__subtitle">{visit.hoursTitle}</h3>
          <table className="hours">
            <tbody>
              {visit.hours.map((d) => (
                <tr key={d.day} data-today={today === d.day || undefined}>
                  <th scope="row">{d.label}</th>
                  <td className="tabular-nums">
                    {d.ranges.length ? d.ranges.map(([a, b]) => `${a}–${b}`).join(" · ") : visit.closedLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Newsletter />
      </div>

      <p className="wordmark" aria-hidden="true">
        {visit.wordmark}
      </p>
      <p className="visit__legal">{visit.legal}</p>
    </footer>
  );
}
