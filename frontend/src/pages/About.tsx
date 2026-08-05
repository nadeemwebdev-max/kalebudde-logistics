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
        image="/images/founder.png"
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

      {/* Hero Header */}
      <section className="bg-brand-950 py-16 text-white">
        <div className="container-x max-w-4xl text-center">
          <p className="eyebrow text-accent-400">About Kalebudde Logistics</p>
          <h1 className="h1 mt-3 text-white">Driven by heritage. Powered by precision.</h1>
          <p className="mt-6 text-lg text-brand-100">
            For over two decades, the Kalebudde family has moved Indian commerce.
            What began as a single warehouse in Hubli has grown into a pan-India freight
            forwarding network trusted by global brands and regional leaders alike.
          </p>
        </div>
      </section>

      {/* Journey & Mission */}
      <section className="container-x grid items-center gap-12 py-20 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Our journey</p>
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

          <div className="mt-8 rounded-2xl border-l-4 border-accent-500 bg-slate-50 p-6 shadow-sm">
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

        <div className="overflow-hidden rounded-2xl shadow-xl bg-slate-100">
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

      {/* Founder Section */}
      <section className="bg-slate-50 py-20 border-y border-slate-200">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[380px,1fr]">
          <figure className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-brand-900 via-brand-950 to-slate-900 p-6 shadow-2xl ring-1 ring-brand-700/40">
            <div className="relative mx-auto flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800/80 to-brand-950/90 p-3 shadow-inner">
              <img
                src="/images/founder.png"
                alt="Farooque Kalebudde, Founder of Kalebudde Logistics"
                className="h-auto max-h-[440px] w-full object-contain drop-shadow-2xl transition duration-300 hover:scale-[1.02]"
                loading="lazy"
                width={800}
                height={1000}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.tried) {
                    target.dataset.tried = "true";
                    target.src = "/images/founder.jpg";
                  }
                }}
              />
            </div>
            <figcaption className="mt-5 text-center">
              <p className="font-display text-xl font-extrabold text-white tracking-tight">
                Farooque Kalebudde
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-accent-400">
                Founder &amp; Managing Director
              </p>
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

            <blockquote className="mt-8 rounded-2xl bg-brand-900 p-7 text-brand-100 shadow-lg">
              <p className="font-display text-lg italic leading-relaxed text-white">
                "Logistics is a promise business. The truck is just how we keep the
                promise."
              </p>
              <footer className="mt-3 text-sm text-accent-400 font-bold">
                — Farooque Kalebudde, Founder &amp; MD
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Experience + Values */}
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
