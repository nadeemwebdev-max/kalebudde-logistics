import { useState } from "react";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";

import Seo from "../components/Seo";
import { api } from "../lib/api";

const SERVICES = [
  "Domestic Freight Forwarding",
  "Warehousing",
  "Relocation Services",
  "Project Logistics Management",
];

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await api.post("/api/quotes", Object.fromEntries(fd.entries()));
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again or call us directly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo
        title="Contact Kalebudde Logistics | Get a Free Quote"
        description="Contact Kalebudde Logistics at 75/2B Kalebudde Warehouse Compound, P.B.Road Gabbur Hubli-580029. Phone: +91-8494941838, Email: kalebuddelogistics@gmail.com."
        path="/contact"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          mainEntity: {
            "@type": "Organization",
            name: "Kalebudde Logistics",
            email: "kalebuddelogistics@gmail.com",
            telephone: "+91-8494941838",
            address: {
              "@type": "PostalAddress",
              streetAddress: "75/2B Kalebudde Warehouse Compound, P.B.Road Gabbur",
              addressLocality: "Hubli",
              postalCode: "580029",
              addressRegion: "Karnataka",
              addressCountry: "IN",
            },
          },
        }}
      />

      <section className="bg-brand-900 py-16">
        <div className="container-x">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold text-white sm:text-5xl">
            Get a free quote
          </h1>
          <p className="mt-4 max-w-2xl text-brand-100">
            Tell us what you need to move and our team will get back to you with a
            tailored solution.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-12 py-20 lg:grid-cols-[1fr,380px]">
        <div>
          {sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
              <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
              <h2 className="mt-4 font-display text-2xl font-bold text-emerald-900">
                Thank you — your request is in
              </h2>
              <p className="mt-2 text-emerald-800">
                Our team will contact you shortly with a tailored quote.
              </p>
              <button onClick={() => setSent(false)} className="btn-outline mt-6">
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="name">Full name *</label>
                  <input id="name" name="name" required className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="email">Email *</label>
                  <input id="email" name="email" type="email" required className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="company">Company</label>
                  <input id="company" name="company" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="origin">Pickup location</label>
                  <input id="origin" name="origin" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="destination">Delivery location</label>
                  <input id="destination" name="destination" className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="service">Service required</label>
                  <select id="service" name="service" className="input">
                    <option value="">Select a service</option>
                    {SERVICES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="message">Cargo details / message</label>
                  <textarea id="message" name="message" rows={5} className="input" />
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={busy} className="btn-primary mt-6 w-full sm:w-auto">
                {busy ? "Sending…" : "Request Free Quote"}
              </button>
            </form>
          )}

          {/* Interactive Google Map Box */}
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-900 flex items-center gap-2">
                  <MapPin className="text-accent-500" size={20} /> Kalebudde Warehouse (Google Maps)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  75/2B Kalebudde Warehouse Compound, P.B.Road Gabbur Hubli-580029
                </p>
              </div>
              <a
                href="https://www.google.com/maps/dir//Kalebudde+Warehouse,+845W%2B5X7,+NH+48,+Hubali-Dharwad,+Dharwad,+Narayanapura,+Karnataka+580028/@15.4630869,74.9976658,13z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bb8d78c191e716b:0xc40f9bf617a597e6!2m2!1d75.1474435!2d15.3079081?hl=en-IN&entry=ttu"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary !py-2 !px-4 text-xs shrink-0 flex items-center gap-2"
              >
                <MapPin size={14} /> Get Directions on Google Maps
              </a>
            </div>
            <div className="h-72 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
              <iframe
                title="Kalebudde Warehouse Hubli Google Map Directions Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3848.0673059885816!2d75.1474435!3d15.3079081!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bb8d78c191e716b%3A0xc40f9bf617a597e6!2sKalebudde%20Warehouse!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="flex gap-4 rounded-2xl bg-slate-50 p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-500">
              <MapPin size={19} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Head Office & Warehouse</p>
              <p className="mt-1 font-semibold text-brand-900 leading-snug">
                75/2B Kalebudde Warehouse Compound, P.B.Road Gabbur Hubli-580029
              </p>
              <a
                href="https://www.google.com/maps/dir//Kalebudde+Warehouse,+845W%2B5X7,+NH+48,+Hubali-Dharwad,+Dharwad,+Narayanapura,+Karnataka+580028/@15.4630869,74.9976658,13z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bb8d78c191e716b:0xc40f9bf617a597e6!2m2!1d75.1474435!2d15.3079081?hl=en-IN&entry=ttu"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent-600 hover:underline"
              >
                Get Directions on Google Maps &rarr;
              </a>
            </div>
          </div>

          <div className="flex gap-4 rounded-2xl bg-slate-50 p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-500">
              <Phone size={19} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Mobile Number</p>
              <a href="tel:+918494941838" className="mt-1 block font-semibold text-brand-900 hover:text-accent-500">
                +91-8494941838
              </a>
            </div>
          </div>

          <div className="flex gap-4 rounded-2xl bg-slate-50 p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-500">
              <Mail size={19} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Email</p>
              <a href="mailto:kalebuddelogistics@gmail.com" className="mt-1 block font-semibold text-brand-900 hover:text-accent-500">
                kalebuddelogistics@gmail.com
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-brand-900 p-6 text-brand-100">
            <h2 className="font-display text-lg font-bold text-white">Operating hours</h2>
            <p className="mt-2 text-sm">Monday – Saturday: 9:00 AM – 7:00 PM</p>
            <p className="text-sm">Round-the-clock support for active shipments.</p>
          </div>
        </aside>
      </section>
    </>
  );
}
