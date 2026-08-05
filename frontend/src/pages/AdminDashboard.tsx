import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Edit,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Inbox,
  Lock,
  Package,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Truck,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import Seo from "../components/Seo";
import {
  api,
  downloadSampleExcelTemplate,
  downloadShipmentsCsv,
  downloadShipmentsExcel,
  EWAY_STATUS_STYLES,
  fmtDate,
  fmtDateOnly,
  getTelegramConfig,
  notifyEwayExpiry,
  saveTelegramConfig,
  STATUS_LABELS,
  STATUS_STYLES,
  testTelegram,
  uploadLrCopy,
  uploadShipmentsExcel,
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

// Helper to determine E-Way Bill Expiry Urgency
function getEwayExpiryInfo(expiryDateStr?: string | null) {
  if (!expiryDateStr) {
    return {
      level: "none",
      text: "No Expiry",
      hoursLeft: 9999,
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      rowClass: "",
    };
  }
  const exp = new Date(expiryDateStr).getTime();
  const now = new Date().getTime();
  const diffHours = (exp - now) / (1000 * 60 * 60);

  if (diffHours < 0) {
    return {
      level: "expired",
      text: "EXPIRED",
      hoursLeft: diffHours,
      badgeClass: "bg-rose-600 text-white font-black animate-pulse shadow-sm shadow-rose-500/30",
      rowClass: "bg-rose-50/80 border-l-4 border-l-rose-500 hover:bg-rose-100/70",
    };
  } else if (diffHours <= 24) {
    return {
      level: "expiring_24h",
      text: `Exp. ${Math.max(1, Math.ceil(diffHours))} Hrs`,
      hoursLeft: diffHours,
      badgeClass: "bg-amber-500 text-white font-bold animate-pulse shadow-sm shadow-amber-500/30",
      rowClass: "bg-amber-50/80 border-l-4 border-l-amber-500 hover:bg-amber-100/70",
    };
  } else if (diffHours <= 48) {
    return {
      level: "caution",
      text: `Exp. ${Math.ceil(diffHours / 24)} Days`,
      hoursLeft: diffHours,
      badgeClass: "bg-yellow-100 text-yellow-800 font-bold border border-yellow-300",
      rowClass: "hover:bg-yellow-50/40",
    };
  } else {
    return {
      level: "valid",
      text: "Valid",
      hoursLeft: diffHours,
      badgeClass: "bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300",
      rowClass: "hover:bg-slate-50/80",
    };
  }
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white p-7 shadow-2xl ring-1 ring-slate-900/10">
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
    "shipments"
  );

  const [stats, setStats] = useState<Stats | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<
    null
    | "shipment"
    | "edit_shipment"
    | "event"
    | "post"
    | "user"
    | "telegram_settings"
    | "upload_excel"
  >(null);

  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [drawerShipment, setDrawerShipment] = useState<Shipment | null>(null);
  const [toast, setToast] = useState("");
  const [uploadingLr, setUploadingLr] = useState(false);
  const [uploadedLrUrl, setUploadedLrUrl] = useState<string | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);

  // Search, Filter and Auto-Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ewayFilter, setEwayFilter] = useState<"all" | "expiring_24h" | "expired" | "valid">("all");
  const [autoSortExpiry, setAutoSortExpiry] = useState<boolean>(true);

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

  const loadData = useCallback(async () => {
    try {
      const [st, sh, q, p] = await Promise.all([
        api.get("/api/stats").then((r) => r.data),
        api.get("/api/shipments?limit=200").then((r) => r.data),
        api.get("/api/quotes").then((r) => r.data),
        api.get("/api/blog?limit=50").then((r) => r.data),
      ]);
      setStats(st);
      setShipments(sh);
      setQuotes(q);
      setPosts(p);

      if (isAdmin) {
        const u = await api.get("/api/users").then((r) => r.data);
        setUsers(u);
      }
    } catch {
      /* handled */
    }
  }, [isAdmin]);

  const loadTelegramConfig = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const cfg = await getTelegramConfig();
      if (cfg) {
        setTgBotToken(cfg.bot_token || "");
        setTgChatId(cfg.chat_id || "");
        setTgThreshold(cfg.threshold_hours || 48);
      }
    } catch {
      /* no config set yet */
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
    loadTelegramConfig();
  }, [loadData, loadTelegramConfig]);

  const saveTgConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveTelegramConfig(tgBotToken, tgChatId, tgThreshold);
      flash("Telegram bot configuration saved persistently!");
      setModal(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save Telegram config");
    }
  };

  const testTgBot = async () => {
    setTgTesting(true);
    try {
      await testTelegram(tgBotToken, tgChatId);
      flash("Telegram Test Alert sent successfully to chat!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to send test message");
    } finally {
      setTgTesting(false);
    }
  };

  const triggerEwayNotification = async () => {
    setNotifyingEway(true);
    try {
      const res = await notifyEwayExpiry();
      flash(res.message || "E-Way Bill Expiry notifications dispatched to Telegram!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to send E-Way Bill notifications");
    } finally {
      setNotifyingEway(false);
    }
  };

  const deleteShipment = async (id: number) => {
    if (!isAdmin) {
      alert("Access Denied: Only Administrator accounts can delete consignment entries.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this consignment entry? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/shipments/${id}`);
      flash("Consignment entry deleted successfully");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete shipment record");
    }
  };

  const handleLrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLr(true);
    try {
      const res = await uploadLrCopy(file);
      setUploadedLrUrl(res.lr_copy_url);
      flash("LR Copy document uploaded successfully");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to upload LR Copy");
    } finally {
      setUploadingLr(false);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true);
    try {
      const res = await uploadShipmentsExcel(file);
      flash(res.message || `Successfully imported ${res.imported_count} shipments!`);
      setModal(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to import Excel file. Check file headers.");
    } finally {
      setUploadingExcel(false);
    }
  };

  const createShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await api.post("/api/shipments", {
        invoice_number: data.get("invoice_number") || null,
        invoice_date: data.get("invoice_date") || null,
        eway_bill_number: data.get("eway_bill_number") || null,
        eway_bill_date: data.get("eway_bill_date") || null,
        eway_bill_expiry_date: data.get("eway_bill_expiry_date") || null,
        eway_bill_status: data.get("eway_bill_status") || "VEHICLE NUMBER UPDATED",
        new_extended_eway_bill_date: data.get("new_extended_eway_bill_date") || null,
        origin: data.get("origin"),
        destination: data.get("destination"),
        consignor: data.get("consignor"),
        consignee: data.get("consignee"),
        driver_name: data.get("driver_name") || null,
        driver_phone: data.get("driver_phone") || null,
        status: data.get("status") || "booked",
        lr_copy_url: uploadedLrUrl,
      });

      flash("New consignment entry created");
      setModal(null);
      setUploadedLrUrl(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create shipment");
    }
  };

  const updateShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeShipment) return;
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await api.patch(`/api/shipments/${activeShipment.id}`, {
        invoice_number: data.get("invoice_number") || null,
        invoice_date: data.get("invoice_date") || null,
        eway_bill_number: data.get("eway_bill_number") || null,
        eway_bill_date: data.get("eway_bill_date") || null,
        eway_bill_expiry_date: data.get("eway_bill_expiry_date") || null,
        eway_bill_status: data.get("eway_bill_status") || "VEHICLE NUMBER UPDATED",
        new_extended_eway_bill_date: data.get("new_extended_eway_bill_date") || null,
        origin: data.get("origin"),
        destination: data.get("destination"),
        consignor: data.get("consignor"),
        consignee: data.get("consignee"),
        driver_name: data.get("driver_name") || null,
        driver_phone: data.get("driver_phone") || null,
        status: data.get("status"),
        lr_copy_url: uploadedLrUrl || activeShipment.lr_copy_url,
      });

      flash("Consignment record updated successfully");
      setModal(null);
      setActiveShipment(null);
      setUploadedLrUrl(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update shipment");
    }
  };

  const addEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeShipment) return;
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await api.post(`/api/shipments/${activeShipment.id}/events`, {
        status: data.get("status"),
        location: data.get("location"),
        note: data.get("note"),
      });

      flash("Tracking milestone event added");
      setModal(null);
      setActiveShipment(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add event");
    }
  };

  const toggleQuoteHandled = async (q: Quote) => {
    try {
      await api.patch(`/api/quotes/${q.id}`, { handled: !q.handled });
      loadData();
    } catch {
      /* handled */
    }
  };

  const createPost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await api.post("/api/blog", {
        title: data.get("title"),
        excerpt: data.get("excerpt"),
        content: data.get("content"),
        tags: data.get("tags") || null,
        is_published: true,
      });
      flash("Article published");
      setModal(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to publish post");
    }
  };

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await api.post("/api/users", {
        email: data.get("email"),
        full_name: data.get("full_name"),
        company: data.get("company") || null,
        password: data.get("password"),
        role: data.get("role"),
      });
      flash("User account created");
      setModal(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create user");
    }
  };

  // E-Way Expiry Alert Calculation & Auto-Sort
  const expiringCount = shipments.filter((s) => {
    const info = getEwayExpiryInfo(s.eway_bill_expiry_date);
    return info.level === "expired" || info.level === "expiring_24h";
  }).length;

  let filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      (s.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (s.eway_bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      s.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === "all" || s.status === statusFilter;

    const ewayInfo = getEwayExpiryInfo(s.eway_bill_expiry_date);
    const matchesEway =
      ewayFilter === "all" ||
      (ewayFilter === "expiring_24h" && (ewayInfo.level === "expiring_24h" || ewayInfo.level === "expired")) ||
      (ewayFilter === "expired" && ewayInfo.level === "expired") ||
      (ewayFilter === "valid" && ewayInfo.level === "valid");

    return matchesSearch && matchesStatus && matchesEway;
  });

  if (autoSortExpiry) {
    filteredShipments = [...filteredShipments].sort((a, b) => {
      const infoA = getEwayExpiryInfo(a.eway_bill_expiry_date);
      const infoB = getEwayExpiryInfo(b.eway_bill_expiry_date);
      return infoA.hoursLeft - infoB.hoursLeft;
    });
  }

  return (
    <>
      <Seo title="Admin Operations Dashboard | Kalebudde Logistics" description="Management portal" path="/admin" />

      {/* Top Notification Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-[100] flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-2xl animate-fade-in">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-brand-950 py-10 text-white border-b border-brand-900">
        <div className="container-x flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent-400 text-xs font-extrabold uppercase tracking-widest">
              <Sparkles size={14} /> Kalebudde Logistics Management Platform
            </div>
            <h1 className="h2 mt-1 text-white">Operations &amp; Consignment Control</h1>
            <p className="mt-1 text-xs text-brand-200">
              Logged in as <strong className="text-white">{user?.full_name}</strong> ({user?.email}) &bull;{" "}
              <span className="capitalize font-bold text-accent-400">{user?.role} Access</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Top E-Way Bill Expiry Bell Icon with Red Badge */}
            <button
              onClick={() => setEwayFilter(ewayFilter === "expiring_24h" ? "all" : "expiring_24h")}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold shadow transition ${
                expiringCount > 0
                  ? "bg-rose-600 text-white animate-pulse hover:bg-rose-700"
                  : "bg-brand-900 border border-brand-800 text-brand-100 hover:bg-brand-800"
              }`}
              title="Filter by E-Way Bills expiring in <= 24 hours"
            >
              <BellRing size={16} />
              <span>24h Alerts</span>
              {expiringCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-rose-600">
                  {expiringCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                onClick={() => setModal("telegram_settings")}
                className="flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-900/50 px-3.5 py-2 text-xs font-bold text-blue-200 hover:bg-blue-900/80 transition"
              >
                <Send size={14} className="text-blue-400" /> Telegram Bot
              </button>
            )}

            <button
              onClick={() => {
                setUploadedLrUrl(null);
                setModal("shipment");
              }}
              className="flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600 transition"
            >
              <Plus size={15} /> New Consignment
            </button>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="bg-white border-b border-slate-200">
        <div className="container-x flex overflow-x-auto gap-2 py-3 text-xs font-bold">
          {[
            ["overview", "Overview & Metrics", Package],
            ["shipments", `Consignments Grid (${shipments.length})`, Truck],
            ["quotes", `Quote Inquiries (${quotes.filter((q) => !q.handled).length})`, Inbox],
            ["blog", "News & Articles", FileText],
            ...(isAdmin ? [["users", "Team Accounts", Users]] : []),
          ].map(([id, label, IconComponent]: any) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 transition whitespace-nowrap ${
                tab === id ? "bg-brand-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <IconComponent size={15} />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <section className="container-x py-8 min-h-[600px]">
        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                ["Active Shipments", stats.total_shipments, "Total logged", Package, "bg-brand-50 text-brand-700 border-brand-200"],
                ["In Transit", stats.in_transit, "On road", Truck, "bg-blue-50 text-blue-700 border-blue-200"],
                ["Delivered", stats.delivered, "Completed", CheckCircle2, "bg-emerald-50 text-emerald-700 border-emerald-200"],
                ["Expiring E-Way", expiringCount, "Next 24 Hours", ShieldAlert, expiringCount > 0 ? "bg-rose-50 text-rose-700 border-rose-300" : "bg-slate-50 text-slate-700 border-slate-200"],
                ["Open Quotes", stats.open_quotes, "Pending reply", Inbox, "bg-amber-50 text-amber-700 border-amber-200"],
                ["Team / Clients", stats.total_clients, "Registered", Users, "bg-purple-50 text-purple-700 border-purple-200"],
              ].map(([t, v, sub, IconElement, color]: any) => {
                return (
                  <div key={t as string} className="rounded-2xl border p-5 bg-white shadow-sm flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t as string}</p>
                      <p className="mt-2 font-display text-3xl font-black text-slate-900">{v as number}</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500">{sub as string}</p>
                    </div>
                    <span className={`rounded-xl p-3 border ${color as string}`}>
                      <IconElement size={22} />
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-bold text-slate-900">Recent Active Consignments</h2>
                <button onClick={() => setTab("shipments")} className="text-xs font-bold text-brand-600 hover:underline">
                  View All ({shipments.length})
                </button>
              </div>
              <ShipmentTable
                shipments={shipments.slice(0, 5)}
                userRole={user?.role}
                onSelectDrawer={(s) => setDrawerShipment(s)}
                onEvent={(s) => {
                  setActiveShipment(s);
                  setModal("event");
                }}
                onEdit={(s) => {
                  setActiveShipment(s);
                  setUploadedLrUrl(s.lr_copy_url);
                  setModal("edit_shipment");
                }}
                onDelete={deleteShipment}
              />
            </div>
          </div>
        )}

        {/* TAB 2: SHIPMENTS TABLE (CLEAN GLOBAL VIEW + ALERTS + AUTO-SORT) */}
        {tab === "shipments" && (
          <div className="space-y-4">
            {/* E-Way Bill Expiry Alert Banner */}
            {expiringCount > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-4 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
                    <ShieldAlert size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-sm text-white">
                      ⚠️ ATTENTION: {expiringCount} E-Way Bill(s) Expiring or Expired!
                    </h3>
                    <p className="text-xs text-rose-100 mt-0.5">
                      Check transit status or extend validity to avoid heavy penalty fees. Urgent bills are automatically sorted to the top.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={triggerEwayNotification}
                    disabled={notifyingEway}
                    className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-rose-700 shadow hover:bg-rose-50 transition"
                  >
                    <BellRing size={14} /> {notifyingEway ? "Sending..." : "Send Telegram Alert"}
                  </button>
                </div>
              </div>
            )}

            {/* Action & Filter Bar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search LR Number, E-Way Bill, Invoice, Consignor, Destination..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-xs text-slate-900 font-semibold focus:outline-none"
                >
                  <option value="all">All Delivery Statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>

                {/* E-Way Expiry Filter */}
                <select
                  value={ewayFilter}
                  onChange={(e) => setEwayFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-xs text-slate-900 font-bold focus:outline-none"
                >
                  <option value="all">All E-Way Bills</option>
                  <option value="expiring_24h">⚠️ Expiring in &lt;= 24 Hours</option>
                  <option value="expired">🔴 Expired</option>
                  <option value="valid">🟢 Valid</option>
                </select>

                {/* Auto-Sort Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoSortExpiry(!autoSortExpiry)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    autoSortExpiry
                      ? "border-amber-400 bg-amber-50 text-amber-900"
                      : "border-slate-300 bg-slate-50 text-slate-600"
                  }`}
                  title="Auto-sort table by E-Way Bill expiry date urgency"
                >
                  <Clock size={14} className={autoSortExpiry ? "text-amber-600" : "text-slate-400"} />
                  <span>Urgency Sort</span>
                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase ${autoSortExpiry ? "bg-amber-500 text-white" : "bg-slate-300 text-slate-700"}`}>
                    {autoSortExpiry ? "ON" : "OFF"}
                  </span>
                </button>
              </div>

              {/* Data Tools */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModal("upload_excel")}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
                  title="Upload Excel or CSV spreadsheet"
                >
                  <FileSpreadsheet size={15} /> Upload Excel/CSV
                </button>
                <button
                  onClick={downloadShipmentsExcel}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                  title="Export to Excel (.xlsx)"
                >
                  <Download size={14} className="text-emerald-600" /> Excel
                </button>
                <button
                  onClick={downloadShipmentsCsv}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                  title="Export to CSV (.csv)"
                >
                  <Download size={14} className="text-blue-600" /> CSV
                </button>
              </div>
            </div>

            {/* Global Tracking Table */}
            <ShipmentTable
              shipments={filteredShipments}
              userRole={user?.role}
              onSelectDrawer={(s) => setDrawerShipment(s)}
              onEvent={(s) => {
                setActiveShipment(s);
                setModal("event");
              }}
              onEdit={(s) => {
                setActiveShipment(s);
                setUploadedLrUrl(s.lr_copy_url);
                setModal("edit_shipment");
              }}
              onDelete={deleteShipment}
            />
          </div>
        )}

        {/* TAB 3: QUOTES */}
        {tab === "quotes" && (
          <div className="space-y-4">
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
          <div className="space-y-4">
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
          <div className="space-y-4">
            <div className="flex justify-between items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-display text-base font-bold text-slate-900">Team Accounts &amp; Access Roles</h2>
              <button
                onClick={() => setModal("user")}
                className="rounded-xl bg-brand-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-brand-800"
              >
                + Add User Account
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">FULL NAME</th>
                    <th className="px-4 py-3.5">EMAIL ADDRESS</th>
                    <th className="px-4 py-3.5">ORGANIZATION</th>
                    <th className="px-4 py-3.5">ACCESS ROLE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{u.full_name}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">{u.email}</td>
                      <td className="px-4 py-3.5 text-slate-600">{u.company || "Kalebudde Logistics"}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* SLIDE-OUT DETAIL PANEL */}
      {drawerShipment && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-brand-950 text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent-400">Consignment Details</span>
                <h3 className="font-display text-xl font-extrabold text-white flex items-center gap-2 mt-0.5">
                  <Package size={20} className="text-accent-400" />
                  {drawerShipment.tracking_number}
                </h3>
              </div>
              <button
                onClick={() => setDrawerShipment(null)}
                className="rounded-full p-2 text-brand-200 hover:bg-brand-900 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Cards */}
            <div className="p-6 space-y-5 flex-1 bg-slate-50">
              {/* Alert Warning Banner if Expiring */}
              {(() => {
                const info = getEwayExpiryInfo(drawerShipment.eway_bill_expiry_date);
                if (info.level === "expired" || info.level === "expiring_24h") {
                  return (
                    <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-3 text-xs text-rose-900 shadow-sm animate-pulse">
                      <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold text-rose-950 block">CRITICAL E-WAY BILL ALERT ({info.text})</strong>
                        This consignment's E-Way bill is nearing or past its validity window. Send a Telegram notification or update the extended expiry date.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* CARD 1: Financials Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-brand-900 font-extrabold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
                  <DollarSign size={16} className="text-brand-600" /> Financials &amp; Invoice Info
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Invoice Number</span>
                    <strong className="font-mono text-slate-900 font-bold text-sm">{drawerShipment.invoice_number || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Invoice Date</span>
                    <strong className="text-slate-800 font-semibold">{fmtDateOnly(drawerShipment.invoice_date)}</strong>
                  </div>
                </div>
                {drawerShipment.lr_copy_url && (
                  <div className="pt-2">
                    <a
                      href={drawerShipment.lr_copy_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200 px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
                    >
                      <Paperclip size={14} /> Download Attached LR Copy Document
                    </a>
                  </div>
                )}
              </div>

              {/* CARD 2: Transit Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-brand-900 font-extrabold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
                  <Truck size={16} className="text-brand-600" /> Transit &amp; Route Logistics
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Origin</span>
                    <strong className="text-slate-900 font-bold">{drawerShipment.origin}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Destination</span>
                    <strong className="text-slate-900 font-bold">{drawerShipment.destination}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Delivery Status</span>
                    <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[drawerShipment.status]}`}>
                      {STATUS_LABELS[drawerShipment.status]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Driver Contact</span>
                    <strong className="text-slate-800 font-semibold block">{drawerShipment.driver_name || "—"}</strong>
                    <span className="font-mono text-slate-600">{drawerShipment.driver_phone || "—"}</span>
                  </div>
                </div>
              </div>

              {/* CARD 3: Parties Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-brand-900 font-extrabold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
                  <UserCheck size={16} className="text-brand-600" /> Consignor &amp; Consignee Parties
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Consignor (Sender)</span>
                    <strong className="text-slate-900 font-bold">{drawerShipment.consignor}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Consignee (Receiver)</span>
                    <strong className="text-slate-900 font-bold">{drawerShipment.consignee}</strong>
                  </div>
                </div>
              </div>

              {/* CARD 4: Compliance Card (E-Way Expiry Alert) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-brand-900 font-extrabold text-xs uppercase tracking-wider">
                    <ShieldAlert size={16} className="text-amber-500" /> Compliance &amp; E-Way Bill
                  </div>
                  {(() => {
                    const info = getEwayExpiryInfo(drawerShipment.eway_bill_expiry_date);
                    return (
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${info.badgeClass}`}>
                        {info.text}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">E-Way Bill Number</span>
                    <strong className="font-mono text-slate-900 font-bold">{drawerShipment.eway_bill_number || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">E-Way Bill Date</span>
                    <strong className="text-slate-800 font-semibold">{fmtDateOnly(drawerShipment.eway_bill_date)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Expiry Date &amp; Time</span>
                    <strong className="text-slate-900 font-bold">{fmtDate(drawerShipment.eway_bill_expiry_date)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Extended Date</span>
                    <strong className="text-slate-800 font-semibold">{fmtDateOnly(drawerShipment.new_extended_eway_bill_date)}</strong>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        setNotifyingEway(true);
                        await notifyEwayExpiry();
                        flash("E-Way Bill Expiry alert dispatched via Telegram!");
                      } catch {
                        alert("Failed to send Telegram alert");
                      } finally {
                        setNotifyingEway(false);
                      }
                    }}
                    disabled={notifyingEway}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    <BellRing size={15} /> {notifyingEway ? "Sending Alert..." : "Send Telegram Alert"}
                  </button>
                  <button
                    onClick={() => {
                      setActiveShipment(drawerShipment);
                      setUploadedLrUrl(drawerShipment.lr_copy_url);
                      setDrawerShipment(null);
                      setModal("edit_shipment");
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Edit Details
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
              <button
                onClick={() => {
                  setActiveShipment(drawerShipment);
                  setDrawerShipment(null);
                  setModal("event");
                }}
                className="flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
              >
                <Plus size={15} /> Add Milestone Event
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    const id = drawerShipment.id;
                    setDrawerShipment(null);
                    deleteShipment(id);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                >
                  <Trash2 size={15} /> Delete Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD EXCEL MODAL */}
      {modal === "upload_excel" && (
        <Modal
          title="Upload Excel or CSV Consignment File"
          subtitle="Import multiple shipments directly into database from Excel (.xlsx, .xls) or CSV"
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800">
              <div>
                <strong className="block text-emerald-950 text-xs">Need a sample format?</strong>
                <span className="text-emerald-700">Download a ready-to-use Excel template pre-filled with sample consignment columns.</span>
              </div>
              <button
                type="button"
                onClick={downloadSampleExcelTemplate}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-800 transition shrink-0 self-start sm:self-auto"
              >
                <Download size={14} /> Download Sample Template
              </button>
            </div>

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
                className="mt-4 block w-full text-xs text-slate-500 file:mx-auto file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-6 file:py-2.5 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-700 cursor-pointer"
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
          title="Persistent Telegram Bot Integration"
          subtitle="Configure automatic E-Way Bill 24-hour expiry notifications to Telegram"
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveTgConfig} className="space-y-4">
            <div>
              <label className="label">Telegram Bot Token</label>
              <input
                type="text"
                placeholder="e.g. 7849102934:AAFx..."
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
                className="input font-mono text-xs"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">Provided by Telegram @BotFather when creating your bot.</p>
            </div>

            <div>
              <label className="label">Telegram Chat ID / Group ID</label>
              <input
                type="text"
                placeholder="e.g. -1001928374 or 123456789"
                value={tgChatId}
                onChange={(e) => setTgChatId(e.target.value)}
                className="input font-mono text-xs"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">Chat ID for your dispatch channel or group.</p>
            </div>

            <div>
              <label className="label">Expiry Alert Threshold (Hours)</label>
              <input
                type="number"
                value={tgThreshold}
                onChange={(e) => setTgThreshold(Number(e.target.value))}
                className="input text-xs"
                min={1}
                max={168}
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">Alerts trigger when E-Way bill expiry is within this number of hours (default 48h).</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={testTgBot}
                disabled={tgTesting || !tgBotToken || !tgChatId}
                className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                <Send size={14} /> {tgTesting ? "Sending Test..." : "Send Test Message"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 text-xs">
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW SHIPMENT MODAL */}
      {modal === "shipment" && (
        <Modal title="Create New Consignment Entry" subtitle="Enter tracking and compliance details" onClose={() => setModal(null)}>
          <form onSubmit={createShipment} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Invoice Number</label>
                <input name="invoice_number" placeholder="e.g. INV-2026-904" className="input text-xs" />
              </div>
              <div>
                <label className="label">Invoice Date</label>
                <input name="invoice_date" type="date" className="input text-xs" />
              </div>
              <div>
                <label className="label">E-Way Bill Number</label>
                <input name="eway_bill_number" placeholder="e.g. 311099281746" className="input text-xs" />
              </div>
              <div>
                <label className="label">E-Way Bill Date</label>
                <input name="eway_bill_date" type="date" className="input text-xs" />
              </div>
              <div>
                <label className="label">E-Way Bill Expiry Date &amp; Time</label>
                <input name="eway_bill_expiry_date" type="datetime-local" className="input text-xs" />
              </div>
              <div>
                <label className="label">E-Way Bill Status</label>
                <input name="eway_bill_status" defaultValue="VEHICLE NUMBER UPDATED" className="input text-xs" />
              </div>
              <div>
                <label className="label">New Extended E-Way Date</label>
                <input name="new_extended_eway_bill_date" type="date" className="input text-xs" />
              </div>
              <div>
                <label className="label">Delivery Status</label>
                <select name="status" className="input text-xs capitalize">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Origin City / Depot *</label>
                <input name="origin" required defaultValue="Hubli, KA" className="input text-xs" />
              </div>
              <div>
                <label className="label">Destination City *</label>
                <input name="destination" required defaultValue="Bengaluru, KA" className="input text-xs" />
              </div>
              <div>
                <label className="label">Consignor (Sender) *</label>
                <input name="consignor" required defaultValue="Asian Paints Depot Hubli" className="input text-xs" />
              </div>
              <div>
                <label className="label">Consignee (Receiver) *</label>
                <input name="consignee" required defaultValue="Sri Venkateshwara Traders" className="input text-xs" />
              </div>
              <div>
                <label className="label">Driver Name</label>
                <input name="driver_name" placeholder="Driver Full Name" className="input text-xs" />
              </div>
              <div>
                <label className="label">Driver Phone / Mobile</label>
                <input name="driver_phone" placeholder="+91 98450 XXXXX" className="input text-xs" />
              </div>
            </div>

            <div>
              <label className="label">Upload Attached LR Copy Document (PDF, JPG, PNG)</label>
              <input type="file" onChange={handleLrFileUpload} className="block w-full text-xs text-slate-500" />
              {uploadingLr && <p className="text-xs text-brand-600 mt-1">Uploading document...</p>}
              {uploadedLrUrl && <p className="text-xs text-emerald-600 mt-1 font-bold">✓ File attached: {uploadedLrUrl}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary py-2 text-xs">
                Create Consignment Entry
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT SHIPMENT MODAL */}
      {modal === "edit_shipment" && activeShipment && (
        <Modal title="Edit Consignment Details" subtitle={`Updating LR: ${activeShipment.tracking_number}`} onClose={() => setModal(null)}>
          <form onSubmit={updateShipment} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Invoice Number</label>
                <input name="invoice_number" defaultValue={activeShipment.invoice_number || ""} className="input text-xs" />
              </div>
              <div>
                <label className="label">Invoice Date</label>
                <input name="invoice_date" type="date" defaultValue={activeShipment.invoice_date ? activeShipment.invoice_date.slice(0, 10) : ""} className="input text-xs" />
              </div>
              <div>
                <label className="label">E-Way Bill Number</label>
                <input name="eway_bill_number" defaultValue={activeShipment.eway_bill_number || ""} className="input text-xs" />
              </div>
              <div>
                <label className="label">E-Way Bill Date</label>
                <input name="eway_bill_date" type="date" defaultValue={activeShipment.eway_bill_date ? activeShipment.eway_bill_date.slice(0, 10) : ""} className="input text-xs" />
              </div>
              <div>
                <label className="label">E-Way Bill Expiry Date &amp; Time</label>
                <input name="eway_bill_expiry_date" type="datetime-local" defaultValue={activeShipment.eway_bill_expiry_date ? activeShipment.eway_bill_expiry_date.slice(0, 16) : ""} className="input text-xs" />
              </div>
              <div>
                <label className="label">E-Way Bill Status</label>
                <input name="eway_bill_status" defaultValue={activeShipment.eway_bill_status || "VEHICLE NUMBER UPDATED"} className="input text-xs" />
              </div>
              <div>
                <label className="label">New Extended E-Way Date</label>
                <input name="new_extended_eway_bill_date" type="date" defaultValue={activeShipment.new_extended_eway_bill_date ? activeShipment.new_extended_eway_bill_date.slice(0, 10) : ""} className="input text-xs" />
              </div>
              <div>
                <label className="label">Delivery Status</label>
                <select name="status" defaultValue={activeShipment.status} className="input text-xs capitalize">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Origin City</label>
                <input name="origin" defaultValue={activeShipment.origin} required className="input text-xs" />
              </div>
              <div>
                <label className="label">Destination City</label>
                <input name="destination" defaultValue={activeShipment.destination} required className="input text-xs" />
              </div>
              <div>
                <label className="label">Consignor</label>
                <input name="consignor" defaultValue={activeShipment.consignor} required className="input text-xs" />
              </div>
              <div>
                <label className="label">Consignee</label>
                <input name="consignee" defaultValue={activeShipment.consignee} required className="input text-xs" />
              </div>
              <div>
                <label className="label">Driver Name</label>
                <input name="driver_name" defaultValue={activeShipment.driver_name || ""} className="input text-xs" />
              </div>
              <div>
                <label className="label">Driver Phone</label>
                <input name="driver_phone" defaultValue={activeShipment.driver_phone || ""} className="input text-xs" />
              </div>
            </div>

            <div>
              <label className="label">Update LR Copy File</label>
              <input type="file" onChange={handleLrFileUpload} className="block w-full text-xs text-slate-500" />
              {uploadingLr && <p className="text-xs text-brand-600 mt-1">Uploading...</p>}
              {(uploadedLrUrl || activeShipment.lr_copy_url) && (
                <p className="text-xs text-emerald-600 mt-1 font-bold">
                  ✓ Attached LR: {uploadedLrUrl || activeShipment.lr_copy_url}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary py-2 text-xs">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* TRACKING EVENT MODAL */}
      {modal === "event" && activeShipment && (
        <Modal title="Add Tracking Milestone Event" subtitle={`Shipment: ${activeShipment.tracking_number}`} onClose={() => setModal(null)}>
          <form onSubmit={addEvent} className="space-y-4">
            <div>
              <label className="label">New Milestone Status</label>
              <select name="status" defaultValue={activeShipment.status} className="input text-xs capitalize">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Current Location (City / Toll / Depot)</label>
              <input name="location" defaultValue={activeShipment.origin} required className="input text-xs" />
            </div>
            <div>
              <label className="label">Milestone Note</label>
              <textarea name="note" placeholder="e.g. Departed Hubli hub, driver en route to Pune" className="input text-xs" rows={3} required />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary py-2 text-xs">
                Add Milestone
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW ARTICLE MODAL */}
      {modal === "post" && (
        <Modal title="Publish New Article" subtitle="Add news update to website" onClose={() => setModal(null)}>
          <form onSubmit={createPost} className="space-y-4">
            <div>
              <label className="label">Article Title</label>
              <input name="title" required className="input text-xs" />
            </div>
            <div>
              <label className="label">Short Summary Excerpt</label>
              <textarea name="excerpt" required className="input text-xs" rows={2} />
            </div>
            <div>
              <label className="label">Full Markdown Content</label>
              <textarea name="content" required className="input text-xs font-mono" rows={6} />
            </div>
            <div>
              <label className="label">Tags (comma separated)</label>
              <input name="tags" placeholder="logistics, warehousing, hubli" className="input text-xs" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary py-2 text-xs">
                Publish Article
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW USER MODAL */}
      {modal === "user" && (
        <Modal title="Create User Account" subtitle="Assign staff or client credentials" onClose={() => setModal(null)}>
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input name="full_name" required className="input text-xs" />
            </div>
            <div>
              <label className="label">Email Address (Login Username)</label>
              <input name="email" type="email" required className="input text-xs" />
            </div>
            <div>
              <label className="label">Organization / Client Company</label>
              <input name="company" placeholder="Kalebudde Logistics / Asian Paints" className="input text-xs" />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" required className="input text-xs" minLength={6} />
            </div>
            <div>
              <label className="label">Access Role</label>
              <select name="role" className="input text-xs capitalize">
                <option value="staff">Staff (View / Edit / Upload / Export - No Delete)</option>
                <option value="admin">Administrator (Full Access + Deletion Rights)</option>
                <option value="client">Client Account (Read Own Consignments)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary py-2 text-xs">
                Create Account
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ----------------------------------------------------
// GLOBAL TRACKING TABLE COMPONENT (CLEAN UNCLUTTERED VIEW)
// ----------------------------------------------------
function ShipmentTable({
  shipments,
  userRole,
  onSelectDrawer,
  onEvent,
  onEdit,
  onDelete,
}: {
  shipments: Shipment[];
  userRole?: string;
  onSelectDrawer: (s: Shipment) => void;
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
              <th className="px-4 py-3.5">DELIVERY STATUS</th>
              <th className="px-4 py-3.5">LR NUMBER</th>
              <th className="px-4 py-3.5">ORIGIN ➔ DESTINATION</th>
              <th className="px-4 py-3.5">CONSIGNOR / CONSIGNEE</th>
              <th className="px-4 py-3.5">E-WAY BILL</th>
              <th className="px-4 py-3.5">E-WAY EXPIRY ALERT</th>
              <th className="px-4 py-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {shipments.map((s) => {
              const ewayInfo = getEwayExpiryInfo(s.eway_bill_expiry_date);

              return (
                <tr
                  key={s.id}
                  className={`transition ${ewayInfo.rowClass || "hover:bg-slate-50/80"}`}
                >
                  {/* DELIVERY STATUS */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>

                  {/* LR NUMBER (CLICK TO OPEN DRAWER) */}
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onSelectDrawer(s)}
                      className="font-mono font-extrabold text-brand-900 hover:text-accent-500 flex items-center gap-1.5 group transition"
                      title="Click to slide out complete details"
                    >
                      <Package size={14} className="text-brand-600 group-hover:scale-110 transition" />
                      <span>{s.tracking_number}</span>
                      <ChevronRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition" />
                    </button>
                    {s.invoice_number && (
                      <span className="text-[10px] text-slate-400 font-mono block">Inv: {s.invoice_number}</span>
                    )}
                  </td>

                  {/* ORIGIN ➔ DESTINATION */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span>{s.origin}</span>
                      <span className="text-brand-500">➔</span>
                      <span>{s.destination}</span>
                    </div>
                  </td>

                  {/* CONSIGNOR / CONSIGNEE */}
                  <td className="px-4 py-3.5">
                    <div className="max-w-[200px] truncate">
                      <span className="font-semibold text-slate-900 block truncate">{s.consignor}</span>
                      <span className="text-slate-500 text-[11px] block truncate">To: {s.consignee}</span>
                    </div>
                  </td>

                  {/* E-WAY BILL */}
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                    {s.eway_bill_number || "—"}
                  </td>

                  {/* E-WAY EXPIRY ALERT BADGE */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] ${ewayInfo.badgeClass}`}>
                      {ewayInfo.level === "expired" && <ShieldAlert size={12} />}
                      {ewayInfo.level === "expiring_24h" && <AlertTriangle size={12} />}
                      <span>{ewayInfo.text}</span>
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectDrawer(s)}
                        className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100 transition"
                        title="View Full Details Drawer"
                      >
                        Details
                      </button>

                      {s.lr_copy_url && (
                        <a
                          href={s.lr_copy_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100 transition"
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
                          className="rounded-lg border border-slate-200 bg-slate-100 p-1.5 text-slate-300 cursor-not-allowed opacity-50"
                          title="Deletion restricted to Admin role"
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
