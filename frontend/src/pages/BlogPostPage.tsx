import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import Seo from "../components/Seo";
import { api, type BlogPost } from "../lib/api";

/** Minimal, dependency-free markdown subset renderer (headings, lists, bold, links, paragraphs). */
function renderMarkdown(md: string) {
  const inline = (t: string) =>
    t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(
        /\[(.+?)\]\((.+?)\)/g,
        '<a class="text-accent-500 font-medium underline" href="$2">$1</a>'
      );

  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      out.push(
        `<h3 class="mt-8 mb-3 font-display text-xl font-bold text-brand-900">${inline(line.slice(4))}</h3>`
      );
    } else if (line.startsWith("## ")) {
      closeList();
      out.push(
        `<h2 class="mt-10 mb-4 font-display text-2xl font-bold text-brand-900">${inline(line.slice(3))}</h2>`
      );
    } else if (line.startsWith("- ")) {
      if (!inList) {
        out.push('<ul class="my-4 list-disc space-y-2 pl-6 text-slate-700">');
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else {
      closeList();
      out.push(`<p class="my-4 leading-relaxed text-slate-700">${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("");
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPost(null);
    setNotFound(false);
    api
      .get<BlogPost>(`/api/blog/${slug}`)
      .then(({ data }) => setPost(data))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound)
    return (
      <div className="container-x py-28 text-center">
        <Seo title="Article not found | Kalebudde Logistics" description="Article not found." path={`/blog/${slug}`} noindex />
        <h1 className="h2">Article not found</h1>
        <Link to="/blog" className="btn-primary mt-6">
          Back to blog
        </Link>
      </div>
    );

  if (!post)
    return <div className="container-x py-28 text-center text-slate-500">Loading…</div>;

  const date = new Date(post.published_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Seo
        title={post.meta_title || `${post.title} | Kalebudde Logistics`}
        description={post.meta_description || post.excerpt}
        path={`/blog/${post.slug}`}
        image={post.cover_image || "/images/hero-truck.png"}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          image: `https://kalebuddelogistics.in${post.cover_image || "/images/hero-truck.png"}`,
          datePublished: post.published_at,
          author: { "@type": "Person", name: post.author },
          publisher: { "@type": "Organization", name: "Kalebudde Logistics" },
          mainEntityOfPage: `https://kalebuddelogistics.in/blog/${post.slug}`,
        }}
      />

      <article className="container-x max-w-3xl py-14">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-accent-500"
        >
          <ArrowLeft size={15} /> All articles
        </Link>

        <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight text-brand-900 sm:text-4xl">
          {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <User size={14} /> {post.author}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} /> {date}
          </span>
        </div>

        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="mt-8 w-full rounded-2xl object-cover shadow-lg"
            width={1200}
            height={630}
          />
        )}

        <div
          className="mt-8"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        {post.tags && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
            {post.tags.split(",").map((t) => (
              <span key={t} className="badge bg-slate-100 text-slate-600">
                #{t.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl bg-brand-900 p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-white">
            Need a logistics partner you can rely on?
          </h2>
          <Link to="/contact" className="btn-primary mt-6">
            Get a free quote
          </Link>
        </div>
      </article>
    </>
  );
}
