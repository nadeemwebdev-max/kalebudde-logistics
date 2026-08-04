import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Inbox,
  Package,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import Seo from "../components/Seo";
import {
  api,
  fmtDate,
  getTelegramConfig,
  notifyEwayExpiry,
  saveTelegramConfig,
  STATUS_LABELS,
  STATUS_STYLES,
  testTelegram,
  uploadLrCopy,
  type BlogPost,
  type Shipment,
  type ShipmentStatus,
  type User,
} from "../lib/api";
import { useAuth } from "../lib/auth";

const STATUSES: ShipmentStatus[] = [
  "booked",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "on_hold",
  "cancelled",
];

interface Stats {
  total_shipments: number;
  in_transit: number;
  delivered: number;
  on_hold: number;
  open_quotes: number;
  total_clients: number;
}

interface Quote {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  service: string | null;
  origin: string | null;
  destination: string | null;
  message: string | null;
  handled: boolean;
  created_at: string;
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md animate-fade-in">
      <div className="my-8 w-full max-w-2xl overflow-hidden rounded-3xl bg-white p-7 shadow-2xl ring-1 ring-slate-900/10">
        <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-xl font-extrabold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<"overview" | "shipments" | "quotes" | "blog" | "users">(
    "overview"
  );

  const [stats, setStats] = useState<Stats | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<
    null | "shipment" | "edit_shipment" | "event" | "post" | "user" | "telegram_settings"
  >(null);
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [toast, setToast] = useState("");
  const [uploadingLr, setUploadingLr] = useState(false);
  const [uploadedLrUrl, setUploadedLrUrl] = useState<string | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Telegram Config State
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgThreshold, setTgThreshold] = useState(48);
  const [tgTesting, setTgTesting] = useState(false);
  const [notifyingEway, setNotifyingEway] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 4000);
  };

  const load = useCallback(async () => {
    const [st, sh, qt, bl, tg] = await Promise.allSettled([
      api.get<Stats>("/api/stats"),
      api.get<Shipment[]>("/api/shipments?limit=200"),
      api.get<Quote[]>("/api/quotes"),
      api.get<BlogPost[]>("/api/blog?limit=50"),
      getTelegramConfig(),
    ]);
    if (st.status === "fulfilled") setStats(st.value.data);
    if (sh.status === "fulfilled") setShipments(sh.value.data);
    if (qt.status === "fulfilled") setQuotes(qt.value.data);
    if (bl.status === "fulfilled") setPosts(bl.value.data);
    if (tg.status === "fulfilled") {
      setTgBotToken(tg.value.bot_token || "");
      setTgChatId(tg.value.chat_id || "");
      setTgThreshold(tg.value.threshold_hours || 48);
    }
    if (isAdmin) {
      try {
        setUsers((await api.get<User[]>("/api/users")).data);
      } catch {
        /* ignore */
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  // Handle LR Copy File Upload
  async function handleLrFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLr(true);
      const res = await uploadLrCopy(file);
      setUploadedLrUrl(res.lr_copy_url);
      flash("LR Copy document uploaded successfully!");
    } catch (err: any) {
      alert("Failed to upload LR Copy: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingLr(false);
    }
  }

  async function createShipment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries()) as any;
    Object.keys(fd).forEach((k) => fd[k] === "" && delete fd[k]);
    if (fd.weight_kg) fd.weight_kg = Number(fd.weight_kg);
    if (fd.packages) fd.packages = Number(fd.packages);
    if (fd.client_id) fd.client_id = Number(fd.client_id);
    if (uploadedLrUrl) fd.lr_copy_url = uploadedLrUrl;
    if (fd.eway_bill_date) fd.eway_bill_date = new Date(fd.eway_bill_date).toISOString();
    if (fd.eway_bill_expiry_date)
      fd.eway_bill_expiry_date = new Date(fd.eway_bill_expiry_date).toISOString();

    await api.post("/api/shipments", fd);
    setModal(null);
    setUploadedLrUrl(null);
    flash("Shipment created successfully");
    load();
  }

  async function updateShipment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeShipment) return;
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries()) as any;
    Object.keys(fd).forEach((k) => fd[k] === "" && delete fd[k]);
    if (fd.weight_kg) fd.weight_kg = Number(fd.weight_kg);
    if (fd.packages) fd.packages = Number(fd.packages);
    if (fd.client_id) fd.client_id = Number(fd.client_id);
    if (uploadedLrUrl) fd.lr_copy_url = uploadedLrUrl;
    if (fd.eway_bill_date) fd.eway_bill_date = new Date(fd.eway_bill_date).toISOString();
    if (fd.eway_bill_expiry_date)
      fd.eway_bill_expiry_date = new Date(fd.eway_bill_expiry_date).toISOString();

    await api.patch(`/api/shipments/${activeShipment.id}`, fd);
    setModal(null);
    setActiveShipment(null);
    setUploadedLrUrl(null);
    flash("Shipment details updated");
    load();
  }

  async function handleTriggerTelegramNotify() {
    try {
      setNotifyingEway(true);
      const res = await notifyEwayExpiry();
      if (!res.telegram_configured) {
        alert(
          "Telegram Bot is not configured yet! Click 'Bot Settings' to add your Token and Chat ID."
        );
        setModal("telegram_settings");
        return;
      }
      flash(`Dispatched ${res.sent_count} Telegram alert(s) for near-expiry E-Way Bills!`);
    } catch (err: any) {
      alert("Failed to send Telegram alerts: " + (err.response?.data?.detail || err.message));
    } finally {
      setNotifyingEway(false);
    }
  }

  async function handleTestTelegram() {
    try {
      setTgTesting(true);
      await testTelegram(tgBotToken, tgChatId);
      flash("Test message sent to Telegram successfully!");
    } catch (err: any) {
      alert("Telegram Test Error: " + (err.response?.data?.detail || err.message));
    } finally {
      setTgTesting(false);
    }
  }

  async function handleSaveTelegramSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveTelegramConfig(tgBotToken, tgChatId, tgThreshold);
      flash("Telegram Bot configuration saved!");
      setModal(null);
    } catch (err: any) {
      alert("Failed to save settings: " + (err.response?.data?.detail || err.message));
    }
  }

  async function addEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeShipment) return;
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api.post(`/api/shipments/${activeShipment.id}/events`, fd);
    setModal(null);
    setActiveShipment(null);
    flash("Tracking event added");
    load();
  }

  async function createPost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries()) as any;
    Object.keys(fd).forEach((k) => fd[k] === "" && delete fd[k]);
    await api.post("/api/blog", fd);
    setModal(null);
    flash("Article published");
    load();
  }

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    await api.post("/api/users", fd);
    setModal(null);
    flash("User created");
    load();
  }

  const nearExpiryCount = shipments.filter((s) => {
    if (s.status === "delivered" || s.status === "cancelled" || !s.eway_bill_expiry_date)
      return false;
    const exp = new Date(s.eway_bill_expiry_date).getTime();
    const diffHours = (exp - Date.now()) / (1000 * 3600);
    return diffHours <= 48;
  }).length;

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      s.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.invoice_number && s.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.lr_number && s.lr_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.eway_bill_number && s.eway_bill_number.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "near_expiry") {
      if (s.status === "delivered" || s.status === "cancelled" || !s.eway_bill_expiry_date)
        return false;
      const exp = new Date(s.eway_bill_expiry_date).getTime();
      return (exp - Date.now()) / (1000 * 3600) <= 48;
    }
    return matchesSearch && s.status === statusFilter;
  });

  const TABS = [
    ["overview", "Overview"],
    ["shipments", "Shipments & Docs"],
    ["quotes", "Quote Requests"],
    ["blog", "Blog"],
    ...(isAdmin ? [["users", "Users"]] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased selection:bg-brand-500 selection:text-white">
      <Seo
        title="Management Dashboard | Kalebudde Logistics"
        description="Enterprise Logistics Management System with E-Way Bill tracking and Telegram automated alerts."
        path="/admin"
        noindex
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-2.5 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-white shadow-2xl shadow-emerald-900/50 animate-bounce">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}

      {/* HERO HEADER */}
      <header className="relative border-b border-slate-800 bg-slate-950 py-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="container-x relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-400 border border-brand-500/20">
                <Sparkles size={13} /> Kalebudde Enterprise OS v2.0
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-400">
                Live Server
              </span>
            </div>

            <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              {isAdmin ? "Administrator Control Center" : "Operations Portal"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Welcome back, <strong className="text-slate-200">{user?.full_name}</strong> · Role:{" "}
              <span className="capitalize text-brand-400">{user?.role}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerTelegramNotify}
              disabled={notifyingEway}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-lg ${
                nearExpiryCount > 0
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              <BellRing
                size={16}
                className={nearExpiryCount > 0 ? "animate-bounce text-slate-950" : "text-brand-400"}
              />
              {notifyingEway
                ? "Sending..."
                : `Telegram Alerts (${nearExpiryCount})`}
            </button>

            <button
              onClick={() => setModal("telegram_settings")}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              <Settings size={15} className="text-slate-400" /> Bot Settings
            </button>

            <button
              onClick={() => {
                setUploadedLrUrl(null);
                setModal("shipment");
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-brand-600/30 hover:brightness-110 transition"
            >
              <Plus size={16} /> New Shipment
            </button>
          </div>
        </div>
      </header>

      {/* Near Expiry Banner Notification */}
      {nearExpiryCount > 0 && (
        <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-600/15 to-transparent py-3">
          <div className="container-x flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2.5 font-medium">
              <ShieldAlert size={18} className="text-amber-400 shrink-0" />
              <span>
                <strong>Urgent Compliance Alert:</strong> {nearExpiryCount} active shipment(s) have
                E-Way Bills expiring within 48 hours or already expired!
              </span>
            </div>
            <button
              onClick={handleTriggerTelegramNotify}
              disabled={notifyingEway}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              <Send size={13} /> Send Telegram Alerts Now
            </button>
          </div>
        </div>
      )}

      {/* SUB-NAVIGATION TABS */}
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="container-x flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto py-2">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k as typeof tab)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  tab === k
                    ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="container-x mt-6 space-y-6">
        {/* OVERVIEW TAB */}
        {tab === "overview" && stats && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [
                  Package,
                  "Total Consignments",
                  stats.total_shipments,
                  "Registered shipments in system",
                  "from-blue-500/20 to-brand-500/10 text-brand-400 border-brand-500/30",
                ],
                [
                  Truck,
                  "In Transit",
                  stats.in_transit,
                  "Active on-road movements",
                  "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30",
                ],
                [
                  CheckCircle2,
                  "Delivered",
                  stats.delivered,
                  "Successfully completed",
                  "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30",
                ],
                [
                  ShieldAlert,
                  "E-Way Expiry Risk",
                  nearExpiryCount,
                  "Expiring within 48 hours",
                  nearExpiryCount > 0
                    ? "from-amber-500/30 to-red-500/20 text-amber-400 border-amber-500/40 animate-pulse"
                    : "from-slate-800 to-slate-900 text-slate-400 border-slate-800",
                ],
                [
                  Inbox,
                  "Open Quotes",
                  stats.open_quotes,
                  "Pending freight inquiries",
                  "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30",
                ],
                [
                  Users,
                  "Client Accounts",
                  stats.total_clients,
                  "Active client logins",
                  "from-slate-800 to-slate-800 text-slate-300 border-slate-700",
                ],
              ].map(([Icon, label, value, sub, cls]) => {
                const I = Icon as typeof Package;
                return (
                  <div
                    key={label as string}
                    className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-lg transition hover:scale-[1.01] ${cls as string}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                        {label as string}
                      </p>
                      <span className="rounded-xl bg-slate-900/60 p-2.5 shadow-inner">
                        <I size={18} />
                      </span>
                    </div>
                    <p className="mt-3 font-display text-3xl font-black text-white">
                      {value as number}
                    </p>
                    <p className="mt-1 text-[11px] opacity-70">{sub as string}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions & Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-1 items-center gap-3 min-w-[280px]">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tracking #, invoice, LR, consignee, route..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="near_expiry">⚠️ Near Expiry (&lt;48h)</option>
                    <option value="in_transit">In Transit</option>
                    <option value="booked">Booked</option>
                    <option value="on_hold">On Hold</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Showing {filteredShipments.length} consignments</span>
              </div>
            </div>

            {/* Shipment Table */}
            <ShipmentTable
              shipments={filteredShipments}
              onEvent={(s) => {
                setActiveShipment(s);
                setModal("event");
              }}
              onEdit={(s) => {
                setActiveShipment(s);
                setUploadedLrUrl(s.lr_copy_url);
                setModal("edit_shipment");
              }}
              onDelete={async (id) => {
                await api.delete(`/api/shipments/${id}`);
                flash("Shipment deleted");
                load();
              }}
            />
          </>
        )}

        {/* SHIPMENTS TAB */}
        {tab === "shipments" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by Tracking No, Invoice, LR, E-Way Bill, Consignee..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="near_expiry">⚠️ Expiring E-Way Bills</option>
                <option value="in_transit">In Transit</option>
                <option value="booked">Booked</option>
                <option value="on_hold">On Hold</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <ShipmentTable
              shipments={filteredShipments}
              onEvent={(s) => {
                setActiveShipment(s);
                setModal("event");
              }}
              onEdit={(s) => {
                setActiveShipment(s);
                setUploadedLrUrl(s.lr_copy_url);
                setModal("edit_shipment");
              }}
              onDelete={async (id) => {
                await api.delete(`/api/shipments/${id}`);
                flash("Shipment deleted");
                load();
              }}
            />
          </div>
        )}

        {/* QUOTES TAB */}
        {tab === "quotes" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Quote Inquiries &amp; Customer Messages</h2>
              {quotes.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No quote requests submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  {quotes.map((q) => (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 transition ${
                        q.handled ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-slate-300 shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{q.name}</span>
                          {q.company && <span className="text-xs text-slate-500 ml-2">({q.company})</span>}
                          <div className="text-xs text-slate-500 mt-0.5 flex gap-4">
                            <span>📧 {q.email}</span>
                            {q.phone && <span>📞 {q.phone}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleQuoteHandled(q)}
                          className={`self-start sm:self-auto rounded-xl px-3 py-1.5 text-xs font-bold border transition ${
                            q.handled
                              ? "bg-slate-200 text-slate-700 border-slate-300"
                              : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          }`}
                        >
                          {q.handled ? "✓ Mark Pending" : "Mark Handled"}
                        </button>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-slate-700">{q.message || "No specific message provided."}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BLOG */}
        {tab === "blog" && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-display text-base font-bold text-slate-900">Blog Articles ({posts.length})</h2>
              <button
                onClick={() => setModal("post")}
                className="rounded-xl bg-brand-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-brand-800"
              >
                + New Article
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">{p.author}</span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{p.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3">{p.excerpt}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>{fmtDateOnly(p.published_at)}</span>
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-brand-600 font-bold hover:underline flex items-center gap-1">
                      View <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: USERS (ADMIN ONLY) */}
        {tab === "users" && isAdmin && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-display text-base font-bold text-slate-900">Team Accounts &amp; Access Roles</h2>
              <button
                onClick={() => setModal("user")}
                className="rounded-xl bg-brand-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-brand-800"
              >
                + Add User
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{u.company || "—"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : u.role === "staff"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-emerald-600">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* UPLOAD EXCEL MODAL */}
      {modal === "upload_excel" && (
        <Modal
          title="Upload Excel or CSV Consignment File"
          subtitle="Import multiple shipments directly into database from Excel (.xlsx, .xls) or CSV"
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <FileSpreadsheet size={44} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-bold text-slate-800">Choose an Excel (.xlsx / .xls) or CSV file</p>
              <p className="text-xs text-slate-500 mt-1">
                Standard headers: INVOICE, INVOICE DATE, E-WAY BILL NUMBER, E-WAY BILL DATE, E-WAY BILL EXPIRY DATE, E-WAY BILL STATUS, NEW EXTENDED E-WAY BILL DATE, ORIGIN, DESTINATION, CONSIGNOR, CONSIGNEE, DRIVER NAME, DRIVER NO, DELIVERY STATUS
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelImport}
                disabled={uploadingExcel}
                className="mt-4 block w-full text-xs text-slate-500 file:mx-auto file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-6 file:py-2.5 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-700"
              />
              {uploadingExcel && (
                <p className="mt-3 text-xs font-bold text-emerald-700 animate-pulse">
                  Parsing and importing shipments into database...
                </p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* TELEGRAM SETTINGS MODAL */}
      {modal === "telegram_settings" && (
        <Modal
          title="Telegram Bot Alert Settings"
          subtitle="Configure bot token & chat ID for automated 24h E-way bill expiry alerts"
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveTgConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Bot Token *
              </label>
              <input
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
                placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 font-mono text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Chat ID *
              </label>
              <input
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                placeholder="e.g. -100123456789 or @channelname"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 font-mono text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Near Expiry Threshold (Hours)
              </label>
              <input
                type="number"
                value={tgThreshold}
                onChange={(e) => setTgThreshold(Number(e.target.value))}
                min={1}
                max={168}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={testTgBot}
                disabled={tgTesting || !tgBotToken || !tgChatId}
                className="flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-800 hover:bg-brand-100 disabled:opacity-50"
              >
                <Send size={14} /> Send Test Message
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button className="rounded-xl bg-brand-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-brand-800">
                  Save Config
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE SHIPMENT MODAL */}
      {modal === "shipment" && (
        <Modal title="Create New Consignment" onClose={() => setModal(null)}>
          <form onSubmit={createShipment} className="grid gap-4 sm:grid-cols-2 text-slate-800">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Invoice Number</label>
              <input name="invoice_number" required placeholder="e.g. INV-2026-9901" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Invoice Date</label>
              <input name="invoice_date" type="date" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">E-Way Bill Number</label>
              <input name="eway_bill_number" required placeholder="e.g. 311099214566" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">E-Way Bill Date</label>
              <input name="eway_bill_date" type="date" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">E-Way Bill Expiry Date</label>
              <input name="eway_bill_expiry_date" type="datetime-local" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">E-Way Bill Status</label>
              <select name="eway_bill_status" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 font-semibold">
                <option value="VEHICLE NUMBER UPDATED">VEHICLE NUMBER UPDATED</option>
                <option value="NEAR EXPIRY ALERT BEFORE 24 HR">NEAR EXPIRY ALERT BEFORE 24 HR</option>
                <option value="PENDING EXTENTION">PENDING EXTENTION</option>
                <option value="EXTENDED">EXTENDED</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">New Extended E-Way Bill Date</label>
              <input name="new_extended_eway_bill_date" type="date" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Origin City *</label>
              <input name="origin" required placeholder="e.g. Hubli, KA" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Destination City *</label>
              <input name="destination" required placeholder="e.g. Bengaluru, KA" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Consignor Name *</label>
              <input name="consignor" required placeholder="e.g. Asian Paints Hubli Depot" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Consignee Name *</label>
              <input name="consignee" required placeholder="e.g. Sri Venkateshwara Traders" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Driver Name</label>
              <input name="driver_name" placeholder="e.g. Ramesh Kumar" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Driver Mobile No</label>
              <input name="driver_phone" placeholder="e.g. +91 98450 12345" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Delivery Status</label>
              <select name="status" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 font-semibold">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Paperclip size={14} className="text-brand-600" /> Attach LR Copy Document
              </label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleLrFileUpload} className="mt-1 block w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white" />
              {uploadedLrUrl && (
                <p className="mt-1 text-xs font-bold text-emerald-600">✓ LR Attached: {uploadedLrUrl}</p>
              )}
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button className="rounded-xl bg-brand-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-brand-800">Create Shipment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT SHIPMENT MODAL */}
      {modal === "edit_shipment" && activeShipment && (
        <Modal title={`Edit Shipment · ${activeShipment.tracking_number}`} onClose={() => setModal(null)}>
          <form onSubmit={updateShipment} className="grid gap-4 sm:grid-cols-2 text-slate-800">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Invoice Number</label>
              <input name="invoice_number" defaultValue={activeShipment.invoice_number || ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Invoice Date</label>
              <input name="invoice_date" type="date" defaultValue={activeShipment.invoice_date ? new Date(activeShipment.invoice_date).toISOString().slice(0,10) : ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">E-Way Bill Number</label>
              <input name="eway_bill_number" defaultValue={activeShipment.eway_bill_number || ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">E-Way Bill Date</label>
              <input name="eway_bill_date" type="date" defaultValue={activeShipment.eway_bill_date ? new Date(activeShipment.eway_bill_date).toISOString().slice(0,10) : ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">E-Way Bill Expiry Date</label>
              <input name="eway_bill_expiry_date" type="datetime-local" defaultValue={activeShipment.eway_bill_expiry_date ? new Date(activeShipment.eway_bill_expiry_date).toISOString().slice(0,16) : ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">E-Way Bill Status</label>
              <select name="eway_bill_status" defaultValue={activeShipment.eway_bill_status || "VEHICLE NUMBER UPDATED"} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 font-semibold">
                <option value="VEHICLE NUMBER UPDATED">VEHICLE NUMBER UPDATED</option>
                <option value="NEAR EXPIRY ALERT BEFORE 24 HR">NEAR EXPIRY ALERT BEFORE 24 HR</option>
                <option value="PENDING EXTENTION">PENDING EXTENTION</option>
                <option value="EXTENDED">EXTENDED</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">New Extended E-Way Bill Date</label>
              <input name="new_extended_eway_bill_date" type="date" defaultValue={activeShipment.new_extended_eway_bill_date ? new Date(activeShipment.new_extended_eway_bill_date).toISOString().slice(0,10) : ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Origin City</label>
              <input name="origin" defaultValue={activeShipment.origin} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Destination City</label>
              <input name="destination" defaultValue={activeShipment.destination} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Consignor Name</label>
              <input name="consignor" defaultValue={activeShipment.consignor} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Consignee Name</label>
              <input name="consignee" defaultValue={activeShipment.consignee} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Driver Name</label>
              <input name="driver_name" defaultValue={activeShipment.driver_name || ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Driver Mobile No</label>
              <input name="driver_phone" defaultValue={activeShipment.driver_phone || ""} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Delivery Status</label>
              <select name="status" defaultValue={activeShipment.status} className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 font-semibold">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button className="rounded-xl bg-brand-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-brand-800">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

{/* ULTRA-READABLE LIGHT UI SPREADSHEET TABLE WITH 14 COLUMNS & ADMIN DELETE ENFORCEMENT */}
function ShipmentTable({
  shipments,
  userRole,
  onEvent,
  onEdit,
  onDelete,
}: {
  shipments: Shipment[];
  userRole?: string;
  onEvent: (s: Shipment) => void;
  onEdit: (s: Shipment) => void;
  onDelete: (id: number) => void;
}) {
  const isAdmin = userRole === "admin";

  if (shipments.length === 0)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
        No consignment records found matching your search.
      </div>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-4 py-3.5">INVOICE</th>
              <th className="px-4 py-3.5">INVOICE DATE</th>
              <th className="px-4 py-3.5">E-WAY BILL NUMBER</th>
              <th className="px-4 py-3.5">E-WAY BILL DATE</th>
              <th className="px-4 py-3.5">E-WAY BILL EXPIRY DATE</th>
              <th className="px-4 py-3.5">E-WAY BILL STATUS</th>
              <th className="px-4 py-3.5">NEW EXTENDED DATE</th>
              <th className="px-4 py-3.5">ORIGIN</th>
              <th className="px-4 py-3.5">DESTINATION</th>
              <th className="px-4 py-3.5">CONSIGNOR</th>
              <th className="px-4 py-3.5">CONSIGNEE</th>
              <th className="px-4 py-3.5">DRIVER NAME</th>
              <th className="px-4 py-3.5">DRIVER NO</th>
              <th className="px-4 py-3.5">DELIVERY STATUS</th>
              <th className="px-4 py-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {shipments.map((s) => {
              const ewayStyle =
                EWAY_STATUS_STYLES[s.eway_bill_status || "VEHICLE NUMBER UPDATED"] ||
                "bg-slate-100 text-slate-700 border-slate-200";

              return (
                <tr key={s.id} className="hover:bg-slate-50/80 transition">
                  {/* INVOICE */}
                  <td className="px-4 py-3.5 font-mono font-bold text-brand-900">
                    {s.invoice_number || "—"}
                  </td>

                  {/* INVOICE DATE */}
                  <td className="px-4 py-3.5 text-slate-600">
                    {fmtDateOnly(s.invoice_date)}
                  </td>

                  {/* E-WAY BILL NUMBER */}
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                    {s.eway_bill_number || "—"}
                  </td>

                  {/* E-WAY BILL DATE */}
                  <td className="px-4 py-3.5 text-slate-600">
                    {fmtDateOnly(s.eway_bill_date)}
                  </td>

                  {/* E-WAY BILL EXPIRY DATE */}
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    {fmtDate(s.eway_bill_expiry_date)}
                  </td>

                  {/* E-WAY BILL STATUS */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${ewayStyle}`}>
                      {s.eway_bill_status || "VEHICLE NUMBER UPDATED"}
                    </span>
                  </td>

                  {/* NEW EXTENDED DATE */}
                  <td className="px-4 py-3.5 text-slate-600 font-medium">
                    {fmtDateOnly(s.new_extended_eway_bill_date)}
                  </td>

                  {/* ORIGIN */}
                  <td className="px-4 py-3.5 font-semibold text-slate-700">
                    {s.origin}
                  </td>

                  {/* DESTINATION */}
                  <td className="px-4 py-3.5 font-semibold text-slate-700">
                    {s.destination}
                  </td>

                  {/* CONSIGNOR */}
                  <td className="px-4 py-3.5 text-slate-700 font-medium">
                    {s.consignor}
                  </td>

                  {/* CONSIGNEE */}
                  <td className="px-4 py-3.5 text-slate-700 font-bold">
                    {s.consignee}
                  </td>

                  {/* DRIVER NAME */}
                  <td className="px-4 py-3.5 text-slate-600 font-medium">
                    {s.driver_name || "—"}
                  </td>

                  {/* DRIVER NO */}
                  <td className="px-4 py-3.5 text-slate-600 font-mono">
                    {s.driver_phone || "—"}
                  </td>

                  {/* DELIVERY STATUS */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {s.lr_copy_url && (
                        <a
                          href={s.lr_copy_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-brand-200 bg-brand-50 p-1.5 text-brand-700 hover:bg-brand-100 transition"
                          title="View Attached LR Copy"
                        >
                          <Paperclip size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => onEvent(s)}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100 transition"
                        title="Add Tracking Event Update"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => onEdit(s)}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100 transition"
                        title="Edit Shipment Details"
                      >
                        <Edit size={14} />
                      </button>

                      {/* STRICT ADMIN ONLY DELETE BUTTON */}
                      {isAdmin ? (
                        <button
                          onClick={() => onDelete(s.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition"
                          title="Delete Shipment (Admin Only)"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="rounded-lg border border-slate-200 bg-slate-100 p-1.5 text-slate-400 cursor-not-allowed opacity-50"
                          title="Only Administrator can delete entries"
                        >
                          <Lock size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
