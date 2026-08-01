import { useEffect } from "react";

const SITE = "https://kalebuddelogistics.in";

/** Upsert a <meta> tag by name or property. */
function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function Seo({
  title,
  description,
  path = "/",
  image = "/images/hero-truck.jpg",
  type = "website",
  jsonLd,
  noindex,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}) {
  const url = `${SITE}${path}`;
  const img = image.startsWith("http") ? image : `${SITE}${image}`;
  const ld = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"
    );
    setLink("canonical", url);

    setMeta("property", "og:type", type);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("property", "og:site_name", "Kalebudde Logistics");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img);
  }, [title, description, url, img, type, noindex]);

  useEffect(() => {
    if (!ld) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seo = "route";
    script.textContent = ld;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [ld]);

  return null;
}
