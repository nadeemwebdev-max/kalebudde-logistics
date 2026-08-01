import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  MapPin,
  Package,
  Paperclip,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Seo from "../components/Seo";
import {
  api,
  fmtDate,
  STATUS_LABELS,
  STATUS_STYLES,
  type Shipment,
} from "../lib/api";
import { useAuth } from "../lib/auth";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api
      .get<Shipment[]>("/api/shipments")
      .then(({ data }) => setShipments(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredShipments = shipments.filter(
    (s) =>
      !searchTerm ||
      s.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.invoice_number && s.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.lr_number && s.lr_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const inTransitCount = shipments.filter((s) => s.status === "in_transit").length;
  const deliveredCount = shipments.filter((s) => s.status === "delivered").length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased selection:bg-brand-500 selection:text-white">
      <Seo
        title="Client Portal | Kalebudde Logistics"
        description="Real-time consignment tracking and document portal for clients."
        path="/dashboard"
        noindex
      />

      {/* HERO HEADER */}
      <section className="relative border-b border-slate-800 bg-slate-950 py-10 overflow-hidden">
        <div className="absolute top-0 right-10 h-72 w-72 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />

        <div className="container-x relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-400 border border-brand-500/20">
              <ShieldCheck size={13} /> Consignment Portal
            </span>
            <h1 className="mt-3 font-display text-3xl font-black text-white sm:text-4xl">
              Welcome back, {user?.full_name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {user?.company ? <strong className="text-slate-200">{user.company}</strong> : "Client Portal"}{" "}
              · Live tracking &amp; document downloads
            </p>
          </div>

          <div className="flex gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-center">
              <p className="text-2xl font-black text-brand-400">{inTransitCount}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Transit</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-center">
              <p className="text-2xl font-black text-emerald-400">{deliveredCount}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-8 space-y-6">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Tracking #, Invoice, LR, or Destination..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <p className="text-xs text-slate-400">
            Total {filteredShipments.length} consignments linked
          </p>
        </div>

        {/* Consignment Cards / Table */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-12 text-center text-slate-500 animate-pulse">
            Loading your active consignments…
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-12 text-center text-slate-500">
            No consignments match your search query.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Tracking / Route</th>
                    <th className="px-5 py-4">Documents (Invoice &amp; LR)</th>
                    <th className="px-5 py-4">E-Way Bill Details</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredShipments.map((s) => {
                    const isOpen = open === s.id;
                    return (
                      <>
                        <tr
                          key={s.id}
                          className="hover:bg-slate-900/60 transition cursor-pointer"
                          onClick={() => setOpen(isOpen ? null : s.id)}
                        >
                          <td className="px-5 py-4">
                            <span className="font-display text-sm font-black text-white block">
                              {s.tracking_number}
                            </span>
                            <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                              {s.origin} <span className="text-brand-500">➔</span> {s.destination}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-200">Inv: {s.invoice_number || "—"}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-slate-400">LR: {s.lr_number || "—"}</span>
                              {s.lr_copy_url && (
                                <a
                                  href={s.lr_copy_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 rounded-md bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition"
                                >
                                  <Download size={10} /> LR Copy
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-mono font-bold text-slate-200">
                              {s.eway_bill_number || "—"}
                            </p>
                            {s.eway_bill_expiry_date && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Expires: {fmtDate(s.eway_bill_expiry_date)}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className={`badge ${STATUS_STYLES[s.status]}`}>
                              {STATUS_LABELS[s.status]}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(isOpen ? null : s.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-[11px] font-bold text-brand-400 hover:bg-slate-700 transition"
                            >
                              {isOpen ? (
                                <>
                                  Close <ChevronUp size={12} />
                                </>
                              ) : (
                                <>
                                  Journey History <ChevronDown size={12} />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr key={`${s.id}-detail`} className="bg-slate-900/90 border-b border-slate-800">
                            <td colSpan={5} className="px-6 py-6">
                              <div className="grid gap-6 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                                  <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-brand-400">
                                    Consignment Breakdown
                                  </p>
                                  <dl className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                                    <div>
                                      <span className="text-slate-500 block">Consignee</span>
                                      <strong className="text-white">{s.consignee}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Commodity</span>
                                      <strong className="text-white">{s.commodity || "—"}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Weight</span>
                                      <strong className="text-white">
                                        {s.weight_kg ? `${s.weight_kg} kg` : "—"}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Packages</span>
                                      <strong className="text-white">{s.packages ?? "—"}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Assigned Vehicle</span>
                                      <strong className="text-brand-400 font-mono">
                                        {s.vehicle_number || "—"}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Driver Details</span>
                                      <strong className="text-white">
                                        {s.driver_name ? `${s.driver_name} (${s.driver_phone || ""})` : "—"}
                                      </strong>
                                    </div>
                                  </dl>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                                  <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-brand-400">
                                    Tracking Events &amp; Milestones
                                  </p>
                                  <ol className="space-y-3 border-l-2 border-slate-800 pl-4 text-xs">
                                    {[...s.events].reverse().map((ev) => (
                                      <li key={ev.id} className="relative">
                                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-4 ring-slate-950" />
                                        <div className="flex items-center justify-between">
                                          <strong className="text-white">{STATUS_LABELS[ev.status]}</strong>
                                          <span className="text-[10px] text-slate-500">
                                            {fmtDate(ev.occurred_at)}
                                          </span>
                                        </div>
                                        <p className="text-slate-400 mt-0.5 font-medium">{ev.location}</p>
                                        {ev.note && (
                                          <p className="mt-1 text-[11px] text-slate-400 italic">
                                            "{ev.note}"
                                          </p>
                                        )}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
