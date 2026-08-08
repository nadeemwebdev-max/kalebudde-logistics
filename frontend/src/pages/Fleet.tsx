import { Gauge, MapPin, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";

import Seo from "../components/Seo";

const VEHICLES = [
  {
    name: "32ft Multi-Axle Container",
    capacity: "Up to 15 tonnes",
    use: "Long-haul FMCG, paints and palletised cargo",
    image: "/images/hero-truck-clean.png",
  },
  {
    name: "20ft & 24ft Closed Body",
    capacity: "7 – 10 tonnes",
    use: "Regional distribution and retail replenishment",
    image: "/images/fleet-clean.png",
  },
  {
    name: "Open Body & Trailer",
    capacity: "Project cargo",
    use: "Steel, machinery and over-dimensional consignments",
    image: "/images/warehouse-clean.png",
  },
];

export default function Fleet() {
  return (
    <>
      <Seo
        title="Our Fleet | Kalebudde Logistics Trucks & Vehicles"
        description="Explore the Kalebudde Logistics fleet — 32ft multi-axle containers, closed body trucks and open trailers, GPS tracked and maintained for safe pan-India delivery."
        path="/fleet"
        image="/images/fleet-clean.png"
      />

      <section className="relative overflow-hidden bg-brand-900 py-20">
        <img
          src="/images/fleet-clean.png"
          alt="Row of Kalebudde Logistics branded trucks at a depot"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.tried) {
              target.dataset.tried = "true";
              target.src = "/images/fleet.png";
            }
          }}
        />
        <div className="container-x relative">
          <p className="eyebrow">Our fleet</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold text-white sm:text-5xl">
            Vehicles built for every kind of consignment
          </h1>
          <p className="mt-5 max-w-2xl text-brand-100">
            Every vehicle in the Kalebudde Logistics network is vetted, maintained and
            tracked — so your cargo moves safely and predictably.
          </p>
        </div>
      </section>

      <section className="container-x py-20">
        <div className="grid gap-8 lg:grid-cols-3">
          {VEHICLES.map((v) => (
            <article key={v.name} className="card !p-0 overflow-hidden">
              <img
                src={v.image}
                alt={`${v.name} operated by Kalebudde Logistics`}
                className="h-52 w-full object-cover"
                loading="lazy"
              />
              <div className="p-6">
                <h2 className="font-display text-lg font-bold text-brand-900">{v.name}</h2>
                <p className="mt-1 text-sm font-semibold text-accent-500">{v.capacity}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{v.use}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Truck, "Vetted carriers", "Every partner vehicle is documented and verified."],
            [MapPin, "GPS visibility", "Live location and timestamped tracking events."],
            [ShieldCheck, "Cargo safety", "Trained crews, secure loading and insurance options."],
            [Gauge, "Preventive maintenance", "Scheduled servicing to reduce transit failures."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Truck;
            return (
              <div key={t as string} className="rounded-2xl bg-slate-50 p-6">
                <I size={22} className="text-accent-500" />
                <h3 className="mt-4 font-display font-bold text-brand-900">{t as string}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{d as string}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <Link to="/contact" className="btn-primary">
            Book a vehicle
          </Link>
        </div>
      </section>
    </>
  );
}
