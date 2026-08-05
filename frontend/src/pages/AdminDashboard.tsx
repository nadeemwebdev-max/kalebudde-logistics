import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
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
  const [toast, setToast] = useState("");
  const [uploadingLr, setUploadingLr] = useState(false);
  const [uploadedLrUrl, setUploadedLrUrl] = useState<string | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);

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

  const triggerEwayExpiryCheck = async () => {
    setNotifyingEway(true);
    try {
      const res = await notifyEwayExpiry();
      flash(res.message || `Dispatched ${res.notified_count} E-Way Bill expiry alerts to Telegram!`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error dispatching Telegram alerts");
    } finally {
      setNotifyingEway(false);
    }
  };

  const createShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      await api.post("/api/shipments", {
        consignor: data.get("consignor"),
        consignee: data.get("consignee"),
        origin: data.get("origin"),
        destination: data.get("destination"),
        commodity: data.get("commodity") || null,
        weight_kg: data.get("weight_kg") ? Number(data.get("weight_kg")) : null,
        packages: data.get("packages") ? Number(data.get("packages")) : null,
        vehicle_number: data.get("vehicle_number") || null,
        driver_name: data.get("driver_name") || null,
        driver_phone: data.get("driver_phone") || null,
        eway_bill_number: data.get("eway_bill_number") || null,
        eway_bill_date: data.get("eway_bill_date") || null,
        eway_bill_expiry_date: data.get("eway_bill_expiry_date") || null,
        eway_bill_status: data.get("eway_bill_status") || "VEHICLE NUMBER UPDATED",
        new_extended_eway_bill_date: data.get("new_extended_eway_bill_date") || null,
        invoice_number: data.get("invoice_number") || null,
        invoice_date: data.get("invoice_date") || null,
        lr_number: data.get("lr_number") || null,
        lr_copy_url: uploadedLrUrl || null,
        status: data.get("status") || "booked",
        eta: data.get("eta") || null,
      });
      flash("Consignment created successfully");
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
        consignor: data.get("consignor"),
        consignee: data.get("consignee"),
        origin: data.get("origin"),
        destination: data.get("destination"),
        commodity: data.get("commodity") || null,
        vehicle_number: data.get("vehicle_number") || null,
        driver_name: data.get("driver_name") || null,
        driver_phone: data.get("driver_phone") || null,
        eway_bill_number: data.get("eway_bill_number") || null,
        eway_bill_date: data.get("eway_bill_date") || null,
        eway_bill_expiry_date: data.get("eway_bill_expiry_date") || null,
        eway_bill_status: data.get("eway_bill_status") || "VEHICLE NUMBER UPDATED",
        new_extended_eway_bill_date: data.get("new_extended_eway_bill_date") || null,
        invoice_number: data.get("invoice_number") || null,
        invoice_date: data.get("invoice_date") || null,
        lr_number: data.get("lr_number") || null,
        lr_copy_url: uploadedLrUrl || activeShipment.lr_copy_url,
        status: data.get("status"),
      });
      flash("Consignment updated successfully");
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
        note: data.get("note") || null,
      });
      flash("Tracking milestone posted");
      setModal(null);
      setActiveShipment(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add milestone");
    }
  };

  const deleteShipment = async (id: number) => {
    if (!isAdmin) {
      alert("Permission Denied: Only Administrator accounts can delete consignment records.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this consignment?")) return;
    try {
      await api.delete(`/api/shipments/${id}`);
      flash("Consignment deleted");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete shipment");
    }
  };

  const handleLrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLr(true);
    try {
      const res = await uploadLrCopy(file);
      setUploadedLrUrl(res.lr_copy_url);
      flash("LR Document uploaded successfully");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to upload LR file");
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
      flash(res.message || "Excel/CSV shipments imported successfully!");
      setModal(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to import Excel file. Check file headers.");
    } finally {
      setUploadingExcel(false);
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

  const toggleQuoteHandled = async (q: Quote) => {
    try {
      await api.patch(`/api/quotes/${q.id}`, { handled: !q.handled });
      loadData();
    } catch {
      /* fail */
    }
  };

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      searchTerm === "" ||
      s.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.invoice_number && s.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.eway_bill_number && s.eway_bill_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.consignor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.driver_name && s.driver_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-24 font-sans">
      <Seo
        title="Admin Control Center | Kalebudde Logistics"
        description="Manage pan-India freight operations, E-way bill monitoring, quotes, blogs and users."
        path="/admin"
        noindex
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-2xl bg-brand-900 text-white px-5 py-3.5 shadow-2xl border border-brand-700 animate-slide-up text-xs font-bold">
          <Sparkles className="text-accent-400" size={16} />
          {toast}
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-white border-b border-slate-200 py-6 shadow-sm">
        <div className="container-x flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <span>Kalebudde Operations Portal</span>
              <span>•</span>
              <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live DB Sync
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Admin &amp; Logistics Control Panel
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isAdmin && (
              <button
                onClick={() => setModal("telegram_settings")}
                className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-200 transition"
              >
                <BellRing size={15} className="text-brand-600" />
                <span>Telegram Bot Alert</span>
              </button>
            )}

            <button
              onClick={triggerEwayExpiryCheck}
              disabled={notifyingEway}
              className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-xs font-bold text-amber-700 border border-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50"
            >
              <ShieldAlert size={15} className={notifyingEway ? "animate-spin" : ""} />
              <span>{notifyingEway ? "Checking..." : "E-Way Bill 24h Alerts"}</span>
            </button>

            <button
              onClick={() => {
                setUploadedLrUrl(null);
                setModal("shipment");
              }}
              className="flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-800 transition"
            >
              <Plus size={16} /> New Consignment
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="container-x mt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
          {[
            ["overview", "Dashboard Overview", Inbox],
            ["shipments", `Consignments (${shipments.length})`, Truck],
            ["quotes", `Quote Inquiries (${quotes.filter((q) => !q.handled).length})`, FileText],
            ["blog", "Blog Articles", Sparkles],
            ...(isAdmin ? [["users", `Team Users (${users.length})`, Users]] : []),
          ].map(([id, label, IconComponent]) => {
            const IconElement = IconComponent as typeof Truck;
            const active = tab === id;
            return (
              <button
                key={id as string}
                onClick={() => setTab(id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 ${
                  active
                    ? "bg-white text-brand-900 shadow-sm border border-slate-300 font-extrabold"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                <IconElement size={15} className={active ? "text-accent-500" : "text-slate-400"} />
                {label as string}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && stats && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Total Consignments", stats.total_shipments, "Pan-India active", Package, "bg-brand-50 text-brand-700 border-brand-200"],
                ["In Transit", stats.in_transit, "On national highways", Truck, "bg-blue-50 text-blue-700 border-blue-200"],
                ["Delivered Clean", stats.delivered, "POD verified", CheckCircle2, "bg-emerald-50 text-emerald-700 border-emerald-200"],
                ["Pending / On Hold", stats.on_hold, "Requires attention", AlertTriangle, "bg-rose-50 text-rose-700 border-rose-200"],
              ].map(([t, v, sub, IconComponent, color]) => {
                const IconElement = IconComponent as typeof Package;
                return (
                  <div
                    key={t as string}
                    className={`rounded-2xl border p-5 bg-white shadow-sm flex items-start justify-between`}
                  >
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
                <h2 className="font-display text-base font-bold text-slate-900">Recent Consignments</h2>
                <button onClick={() => setTab("shipments")} className="text-xs font-bold text-brand-600 hover:underline">
                  View All ({shipments.length})
                </button>
              </div>
              <ShipmentTable
                shipments={shipments.slice(0, 5)}
                userRole={user?.role}
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

        {/* TAB 2: SHIPMENTS TABLE WITH EXCEL/CSV IMPORT & EXPORT */}
        {tab === "shipments" && (
          <div className="mt-6 space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[240px]">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Invoice, E-Way Bill, Tracking No, Consignor, Consignee, Driver..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

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
              </div>

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

            {/* Shipment Spreadsheet Table */}
            <ShipmentTable
              shipments={filteredShipments}
              userRole={user?.role}
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
