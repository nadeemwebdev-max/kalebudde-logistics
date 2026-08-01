import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kl_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("kl_token");
      localStorage.removeItem("kl_user");
    }
    return Promise.reject(error);
  }
);

export type Role = "admin" | "staff" | "client";

export interface User {
  id: number;
  email: string;
  full_name: string;
  company: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export type ShipmentStatus =
  | "booked"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "on_hold"
  | "cancelled";

export interface TrackingEvent {
  id: number;
  status: ShipmentStatus;
  location: string;
  note: string | null;
  occurred_at: string;
}

export interface Shipment {
  id: number;
  tracking_number: string;
  client_id: number | null;
  consignor: string;
  consignee: string;
  origin: string;
  destination: string;
  commodity: string | null;
  weight_kg: number | null;
  packages: number | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  eway_bill_number: string | null;
  eway_bill_date: string | null;
  eway_bill_expiry_date: string | null;
  auto_extend_eway: boolean;
  invoice_number: string | null;
  lr_number: string | null;
  lr_copy_url: string | null;
  status: ShipmentStatus;
  eta: string | null;
  created_at: string;
  updated_at: string;
  events: TrackingEvent[];
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  author: string;
  tags: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  published_at: string;
}

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  booked: "Booked",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<ShipmentStatus, string> = {
  booked: "bg-slate-100 text-slate-700",
  picked_up: "bg-blue-100 text-blue-700",
  in_transit: "bg-brand-100 text-brand-700",
  out_for_delivery: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-500",
};

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const uploadLrCopy = async (file: File): Promise<{ lr_copy_url: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/shipments/upload-lr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const notifyEwayExpiry = async () => {
  const res = await api.post("/api/admin/notify-eway-expiry");
  return res.data;
};

export const testTelegram = async (botToken?: string, chatId?: string) => {
  const res = await api.post("/api/admin/test-telegram", {
    bot_token: botToken,
    chat_id: chatId,
  });
  return res.data;
};

export const getTelegramConfig = async () => {
  const res = await api.get("/api/admin/telegram-config");
  return res.data;
};

export const saveTelegramConfig = async (
  botToken: string,
  chatId: string,
  thresholdHours: number = 48
) => {
  const res = await api.post("/api/admin/telegram-config", {
    bot_token: botToken,
    chat_id: chatId,
    threshold_hours: thresholdHours,
  });
  return res.data;
};

