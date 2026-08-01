# Kalebudde Logistics — Full Stack Website + Logistics Management System

Modern marketing website **and** a role-based logistics management system for
**Kalebudde Logistics** (est. 2014, built on Kalebudde Warehousing, 1999).

**Stack:** React 19 + TypeScript + Tailwind CSS · FastAPI (Python) · PostgreSQL · Docker

---

## Quick start

### Option A — Docker (Postgres, production-style)

```bash
cd kalebudde
docker compose up --build
```

| Service  | URL                            |
| -------- | ------------------------------ |
| Website  | http://localhost:8080          |
| API docs | http://localhost:8000/docs     |
| Postgres | localhost:5432                 |

### Option B — Local dev (SQLite fallback, no DB setup needed)

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload            # http://localhost:8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                              # http://localhost:5173
```

The Vite dev server proxies `/api`, `/sitemap.xml` and `/robots.txt` to port 8000.
On first boot the API auto-creates tables and seeds demo users, shipments and blog posts.

---

## Demo accounts & privilege levels

| Role      | Email                            | Password     | Privileges |
| --------- | -------------------------------- | ------------ | ---------- |
| **Admin** | admin@kalebuddelogistics.in      | `Admin@12345`  | Everything + user management (create users, change roles, enable/disable) |
| **Staff** | staff@kalebuddelogistics.in      | `Staff@12345`  | Shipments, tracking events, blog, quote requests. **No** user management |
| **Client**| client@example.com               | `Client@12345` | Read-only view of **their own** shipments and tracking history |

Public self-registration always creates a limited **client** account — roles can only be
elevated by an admin. Enforcement is server-side (`require_admin` / `require_staff`
dependencies), not just hidden in the UI.

Demo tracking numbers: `KL100000001`, `KL100000002`, `KL100000003`

> ⚠️ Change `SECRET_KEY` and all seed passwords before going live. See `backend/.env.example`.

---

## Features

### Public website
- **Home** — hero with branded fleet imagery, inline tracker, services, why-us, animated client marquee, CTA
- **About** — company history, mission, core values, and a full **founder biography for Farooque Kalebudde**
- **Services** — freight forwarding, warehousing, relocation, project logistics
- **Fleet** — vehicle types with Kalebudde-branded truck photography
- **Clients** — Asian Paints, Cadbury, Southern Ferro, Yaara, Parekh Group, Indian Oil, Walkaroo, TVS Supply Chain, DS Group
- **Blog** — searchable listing + article pages (3 SEO articles seeded)
- **Contact** — free-quote form that writes to the database
- Fully responsive, sticky nav, mobile menu, 404 page

### Tracking
- Public tracker: no login needed, returns a **trimmed payload** (no consignor/consignee/driver PII)
- Visual timeline of timestamped tracking events
- Staff can append tracking updates, which auto-advance shipment status

### Management system (`/admin`, `/dashboard`)
- Dashboard stats: total / in-transit / delivered / on-hold shipments, open quotes, client count
- Shipment CRUD with auto-generated `KL#########` tracking numbers
- Tracking event timeline management
- Quote request inbox with handled/open state
- Blog authoring (markdown, cover image, tags, meta description)
- User administration with inline role switching (admin only)

### SEO
- Unique title, meta description, canonical, Open Graph + Twitter Card per route
- **JSON-LD structured data**: `MovingCompany` (with `founder`), `AboutPage`, `ItemList` of services, `Blog`, `BlogPosting`, `ContactPage`
- **Dynamic `/sitemap.xml`** — static routes plus every published blog post with `lastmod`
- **`/robots.txt`** — disallows `/admin`, `/dashboard`, `/api/`; points to the sitemap
- Private routes explicitly `noindex, nofollow`
- Performance: route-level code splitting, gzip on API + nginx, immutable asset caching, font preconnect, `fetchPriority` on the LCP hero image, lazy loading + explicit dimensions elsewhere (avoids CLS)
- Semantic HTML, alt text on every image, accessible labels and ARIA states

---

## Project structure

```
kalebudde/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py          # app factory, CORS, gzip, lifespan
│       ├── models.py        # User, Shipment, TrackingEvent, BlogPost, QuoteRequest
│       ├── schemas.py       # Pydantic v2 models
│       ├── deps.py          # JWT auth + role guards
│       ├── seed.py          # idempotent demo data
│       ├── core/            # config, security (bcrypt + JWT)
│       └── routers/         # auth, shipments, blog, admin, seo
└── frontend/
    ├── Dockerfile, nginx.conf, tailwind.config.js, vite.config.ts
    └── src/
        ├── components/      # Layout, Seo, TrackWidget
        ├── lib/             # api client, auth context, clients data
        └── pages/           # Home, About, Services, Fleet, Clients,
                             # Track, Blog, BlogPostPage, Contact,
                             # Login, Register, ClientDashboard, AdminDashboard
```

---

## API overview

Interactive docs at `/docs`.

| Method | Endpoint | Access |
| ------ | -------- | ------ |
| `POST` | `/api/auth/register` | Public (creates client) |
| `POST` | `/api/auth/login` | Public |
| `GET`  | `/api/auth/me` | Authenticated |
| `GET`  | `/api/track/{tracking_number}` | **Public** |
| `GET`  | `/api/shipments` | Auth (clients see only their own) |
| `POST` `PATCH` `DELETE` | `/api/shipments/...` | Staff / Admin |
| `POST` | `/api/shipments/{id}/events` | Staff / Admin |
| `GET`  | `/api/blog`, `/api/blog/{slug}` | Public |
| `POST` `PATCH` `DELETE` | `/api/blog/...` | Staff / Admin |
| `POST` | `/api/quotes` | Public |
| `GET` `PATCH` | `/api/quotes` | Staff / Admin |
| `GET`  | `/api/stats` | Staff / Admin |
| `GET` `POST` `PATCH` `DELETE` | `/api/users` | **Admin only** |
| `GET`  | `/sitemap.xml`, `/robots.txt` | Public |

---

## Images

The truck, fleet, warehouse and founder images in `frontend/public/images/` are
**AI-generated placeholders** showing "KALEBUDDE LOGISTICS" branding. Replace them with
real photography before launch (keep the same filenames and no code changes are needed).
The founder biography is a professional draft — please review and send corrections.

## Production checklist

- [ ] Replace `SECRET_KEY` (`openssl rand -hex 32`) and all seed passwords
- [ ] Point `DATABASE_URL` at managed Postgres; restrict `CORS_ORIGINS`
- [ ] Swap AI placeholder images for real photography and client logos
- [ ] Review the founder biography and company contact details (phone/address are placeholders)
- [ ] Add Alembic migrations for schema changes (`alembic` is already a dependency)
- [ ] Serve over HTTPS and submit `sitemap.xml` to Google Search Console
