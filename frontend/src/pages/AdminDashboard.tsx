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

      <main className="container-x py-8 space-y-8">
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
          <div className="space-y-4">
            {quotes.length === 0 && (
              <p className="text-center py-12 text-slate-500">No freight quote requests yet.</p>
            )}
            {quotes.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-extrabold text-white text-base">
                      {q.name}{" "}
                      {q.company && <span className="text-slate-400">· {q.company}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {q.email} {q.phone && `· ${q.phone}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        q.handled
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {q.handled ? "Handled" : "Open Request"}
                    </span>
                    {!q.handled && (
                      <button
                        onClick={async () => {
                          await api.patch(`/api/quotes/${q.id}?handled=true`);
                          flash("Marked as handled");
                          load();
                        }}
                        className="rounded-lg bg-brand-600/20 px-3 py-1.5 text-xs font-semibold text-brand-400 hover:bg-brand-600/30 transition"
                      >
                        Mark Handled
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-slate-900 bg-slate-900/60 p-4 text-xs text-slate-300">
                  <p>
                    <strong className="text-white">{q.service || "General Freight"}</strong>
                    {q.origin && ` · Lane: ${q.origin} ➔ ${q.destination}`}
                  </p>
                  {q.message && <p className="mt-2 text-slate-400">{q.message}</p>}
                </div>
                <p className="mt-3 text-[11px] text-slate-500">Submitted: {fmtDate(q.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {/* BLOG TAB */}
        {tab === "blog" && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setModal("post")}
                className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition"
              >
                <Plus size={16} /> New Article
              </button>
            </div>
            <div className="space-y-3">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-brand-400" />
                    <div>
                      <p className="font-bold text-white text-sm">{p.title}</p>
                      <p className="text-xs text-slate-400">
                        /blog/{p.slug} · {fmtDate(p.published_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this article?")) return;
                      await api.delete(`/api/blog/${p.id}`);
                      flash("Article deleted");
                      load();
                    }}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition"
                    aria-label="Delete article"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* USERS TAB */}
        {tab === "users" && isAdmin && (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setModal("user")}
                className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition"
              >
                <Plus size={16} /> New User Account
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-5 py-4 font-bold text-white">{u.full_name}</td>
                      <td className="px-5 py-4 text-slate-300">{u.email}</td>
                      <td className="px-5 py-4 text-slate-400">{u.company || "—"}</td>
                      <td className="px-5 py-4">
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            await api.patch(`/api/users/${u.id}`, { role: e.target.value });
                            flash("Role updated");
                            load();
                          }}
                          className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-white focus:outline-none"
                          disabled={u.id === user?.id}
                        >
                          <option value="admin">admin</option>
                          <option value="staff">staff</option>
                          <option value="client">client</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            u.is_active
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {u.id !== user?.id && (
                          <button
                            onClick={async () => {
                              await api.patch(`/api/users/${u.id}`, { is_active: !u.is_active });
                              load();
                            }}
                            className="font-bold text-brand-400 hover:underline"
                          >
                            {u.is_active ? "Disable" : "Enable"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* MODALS */}

      {/* Telegram Settings Modal */}
      {modal === "telegram_settings" && (
        <Modal
          title="Telegram Bot & Alert Configuration"
          subtitle="Configure real-time automated E-Way Bill expiry dispatch alerts"
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSaveTelegramSettings} className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Telegram Bot Token *
              </label>
              <input
                type="text"
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
                placeholder="e.g. 8559414564:AAFFFgcZM1dZnrxSBq4u8fBZ1oWqXMiYI-8"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Telegram Chat ID *
              </label>
              <input
                type="text"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                placeholder="e.g. 987654321 or group ID -100..."
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Expiry Alert Threshold (Hours)
              </label>
              <input
                type="number"
                value={tgThreshold}
                onChange={(e) => setTgThreshold(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Shipments with E-Way Bills expiring within this hours window will trigger alerts.
              </span>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={tgTesting || !tgBotToken || !tgChatId}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <Send size={14} className="text-brand-600" />
                {tgTesting ? "Sending Test..." : "Test Telegram Connection"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-700 transition"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE SHIPMENT MODAL */}
      {modal === "shipment" && (
        <Modal
          title="Create Consignment"
          subtitle="Add shipment, vehicle details, LR copy & E-Way Bill numbers"
          onClose={() => setModal(null)}
        >
          <form onSubmit={createShipment} className="grid gap-4 sm:grid-cols-2 text-slate-800">
            {[
              ["consignor", "Consignor Company *", true],
              ["consignee", "Consignee / Receiver *", true],
              ["origin", "Origin City *", true],
              ["destination", "Destination City *", true],
              ["invoice_number", "Invoice Number", false],
              ["lr_number", "LR Number", false],
              ["eway_bill_number", "E-Way Bill Number", false],
              ["commodity", "Commodity Description", false],
              ["vehicle_number", "Vehicle Number", false],
              ["driver_name", "Driver Name", false],
              ["driver_phone", "Driver Phone", false],
            ].map(([name, label, req]) => (
              <div key={name as string}>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  {label as string}
                </label>
                <input
                  name={name as string}
                  required={req as boolean}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>
            ))}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                E-Way Bill Issue Date
              </label>
              <input
                name="eway_bill_date"
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                E-Way Bill Expiry Date
              </label>
              <input
                name="eway_bill_expiry_date"
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Weight (kg)
              </label>
              <input
                name="weight_kg"
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Packages / Cartons
              </label>
              <input
                name="packages"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                <Paperclip size={16} className="text-brand-600" /> Upload LR Copy (PDF, PNG, JPG)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleLrFileUpload}
                className="mt-2 block w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-brand-700"
              />
              {uploadingLr && (
                <p className="mt-1 text-xs font-semibold text-amber-600">Uploading LR Document...</p>
              )}
              {uploadedLrUrl && (
                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={15} /> Document Attached:
                  <a
                    href={uploadedLrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-emerald-800"
                  >
                    View Uploaded LR Copy
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Assign to Client
              </label>
              <select
                name="client_id"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {users
                  .filter((u) => u.role === "client")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.company})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Status
              </label>
              <select
                name="status"
                defaultValue="booked"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-700 transition">
                Create Shipment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT SHIPMENT MODAL */}
      {modal === "edit_shipment" && activeShipment && (
        <Modal
          title={`Edit Shipment · ${activeShipment.tracking_number}`}
          subtitle="Update shipment details, E-Way Bill expiry, or replace LR document"
          onClose={() => setModal(null)}
        >
          <form onSubmit={updateShipment} className="grid gap-4 sm:grid-cols-2 text-slate-800">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Consignor *
              </label>
              <input
                name="consignor"
                defaultValue={activeShipment.consignor}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Consignee *
              </label>
              <input
                name="consignee"
                defaultValue={activeShipment.consignee}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Origin *
              </label>
              <input
                name="origin"
                defaultValue={activeShipment.origin}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Destination *
              </label>
              <input
                name="destination"
                defaultValue={activeShipment.destination}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Invoice Number
              </label>
              <input
                name="invoice_number"
                defaultValue={activeShipment.invoice_number || ""}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                LR Number
              </label>
              <input
                name="lr_number"
                defaultValue={activeShipment.lr_number || ""}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                E-Way Bill Number
              </label>
              <input
                name="eway_bill_number"
                defaultValue={activeShipment.eway_bill_number || ""}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Commodity
              </label>
              <input
                name="commodity"
                defaultValue={activeShipment.commodity || ""}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Vehicle Number
              </label>
              <input
                name="vehicle_number"
                defaultValue={activeShipment.vehicle_number || ""}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Driver Name
              </label>
              <input
                name="driver_name"
                defaultValue={activeShipment.driver_name || ""}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Driver Phone
              </label>
              <input
                name="driver_phone"
                defaultValue={activeShipment.driver_phone || ""}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                E-Way Bill Expiry Date
              </label>
              <input
                name="eway_bill_expiry_date"
                type="datetime-local"
                defaultValue={
                  activeShipment.eway_bill_expiry_date
                    ? new Date(activeShipment.eway_bill_expiry_date).toISOString().slice(0, 16)
                    : ""
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                <Paperclip size={16} className="text-brand-600" /> LR Copy Document
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleLrFileUpload}
                className="mt-2 block w-full text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-brand-700"
              />
              {uploadingLr && (
                <p className="mt-1 text-xs font-semibold text-amber-600">Uploading LR Document...</p>
              )}
              {(uploadedLrUrl || activeShipment.lr_copy_url) && (
                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={15} /> Document Attached:
                  <a
                    href={uploadedLrUrl || activeShipment.lr_copy_url!}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-emerald-800"
                  >
                    View LR Copy
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Status
              </label>
              <select
                name="status"
                defaultValue={activeShipment.status}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-700 transition">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EVENT MODAL */}
      {modal === "event" && activeShipment && (
        <Modal
          title={`Add Tracking Update · ${activeShipment.tracking_number}`}
          subtitle={`Route: ${activeShipment.origin} ➔ ${activeShipment.destination}`}
          onClose={() => setModal(null)}
        >
          <form onSubmit={addEvent} className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                New Status *
              </label>
              <select
                name="status"
                required
                defaultValue={activeShipment.status}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Current Location *
              </label>
              <input
                name="location"
                required
                placeholder="e.g. Pune Highway Checkpoint, MH"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Update Note / Remarks
              </label>
              <textarea
                name="note"
                rows={3}
                placeholder="e.g. Transhipment departed hub, expected delivery on schedule."
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-700 transition">
                Post Tracking Update
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ARTICLE MODAL */}
      {modal === "post" && (
        <Modal title="Publish Blog Article" onClose={() => setModal(null)}>
          <form onSubmit={createPost} className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Title *
              </label>
              <input
                name="title"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Excerpt *
              </label>
              <textarea
                name="excerpt"
                required
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Content (Markdown) *
              </label>
              <textarea
                name="content"
                required
                rows={8}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 font-mono text-xs text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg">
                Publish Article
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* USER MODAL */}
      {modal === "user" && (
        <Modal title="Create User Account" onClose={() => setModal(null)}>
          <form onSubmit={createUser} className="grid gap-4 sm:grid-cols-2 text-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Full Name *
              </label>
              <input
                name="full_name"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Company
              </label>
              <input
                name="company"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Email *
              </label>
              <input
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Password *
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Role *
              </label>
              <select
                name="role"
                defaultValue="client"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900"
              >
                <option value="client">Client — read-only access to own shipments</option>
                <option value="staff">Staff — manage shipments, blog, quotes</option>
                <option value="admin">Admin — full system control</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg">
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ShipmentTable({
  shipments,
  onEvent,
  onEdit,
  onDelete,
}: {
  shipments: Shipment[];
  onEvent: (s: Shipment) => void;
  onEdit: (s: Shipment) => void;
  onDelete: (id: number) => void;
}) {
  if (shipments.length === 0)
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-12 text-center text-slate-500">
        No consignments found.
      </div>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-4">Consignment / Route</th>
              <th className="px-5 py-4">Documents (Invoice &amp; LR)</th>
              <th className="px-5 py-4">E-Way Bill &amp; Expiry Risk</th>
              <th className="px-5 py-4">Consignee &amp; Vehicle</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {shipments.map((s) => {
              const now = Date.now();
              const expTime = s.eway_bill_expiry_date
                ? new Date(s.eway_bill_expiry_date).getTime()
                : null;
              const isExpired = expTime ? expTime < now : false;
              const isNearExpiry = expTime && !isExpired ? (expTime - now) / (1000 * 3600) <= 48 : false;

              return (
                <tr key={s.id} className="hover:bg-slate-900/60 transition group">
                  {/* Consignment & Route */}
                  <td className="px-5 py-4">
                    <span className="font-display text-sm font-black text-white group-hover:text-brand-400 transition block">
                      {s.tracking_number}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      {s.origin} <span className="text-brand-500">➔</span> {s.destination}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Consignor: {s.consignor}
                    </span>
                  </td>

                  {/* Invoice & LR */}
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-200">Inv: {s.invoice_number || "—"}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-slate-400">LR: {s.lr_number || "—"}</span>
                      {s.lr_copy_url && (
                        <a
                          href={s.lr_copy_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition"
                          title="View uploaded LR Copy"
                        >
                          <Paperclip size={10} /> LR Copy
                        </a>
                      )}
                    </div>
                  </td>

                  {/* E-Way Bill & Expiry */}
                  <td className="px-5 py-4">
                    <p className="font-mono font-bold text-slate-200">{s.eway_bill_number || "—"}</p>
                    {s.eway_bill_expiry_date ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isExpired
                              ? "bg-red-500/20 text-red-400 border border-red-500/40"
                              : isNearExpiry
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {isExpired ? "EXPIRED" : isNearExpiry ? "EXPIRING SOON" : "VALID"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {fmtDate(s.eway_bill_expiry_date)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Consignee & Vehicle */}
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-200">{s.consignee}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {s.vehicle_number ? (
                        <span className="inline-flex items-center gap-1 font-mono text-brand-400">
                          🚚 {s.vehicle_number}
                        </span>
                      ) : (
                        "No vehicle"
                      )}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`badge ${STATUS_STYLES[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-5 py-4 text-right space-x-2">
                    <button
                      onClick={() => onEvent(s)}
                      className="rounded-lg bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-400 hover:bg-brand-500/20 transition"
                    >
                      + Status Update
                    </button>
                    <button
                      onClick={() => onEdit(s)}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirm("Delete this shipment?") && onDelete(s.id)}
                      className="rounded-lg p-1 text-red-400 hover:bg-red-500/10 transition"
                      title="Delete shipment"
                    >
                      <Trash2 size={14} />
                    </button>
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
