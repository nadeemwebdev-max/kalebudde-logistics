import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Mail, MapPin, Menu, Phone, Truck, User, X } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../lib/auth";

const FacebookIcon = (p: { size?: number }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z" />
  </svg>
);

const LinkedinIcon = (p: { size?: number }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.75-1.95 4 0 4.4 2.5 4.4 5.9V21h-4v-5.5c0-1.3-.02-3-1.9-3-1.9 0-2.2 1.4-2.2 2.9V21H9z" />
  </svg>
);

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/fleet", label: "Fleet" },
  { to: "/clients", label: "Clients" },
  { to: "/track", label: "Track" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

export function Logo({
  light = false,
  stacked = false,
  className = "",
}: {
  light?: boolean;
  stacked?: boolean;
  className?: string;
}) {
  if (stacked) {
    return (
      <Link to="/" className={`flex flex-col items-center justify-center group ${className}`} aria-label="Kalebudde Logistics home">
        <img
          src={light ? "/logo-white.png" : "/logo.png"}
          alt="Kalebudde Logistics Royal Crest"
          className="h-20 w-auto object-contain transition group-hover:scale-105"
        />
        <div className="mt-2 text-center leading-none">
          <span
            className={`block font-display text-base sm:text-lg font-extrabold tracking-wider ${
              light ? "text-white" : "text-brand-900"
            }`}
          >
            KALEBUDDE
          </span>
          <span className="mt-0.5 block text-[10px] sm:text-[11px] font-bold tracking-[0.35em] text-accent-500">
            LOGISTICS
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/" className={`flex items-center gap-3.5 group ${className}`} aria-label="Kalebudde Logistics home">
      <img
        src={light ? "/logo-white.png" : "/logo.png"}
        alt="Kalebudde Logistics Royal Crest"
        className="h-16 max-h-16 w-auto object-contain py-0.5 transition group-hover:scale-105"
      />
      <div className="leading-tight">
        <span
          className={`block font-display text-lg sm:text-xl font-extrabold tracking-tight ${
            light ? "text-white" : "text-brand-900"
          }`}
        >
          KALEBUDDE
        </span>
        <span className="block text-[10px] sm:text-[11px] font-bold tracking-[0.32em] text-accent-500">
          LOGISTICS
        </span>
      </div>
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const isDashboardRoute = pathname.startsWith("/admin") || pathname.startsWith("/dashboard");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 shadow-md backdrop-blur" : "bg-white"
      }`}
    >
      <div className="hidden bg-brand-900 py-2 text-xs text-brand-100 lg:block">
        <div className="container-x flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="tel:+918494941838" className="flex items-center gap-1.5 hover:text-white transition">
              <Phone size={13} /> +91-8494941838
            </a>
            <a href="mailto:kalebuddelogistics@gmail.com" className="flex items-center gap-1.5 hover:text-white transition">
              <Mail size={13} /> kalebuddelogistics@gmail.com
            </a>
          </div>
          <a
            href="https://www.google.com/maps/dir//Kalebudde+Warehouse,+845W%2B5X7,+NH+48,+Hubali-Dharwad,+Dharwad,+Narayanapura,+Karnataka+580028/@15.4630869,74.9976658,13z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bb8d78c191e716b:0xc40f9bf617a597e6!2m2!1d75.1474435!2d15.3079081?hl=en-IN&entry=ttu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition"
          >
            <MapPin size={13} className="text-accent-400" /> 75/2B Kalebudde Warehouse Compound, P.B.Road Gabbur Hubli-580029
          </a>
        </div>
      </div>

      <nav className="container-x flex h-[80px] items-center justify-between">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    isActive
                      ? "text-accent-500 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-brand-800"
                  }`
                }
              >
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          {isDashboardRoute && user ? (
            <>
              <Link
                to="/"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                🌐 View Website
              </Link>
              <Link
                to={user.role === "client" ? "/dashboard" : "/admin"}
                className="flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-900/20 hover:bg-brand-800 transition"
              >
                <LayoutDashboard size={15} className="text-accent-400" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <LogOut size={14} className="text-slate-500" /> Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-brand-900 hover:bg-slate-100 transition"
              >
                Sign In
              </Link>
              <Link to="/contact" className="btn-primary !py-2.5 !px-5">
                Get a Free Quote
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <ul className="container-x flex flex-col py-3">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.to === "/"}
                  className="block border-b border-slate-50 py-3 text-sm font-medium text-slate-700"
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
            <li className="mt-3 flex gap-3">
              {isDashboardRoute && user ? (
                <>
                  <Link
                    to={user.role === "client" ? "/dashboard" : "/admin"}
                    className="flex-1 rounded-xl bg-brand-900 py-3 text-center text-xs font-bold text-white shadow-md flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard size={15} className="text-accent-400" /> Dashboard
                  </Link>
                  <button onClick={logout} className="flex-1 rounded-xl border border-slate-300 py-3 text-xs font-bold text-slate-700">
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex-1 rounded-xl border border-slate-300 py-3 text-center text-xs font-bold text-slate-700">
                    Login
                  </Link>
                  <Link to="/contact" className="btn-primary flex-1 text-center">
                    Free Quote
                  </Link>
                </>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 bg-brand-900 text-brand-100">
      <div className="container-x grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-brand-200">
            Established in 2014 and built on the legacy of Kalebudde Warehousing (1999),
            we deliver efficient, secure and cost-effective transportation throughout India.
          </p>
          <div className="mt-5 flex gap-3">
            <a href="#" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-accent-500">
              <FacebookIcon size={16} />
            </a>
            <a href="#" aria-label="LinkedIn" className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-accent-500">
              <LinkedinIcon size={16} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
            Company
          </h3>
          <ul className="space-y-2.5 text-sm">
            {[
              ["/about", "About Us"],
              ["/fleet", "Our Fleet"],
              ["/clients", "Our Clients"],
              ["/blog", "Insights & Blog"],
              ["/contact", "Contact"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-accent-400">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
            Services
          </h3>
          <ul className="space-y-2.5 text-sm">
            {[
              "Domestic Freight Forwarding",
              "Warehousing",
              "Relocation Services",
              "Project Logistics Management",
            ].map((s) => (
              <li key={s}>
                <Link to="/services" className="hover:text-accent-400">
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
            Get in touch
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-accent-400" />
              <a
                href="https://www.google.com/maps/dir//Kalebudde+Warehouse,+845W%2B5X7,+NH+48,+Hubali-Dharwad,+Dharwad,+Narayanapura,+Karnataka+580028/@15.4630869,74.9976658,13z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bb8d78c191e716b:0xc40f9bf617a597e6!2m2!1d75.1474435!2d15.3079081?hl=en-IN&entry=ttu"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent-400 transition"
              >
                75/2B Kalebudde Warehouse Compound, P.B.Road Gabbur Hubli-580029
              </a>
            </li>
            <li className="flex gap-2.5">
              <Phone size={16} className="mt-0.5 shrink-0 text-accent-400" />
              <a href="tel:+918494941838" className="hover:text-accent-400 transition">
                +91-8494941838
              </a>
            </li>
            <li className="flex gap-2.5">
              <Mail size={16} className="mt-0.5 shrink-0 text-accent-400" />
              <a href="mailto:kalebuddelogistics@gmail.com" className="hover:text-accent-400 transition">
                kalebuddelogistics@gmail.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-xs text-brand-300">
        <div className="container-x flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Kalebudde Logistics. All rights reserved.</p>
          <p className="text-brand-200 font-medium">
            Website Designed &amp; Developed by{" "}
            <a
              href="tel:+919738241415"
              className="font-bold text-accent-400 hover:text-accent-300 transition hover:underline"
              title="Contact Developer Nadeem Halhbavi"
            >
              Nadeem Halhbavi (+91 97382 41415)
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
