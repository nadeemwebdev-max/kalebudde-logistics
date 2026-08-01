import { useState } from "react";
import { CheckCircle2, Circle, Loader2, PackageSearch } from "lucide-react";

import {
  api,
  fmtDate,
  STATUS_LABELS,
  STATUS_STYLES,
  type ShipmentStatus,
  type TrackingEvent,
} from "../lib/api";

interface PublicResult {
  tracking_number: string;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  eta: string | null;
  events: TrackingEvent[];
}

export default function TrackWidget({ compact = false }: { compact?: boolean }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<PublicResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.get<PublicResult>(`/api/track/${code.trim()}`);
      setResult(data);
    } catch {
      setError("We could not find that tracking number. Please check and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "" : "mx-auto max-w-3xl"}>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <PackageSearch
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter tracking number e.g. KL100000001"
            aria-label="Tracking number"
            className="input !pl-11"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary sm:w-40">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Track Shipment"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {result && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-lg animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Tracking number
              </p>
              <p className="font-display text-lg font-bold text-brand-900">
                {result.tracking_number}
              </p>
            </div>
            <span className={`badge ${STATUS_STYLES[result.status]}`}>
              {STATUS_LABELS[result.status]}
            </span>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-3">
            {[
              ["Origin", result.origin],
              ["Destination", result.destination],
              ["Estimated delivery", fmtDate(result.eta)],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs uppercase tracking-wider text-slate-500">{k}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{v}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 px-6 py-5">
            <p className="mb-4 text-sm font-bold text-brand-900">Shipment journey</p>
            <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
              {[...result.events].reverse().map((ev, i) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[31px] top-0.5 bg-white">
                    {i === 0 ? (
                      <CheckCircle2 size={18} className="text-accent-500" />
                    ) : (
                      <Circle size={18} className="text-slate-300" />
                    )}
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {STATUS_LABELS[ev.status]} — {ev.location}
                  </p>
                  {ev.note && <p className="text-sm text-slate-600">{ev.note}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">{fmtDate(ev.occurred_at)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
