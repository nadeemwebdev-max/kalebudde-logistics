from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models import BlogPost

router = APIRouter(tags=["seo"])

STATIC_ROUTES = [
    ("/", "1.0", "weekly"),
    ("/about", "0.8", "monthly"),
    ("/services", "0.9", "monthly"),
    ("/fleet", "0.7", "monthly"),
    ("/clients", "0.6", "monthly"),
    ("/track", "0.9", "weekly"),
    ("/blog", "0.8", "daily"),
    ("/contact", "0.7", "monthly"),
]


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)):
    base = settings.SITE_URL.rstrip("/")
    urls = [
        f"<url><loc>{base}{path}</loc><changefreq>{cf}</changefreq>"
        f"<priority>{pr}</priority></url>"
        for path, pr, cf in STATIC_ROUTES
    ]
    for post in db.query(BlogPost).filter(BlogPost.published.is_(True)).all():
        urls.append(
            f"<url><loc>{base}/blog/{post.slug}</loc>"
            f"<lastmod>{post.updated_at.date().isoformat()}</lastmod>"
            f"<changefreq>monthly</changefreq><priority>0.7</priority></url>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(urls)
        + "</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt", include_in_schema=False)
def robots():
    base = settings.SITE_URL.rstrip("/")
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /dashboard\n"
        "Disallow: /api/\n\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )
    return Response(content=body, media_type="text/plain")
