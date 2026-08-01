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
        description="Contact Kalebudde Logistics for a free logistics quote. Domestic freight forwarding, warehousing and relocation services across India."
        path="/contact"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          mainEntity: {
            "@type": "Organization",
            name: "Kalebudde Logistics",
            email: "info@kalebuddelogistics.in",
            telephone: "+91-98450-00000",
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
        </div>

        <aside className="space-y-4">
          {[
            [MapPin, "Office", "Bengaluru, Karnataka, India"],
            [Phone, "Phone", "+91 98450 00000"],
            [Mail, "Email", "info@kalebuddelogistics.in"],
          ].map(([Icon, label, value]) => {
            const I = Icon as typeof Mail;
            return (
              <div key={label as string} className="flex gap-4 rounded-2xl bg-slate-50 p-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-500">
                  <I size={19} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    {label as string}
                  </p>
                  <p className="mt-1 font-semibold text-brand-900">{value as string}</p>
                </div>
              </div>
            );
          })}
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
