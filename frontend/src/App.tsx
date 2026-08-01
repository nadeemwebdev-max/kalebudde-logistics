import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import Seo from "./components/Seo";
import Home from "./pages/Home";
import { RequireAuth } from "./lib/auth";

const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Fleet = lazy(() => import("./pages/Fleet"));
const Clients = lazy(() => import("./pages/Clients"));
const Track = lazy(() => import("./pages/Track"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

function NotFound() {
  return (
    <div className="container-x py-28 text-center">
      <Seo title="Page not found | Kalebudde Logistics" description="Page not found." path="/404" noindex />
      <p className="font-display text-6xl font-extrabold text-accent-500">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-brand-900">
        This page has taken a wrong turn
      </h1>
      <Link to="/" className="btn-primary mt-7">
        Back to home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={<div className="flex min-h-[60vh] items-center justify-center text-slate-400">Loading…</div>}
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="services" element={<Services />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="clients" element={<Clients />} />
          <Route path="track" element={<Track />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPostPage />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth>
                <ClientDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="admin"
            element={
              <RequireAuth roles={["admin", "staff"]}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
