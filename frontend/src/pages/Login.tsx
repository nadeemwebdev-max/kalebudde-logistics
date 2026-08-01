import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Seo from "../components/Seo";
import { Logo } from "../components/Layout";
import { useAuth } from "../lib/auth";

const DEMO = [
  ["Administrator", "admin@kalebuddelogistics.in", "Admin@12345", "Full control: users, shipments, blog, quotes"],
  ["Operations staff", "staff@kalebuddelogistics.in", "Staff@12345", "Shipments, tracking events, blog, quotes"],
  ["Client", "client@example.com", "Client@12345", "Read-only view of their own shipments"],
];

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

        <div className="rounded-2xl bg-slate-50 p-8">
          <h2 className="font-display text-lg font-bold text-brand-900">
            Demo accounts &amp; privileges
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Three role levels are built into the management system.
          </p>
          <ul className="mt-6 space-y-4">
            {DEMO.map(([role, mail, pass, perms]) => (
              <li key={mail} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-display font-bold text-brand-900">{role}</p>
                <p className="mt-1 text-xs text-slate-500">{perms}</p>
                <button
                  onClick={() => {
                    setEmail(mail);
                    setPassword(pass);
                  }}
                  className="mt-3 text-xs font-semibold text-accent-500 underline"
                >
                  Use {mail}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
