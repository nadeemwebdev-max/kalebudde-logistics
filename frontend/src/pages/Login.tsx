import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Seo from "../components/Seo";
import { Logo } from "../components/Layout";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(email, password);
      nav(user.role === "client" ? "/dashboard" : "/admin", { replace: true });
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo
        title="Login | Kalebudde Logistics Management System"
        description="Secure login for Kalebudde Logistics administrators, operations staff and clients."
        path="/login"
        noindex
      />
      <section className="container-x grid max-w-5xl gap-10 py-16 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-8 shadow-sm">
          <Logo />
          <h1 className="mt-8 font-display text-2xl font-bold text-brand-900">
            Sign in to your account
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Access your shipments, tracking history and management tools.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <button disabled={busy} className="btn-primary w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New client?{" "}
            <Link to="/register" className="font-semibold text-accent-500">
              Create an account
            </Link>
          </p>
        </div>

        <div className="rounded-2xl bg-brand-950 p-8 text-white flex flex-col justify-between shadow-xl border border-brand-900">
          <div>
            <div className="flex items-center gap-2 text-accent-400 text-xs font-extrabold uppercase tracking-widest">
              Kalebudde Logistics Management Portal
            </div>
            <h2 className="font-display text-2xl font-extrabold text-white mt-3">
              Operations &amp; Consignment Control
            </h2>
            <p className="mt-3 text-sm text-brand-200 leading-relaxed">
              Welcome to the official logistics management system of Kalebudde Logistics. Secure portal for operational tracking, consignment dispatches, e-way bill compliance, and management control.
            </p>
          </div>

          <div className="mt-8 space-y-4 pt-6 border-t border-brand-900/80 text-xs text-brand-200">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <span>Protected by Enterprise TLS 256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <span>24/7 Automated E-Way Bill Expiry Compliance Alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <span>Role-Based Access Control (Admin, Staff, Client)</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
