import Seo from "../components/Seo";
import { CLIENTS } from "../lib/clients";


export default function Clients() {
  return (
    <>
      <Seo
        title="Our Clients | Kalebudde Logistics"
        description="Kalebudde Logistics is trusted by leading Indian brands including Asian Paints, Cadbury, Indian Oil, TVS Supply Chain, Walkaroo, Parekh Group and DS Group."
        path="/clients"
      />

      <section className="bg-brand-900 py-16 text-center">
        <div className="container-x">
          <p className="eyebrow">Our clients</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold text-white">
            Trusted by India's leading brands
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-brand-100">
            From paints and FMCG to energy and footwear, businesses across sectors rely on
            Kalebudde Logistics to keep their supply chains moving.
          </p>
        </div>
      </section>

      <section className="container-x py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CLIENTS.map((c) => (
            <div key={c.name} className="card text-center flex flex-col items-center justify-between p-6">
              <div className="flex h-32 w-full items-center justify-center rounded-xl bg-slate-50 p-3 border border-slate-100 transition hover:border-brand-200 hover:shadow-md">
                <img
                  src={c.logo}
                  alt={`${c.name} logo`}
                  className="h-24 max-w-[88%] object-contain"
                  loading="lazy"
                />
              </div>
              <div className="mt-4">
                <h2 className="font-display text-lg font-bold text-brand-900">
                  {c.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{c.sector}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-3xl text-center text-sm text-slate-500">
          Client names and logos are the property of their respective owners and are shown
          to represent sectors served by Kalebudde Logistics.
        </p>
      </section>
    </>
  );
}
