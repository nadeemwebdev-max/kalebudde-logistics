import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

import Seo from "../components/Seo";
import { api, type BlogPost } from "../lib/api";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .get<BlogPost[]>("/api/blog")
      .then(({ data }) => setPosts(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <Seo
        title="Logistics Insights & Blog | Kalebudde Logistics"
        description="Practical articles on freight cost optimisation, warehousing best practices and supply chain management in India, from the Kalebudde Logistics team."
        path="/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Kalebudde Logistics Insights",
          url: "https://kalebuddelogistics.in/blog",
        }}
      />

      <section className="bg-brand-900 py-16">
        <div className="container-x">
          <p className="eyebrow">Insights</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold text-white sm:text-5xl">
            Logistics knowledge, minus the jargon
          </h1>
          <p className="mt-4 max-w-2xl text-brand-100">
            Practical guidance on freight, warehousing and supply chain operations in India.
          </p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            className="input mt-8 max-w-md !bg-white/95"
          />
        </div>
      </section>

      <section className="container-x py-20">
        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-slate-500">No articles found.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <article key={p.id} className="card !p-0 flex flex-col overflow-hidden">
                <Link to={`/blog/${p.slug}`}>
                  <img
                    src={p.cover_image || "/images/hero-truck.jpg"}
                    alt={p.title}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-6">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarDays size={13} /> {fmt(p.published_at)}
                  </p>
                  <h2 className="mt-2 font-display text-lg font-bold leading-snug text-brand-900">
                    <Link to={`/blog/${p.slug}`} className="hover:text-accent-500">
                      {p.title}
                    </Link>
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                    {p.excerpt}
                  </p>
                  <Link
                    to={`/blog/${p.slug}`}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent-500"
                  >
                    Read article <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
