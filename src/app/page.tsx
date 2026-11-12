import { Nav } from "@/components/site/Nav";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { ScrollStage } from "@/components/hero/ScrollStage";
import { footer, intro } from "@/content/site";

export default function HomePage() {
  return (
    <>
      <SmoothScroll />
      <Nav />
      <main id="content">
        <ScrollStage />

        <section id={intro.id} className="intro" data-nav-surface="crema" aria-labelledby="intro-title">
          <div className="intro__inner">
            <p className="eyebrow">{intro.eyebrow}</p>
            <h2 id="intro-title" className="intro__title">
              {intro.title}
            </h2>
            {intro.body.map((p) => (
              <p key={p} className="intro__body">
                {p}
              </p>
            ))}
          </div>
        </section>
      </main>

      <footer id={footer.id} className="footer" data-nav-surface="sugo">
        <p className="footer__line">{footer.line}</p>
        <p className="footer__note">{footer.note}</p>
      </footer>
    </>
  );
}
