import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Seo from "../components/Seo";
import { Logo } from "../components/Layout";
import { useAuth } from "../lib/auth";

export default function Register() {
  const { register, login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<
      string,
      string
    >;
    try {
      await register({
        email: fd.email,
        password: fd.password,
        full_name: fd.full_name,
        company: fd.company,
      });
      await login(fd.email, fd.password);
      nav("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo
        title="Create a Client Account | Kalebudde Logistics"
        description="Register for a Kalebudde Logistics client account to track your shipments online."
        path="/register"
        noindex
      />
      <section className="container-x max-w-lg py-16">
        <div className="rounded-2xl border border-slate-200 p-8 shadow-sm">
          <Logo />
          <h1 className="mt-8 font-display text-2xl font-bold text-brand-900">
            Create your client account
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Client accounts have read-only access to their own shipments and tracking
            history.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="label" htmlFor="full_name">Full name</label>
              <input id="full_name" name="full_name" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="company">Company</label>
              <input id="company" name="company" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="input"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <button disabled={busy} className="btn-primary w-full">
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-accent-500">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
