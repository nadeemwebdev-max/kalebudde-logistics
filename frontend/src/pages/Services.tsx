import { Check } from "lucide-react";
import { Link } from "react-router-dom";

import Seo from "../components/Seo";

const SERVICES = [
  {
    title: "Domestic Freight Forwarding",
    image: "/images/hero-truck.jpg",
    text: "We offer a variety of land-based transportation options to move your freight across India. Our experienced team designs a customised solution based on your specific needs, considering budget, time constraints and cargo type.",
    points: ["FTL & PTL movements", "Lane-based contract rates", "E-way bill & documentation support"],
  },
  {
    title: "Warehousing",
    image: "/images/warehouse.jpg",
    text: "We provide secure and reliable storage for your inventory. Our warehousing facilities are strategically located across India, ensuring easy access and efficient distribution to your customers.",
    points: ["Strategically located facilities", "Inventory accuracy & cycle counting", "Value-added handling and kitting"],
  },
  {
    title: "Relocation Services",
    image: "/images/fleet.jpg",
    text: "Whether you're moving your home or your office, Kalebudde Logistics can handle everything. Our team of relocation specialists ensures a stress-free and efficient move from packing to placement.",
    points: ["Home & office relocation", "Professional packing crews", "Transit insurance options"],
  },
  {
    title: "Project Logistics Management",
    image: "/images/warehouse.jpg",
    text: "We have the expertise to handle complex logistics projects from start to finish, working closely with you to develop a comprehensive plan for successful execution.",
    points: ["Multi-leg project planning", "Dedicated project coordinator", "Milestone reporting"],
  },
];

const WHY = [
  ["Experience and Expertise", "Over a decade in the logistics industry with the resources to handle any challenge."],
  ["Nationwide Network", "An extensive network of partners ensuring seamless freight movement across India."],
  ["Customised Solutions", "A logistics plan built around your specific requirements and budget."],
  ["Commitment to Quality", "Exceptional service that consistently exceeds expectations."],
];

export default function Services() {
  return (
    <>
      <Seo
        title="Logistics Services in India | Freight, Warehousing & Relocation"
        description="Domestic freight forwarding, warehousing, relocation services and project logistics management across India from Kalebudde Logistics. Get a free quote today."
        path="/services"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: SERVICES.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@type": "Service", name: s.title, description: s.text },
          })),
        }}
      />

      <section className="bg-brand-900 py-16">
        <div className="container-x">
          <p className="eyebrow">Services</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Delivering efficient solutions across India
          </h1>
          <p className="mt-5 max-w-3xl text-brand-100">
            Backed by the experience of Kalebudde Warehousing (est. 1999), we offer a
            comprehensive suite of services to streamline your supply chain and ensure
            your goods reach their destination efficiently and cost-effectively.
          </p>
        </div>
      </section>

      <section className="container-x space-y-20 py-20">
        {SERVICES.map((s, i) => (
          <article
            key={s.title}
            className={`grid items-center gap-10 lg:grid-cols-2 ${
              i % 2 ? "lg:[&>figure]:order-2" : ""
            }`}
          >
            <figure className="overflow-hidden rounded-2xl shadow-xl">
              <img
                src={s.image}
                alt={`${s.title} by Kalebudde Logistics`}
                className="h-72 w-full object-cover transition duration-500 hover:scale-105"
                loading="lazy"
              />
            </figure>
            <div>
              <p className="eyebrow">0{i + 1}</p>
              <h2 className="h2 mt-2">{s.title}</h2>
              <p className="mt-4 leading-relaxed text-slate-600">{s.text}</p>
              <ul className="mt-6 space-y-2.5">
                {s.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Check size={16} className="shrink-0 text-accent-500" /> {p}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="btn-primary mt-8">
                Enquire about this service
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container-x">
          <h2 className="h2 text-center">Why choose Kalebudde Logistics?</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(([t, d]) => (
              <div key={t} className="card">
                <h3 className="font-display font-bold text-brand-900">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <h3 className="font-display text-2xl font-bold text-brand-900">
              Get a free quote today
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Let Kalebudde Logistics take care of your logistics needs and experience the
              difference efficient logistics makes for your business.
            </p>
            <Link to="/contact" className="btn-primary mt-7">
              Contact our team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
