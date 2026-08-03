import { Award, Heart, Lightbulb, Target } from "lucide-react";

import Seo from "../components/Seo";

const VALUES = [
  ["Customer Focus", "Every plan starts with what the customer actually needs."],
  ["Excellence & Integrity", "We do what we say, and we do it properly."],
  ["Reliability & Teamwork", "Consistent delivery, powered by a coordinated team."],
  ["Innovation & Sustainability", "Better routes, better utilisation, lower impact."],
];

export default function About() {
  return (
    <>
      <Seo
        title="About Kalebudde Logistics | Founded by Farooque Kalebudde"
        description="Kalebudde Logistics, established 2014 and built on Kalebudde Warehousing (1999), is led by founder Farooque Kalebudde. Learn about our mission, values and heritage."
        path="/about"
        image="/images/founder.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          mainEntity: {
            "@type": "Organization",
            name: "Kalebudde Logistics",
            foundingDate: "2014",
            founder: { "@type": "Person", name: "Farooque Kalebudde" },
          },
        }}
      />

      <section className="bg-brand-900 py-16">
        <div className="container-x">
          <p className="eyebrow">Who we are</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            A legacy of efficient logistics solutions
          </h1>
        </div>
      </section>

      <section className="container-x grid items-center gap-12 py-20 lg:grid-cols-2">
        <div>
          <p className="eyebrow">About Kalebudde Logistics</p>
          <h2 className="h2 mt-2">Over two decades of moving Indian business forward</h2>
          <div className="mt-6 space-y-4 leading-relaxed text-slate-600">
            <p>
              Kalebudde Logistics, established in 2014, is a frontrunner in the domestic
              logistics industry in India. Our roots, however, go deeper — tracing back to
              the establishment of Kalebudde Warehousing in 1999.
            </p>
            <p>
              This rich heritage has equipped us with the experience, knowledge and
              resources to provide exceptional logistics solutions for businesses of all
              sizes, from single-truck movements to complex multi-leg projects.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border-l-4 border-accent-500 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-accent-500">
              <Target size={18} />
              <h3 className="font-display font-bold uppercase tracking-wide">Our mission</h3>
            </div>
            <p className="mt-2 leading-relaxed text-slate-700">
              To empower businesses with efficient and reliable logistics solutions that
              streamline their supply chains and operations, consistently exceeding
              customer expectations.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl shadow-xl">
          <img
            src="/images/fleet.png"
            alt="Fleet of Kalebudde Logistics trucks at the company depot"
            className="h-full w-full object-cover"
            loading="lazy"
            width={1568}
            height={784}
          />
        </div>
      </section>

      {/* Founder */}
      <section className="bg-slate-50 py-20">
        <div className="container-x grid items-start gap-12 lg:grid-cols-[380px,1fr]">
          <figure>
            <img
              src="/images/founder.jpg"
              alt="Farooque Kalebudde, Founder of Kalebudde Logistics"
              className="w-full rounded-2xl object-cover shadow-xl"
              loading="lazy"
              width={800}
              height={1000}
            />
            <figcaption className="mt-4 text-center">
              <p className="font-display text-xl font-bold text-brand-900">
                Farooque Kalebudde
              </p>
              <p className="text-sm text-accent-500">Founder &amp; Managing Director</p>
            </figcaption>
          </figure>

          <div>
            <p className="eyebrow">Founder's story</p>
            <h2 className="h2 mt-2">The man behind the movement</h2>
            <div className="mt-6 space-y-4 leading-relaxed text-slate-600">
              <p>
                Farooque Kalebudde is the founder and driving force behind Kalebudde
                Logistics. His journey in the supply chain industry began on the warehouse
                floor, where the family business — Kalebudde Warehousing — was established
                in 1999 to serve manufacturers who needed storage they could rely on.
              </p>
              <p>
                Working across inbound receiving, stock control and dispatch, he came to
                understand a simple truth that still guides the company: a warehouse is
                only as good as the transport that feeds it. Clients repeatedly asked for
                help moving goods once they left the racking, and in 2014 he formalised
                that demand into a dedicated freight forwarding business.
              </p>
              <p>
                Under his leadership, Kalebudde Logistics has grown from a regional
                operator into a pan-India domestic freight forwarder serving clients in
                paints, FMCG, footwear, steel and energy. He has invested consistently in
                three areas: a vetted carrier network, disciplined operating procedures,
                and transparent technology so customers always know where their cargo is.
              </p>
              <p>
                Farooque remains closely involved in day-to-day operations and is known
                among clients for being personally reachable when a shipment needs a
                decision. His philosophy is straightforward — treat every consignment as
                though the business depends on it, because for the customer, it usually
                does.
              </p>
            </div>

            <blockquote className="mt-8 rounded-2xl bg-brand-900 p-7 text-brand-100">
              <p className="font-display text-lg italic leading-relaxed text-white">
                "Logistics is a promise business. The truck is just how we keep the
                promise."
              </p>
              <footer className="mt-3 text-sm text-accent-400">
                — Farooque Kalebudde, Founder
              </footer>
            </blockquote>

            <p className="mt-6 text-xs italic text-slate-400">
              Biography prepared for this website; please share any corrections or
              additional milestones and we will update this section.
            </p>
          </div>
        </div>
      </section>

      {/* Experience + values */}
      <section className="container-x grid gap-8 py-20 md:grid-cols-2">
        <div className="card">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Award size={22} />
          </span>
          <h2 className="font-display text-xl font-bold text-brand-900">
            Extraordinary experiences
          </h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            With years of experience, we foresee potential roadblocks and proactively
            develop solutions to keep your supply chain running smoothly. We believe
            experience is valuable, but continuous learning is paramount — we actively
            seek out new technologies and best practices so you always get the most
            cutting-edge solution.
          </p>
        </div>

        <div className="card">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-accent-500/10 text-accent-500">
            <Heart size={22} />
          </span>
          <h2 className="font-display text-xl font-bold text-brand-900">Our core values</h2>
          <ul className="mt-4 space-y-3">
            {VALUES.map(([title, text]) => (
              <li key={title} className="flex gap-3">
                <Lightbulb size={16} className="mt-1 shrink-0 text-accent-500" />
                <span className="text-sm leading-relaxed text-slate-600">
                  <strong className="text-brand-900">{title}:</strong> {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
