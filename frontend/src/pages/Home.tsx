import {
  ArrowRight,
  Boxes,
  Building2,
  Clock,
  Home as HomeIcon,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import Seo from "../components/Seo";
import TrackWidget from "../components/TrackWidget";
import { CLIENTS } from "../lib/clients";

const SERVICES = [
  {
    icon: Truck,
    title: "Domestic Freight Forwarding",
    text: "Land-based transportation across India, designed around your budget, timeline and cargo type.",
  },
  {
    icon: Boxes,
    title: "Warehousing",
    text: "Secure, strategically located storage facilities that keep inventory close to demand.",
  },
  {
    icon: HomeIcon,
    title: "Relocation Services",
    text: "Stress-free home and office relocation handled end-to-end by our specialists.",
  },
  {
    icon: Building2,
    title: "Project Logistics",
    text: "Complex, multi-leg project movements planned and executed from start to finish.",
  },
];

const STATS = [
  ["11+", "Years in logistics"],
  ["1999", "Warehousing legacy"],
  ["Pan-India", "Network coverage"],
  ["24/7", "Operations support"],
];

export default function Home() {
  return (
    <>
      <Seo
        title="Kalebudde Logistics | Domestic Freight Forwarding & Warehousing in India"
        description="Efficient, secure and cost-effective transportation solutions throughout India. Domestic freight forwarding, warehousing, relocation and project logistics since 2014."
        path="/"
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900">
        <img
          src="/images/hero-truck.jpg"
          alt="Kalebudde Logistics branded container truck on an Indian highway at sunset"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          fetchPriority="high"
          width={1536}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/85 to-brand-900/30" />
        <div className="container-x relative py-24 lg:py-32">
          <div className="max-w-2xl animate-fade-up">
            <p className="eyebrow">Kalebudde Logistics</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
              Your Trusted Partner in Domestic Logistics
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-brand-100">
              Efficient, secure and cost-effective transportation solutions throughout
              India — backed by a warehousing legacy that began in 1999.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/contact" className="btn-primary">
                Get a Free Quote <ArrowRight size={16} />
              </Link>
              <Link to="/track" className="btn-ghost">
                Track a Shipment
              </Link>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-brand-900/60 backdrop-blur">
          <div className="container-x grid gap-6 py-8 pb-20 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map(([v, l]) => (
              <div key={l}>
                <p className="font-display text-3xl font-extrabold text-accent-400">{v}</p>
                <p className="mt-1 text-sm text-brand-200">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tracker */}
      <section className="container-x -mt-10 relative z-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
          <h2 className="mb-1 font-display text-xl font-bold text-brand-900">
            Track your consignment
          </h2>
          <p className="mb-5 text-sm text-slate-600">
            Enter your Kalebudde tracking number for live status and full journey history.
          </p>
          <TrackWidget compact />
        </div>
      </section>

      {/* Services */}
      <section className="container-x py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow">What we do</p>
          <h2 className="h2 mt-2">Efficient Solutions Delivered Across India</h2>
          <p className="mt-4 text-slate-600">
            A comprehensive suite of services to streamline your supply chain and ensure
            your goods reach their destination efficiently and cost-effectively.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <article key={s.title} className="card group">
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-accent-500 group-hover:text-white">
                <s.icon size={22} />
              </span>
              <h3 className="font-display text-lg font-bold text-brand-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              <Link
                to="/services"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-500"
              >
                Learn more <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-slate-50 py-20">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl shadow-xl">
            <img
              src="/images/warehouse.jpg"
              alt="Kalebudde Logistics warehouse interior with racking and palletised goods"
              className="h-full w-full object-cover"
              loading="lazy"
              width={1200}
              height={800}
            />
          </div>
          <div>
            <p className="eyebrow">Experience you can trust</p>
            <h2 className="h2 mt-2">Why businesses choose Kalebudde Logistics</h2>
            <ul className="mt-8 space-y-6">
              {[
                [ShieldCheck, "Experience & expertise", "Over a decade of domestic logistics know-how, with roots going back to 1999."],
                [Users, "Nationwide network", "An extensive partner network that connects businesses across every Indian state."],
                [Clock, "Tailored solutions", "Customised transportation plans built around your budget and timeline."],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <li key={title as string} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-500">
                      <I size={20} />
                    </span>
                    <div>
                      <h3 className="font-display font-bold text-brand-900">{title as string}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{text as string}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link to="/about" className="btn-dark mt-9">
              About our company
            </Link>
          </div>
        </div>
      </section>

      {/* Clients marquee */}
      <section className="py-20">
        <div className="container-x mb-10 text-center">
          <p className="eyebrow">Our clients</p>
          <h2 className="h2 mt-2">Trusted by leading Indian brands</h2>
        </div>
        <div className="group relative overflow-hidden">
          <div className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]">
            {[...CLIENTS, ...CLIENTS].map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                className="flex h-28 w-64 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md hover:border-brand-300"
              >
                <img
                  src={c.logo}
                  alt={`${c.name} logo`}
                  className="h-20 max-w-[88%] object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x">
        <div className="relative overflow-hidden rounded-3xl bg-brand-900 px-8 py-16 text-center">
          <img
            src="/images/fleet.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
            loading="lazy"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              Ready to experience efficient logistics?
            </h2>
            <p className="mt-4 text-brand-100">
              Get a free quote today and see how Kalebudde Logistics can tailor a solution
              to your specific needs.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary">
                Request a Free Quote
              </Link>
              <Link to="/services" className="btn-ghost">
                Explore Services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
