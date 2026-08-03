"""Idempotent demo/seed data: admin + staff + client users, shipments, blog posts."""
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.models import BlogPost, Role, Shipment, ShipmentStatus, TrackingEvent, User

POSTS = [
    dict(
        slug="reduce-freight-costs-india-2026",
        title="7 Proven Ways to Reduce Freight Costs in India in 2026",
        excerpt="From lane consolidation to GST-smart routing, here are seven levers "
                "Indian shippers can pull to cut landed transport cost without "
                "sacrificing service levels.",
        tags="freight,cost-optimisation,supply-chain",
        meta_description="Practical guide to reducing domestic freight costs in India: "
                         "load consolidation, route optimisation, warehousing strategy "
                         "and carrier negotiation tips from Kalebudde Logistics.",
        cover_image="/images/fleet.jpg",
        content="""## Why freight cost control matters more than ever

Domestic road freight in India accounts for roughly two-thirds of all cargo movement.
For most manufacturers and distributors, transport is the second-largest controllable
cost after raw material. Small structural changes compound quickly.

### 1. Consolidate lanes before you negotiate rates
Carriers price risk and empty-return kilometres. When you commit predictable volume on a
defined lane, you take that risk away and unlock a better rate.

### 2. Move from ad-hoc FTL to a planned mix of FTL and PTL
Part-truck-load makes sense below roughly 60% cube utilisation. Above that, full truck
load is almost always cheaper per tonne-kilometre.

### 3. Right-size your packaging
Volumetric weight quietly inflates invoices. A 5% reduction in carton dimensions often
adds one more pallet layer per trailer.

### 4. Use regional warehousing to shorten the final leg
Post-GST, warehouse placement is a network-design decision, not a tax decision. A single
well-placed hub can cut secondary freight by 15-20%.

### 5. Track everything and act on exceptions
Detention, multi-point unloading and waiting charges are where budgets leak. Real-time
tracking with timestamped events lets you challenge charges with evidence.

### 6. Plan around seasonality
Rates spike before festive season and at quarter close. Booking capacity two to three
weeks early routinely saves 8-12%.

### 7. Pick a partner, not a vendor
A logistics partner who understands your product, your customers and your peak cycles
will solve problems before they reach your invoice.

At Kalebudde Logistics we work with clients across paints, FMCG, footwear and industrial
goods to design exactly this kind of cost-aware network. [Get a free quote](/contact).""",
    ),
    dict(
        slug="what-is-domestic-freight-forwarding",
        title="What Is Domestic Freight Forwarding? A Plain-English Guide",
        excerpt="Freight forwarding is often confused with transport. Here is what a "
                "domestic freight forwarder actually does, and when your business needs one.",
        tags="freight-forwarding,basics,logistics",
        meta_description="A clear explanation of domestic freight forwarding in India - "
                         "what forwarders do, how they differ from transporters, and how "
                         "to choose the right partner.",
        cover_image="/images/hero-truck.png",
        content="""## Forwarder vs transporter

A transporter owns vehicles and moves cargo from A to B. A **freight forwarder** designs
and orchestrates the whole movement: mode selection, carrier sourcing, documentation,
insurance, warehousing, and exception management.

### What a forwarder handles for you
- Selecting the right vehicle type and mode for the cargo
- Negotiating and managing multiple carriers on your behalf
- E-way bills, LR/consignment notes and compliance paperwork
- Cargo insurance and claims support
- Consolidated invoicing across many lanes
- A single point of accountability when something goes wrong

### When you need one
If you are shipping to more than a handful of destinations, dealing with several
transporters, or spending significant management time chasing trucks, a forwarder
usually pays for itself.

### What to look for
Look for network depth on *your* lanes, transparent tracking, documented SOPs, and a
team that answers the phone at 11pm when a vehicle breaks down near Pune.

Kalebudde Logistics has been forwarding domestic freight since 2014, backed by
warehousing operations established in 1999.""",
    ),
    dict(
        slug="warehousing-best-practices-india",
        title="Warehousing Best Practices for Fast-Moving Indian Brands",
        excerpt="Layout, slotting, safety and inventory accuracy - the fundamentals that "
                "separate a well-run warehouse from an expensive one.",
        tags="warehousing,operations,inventory",
        meta_description="Warehouse best practices for Indian brands: slotting, layout, "
                         "cycle counting, safety and WMS adoption, from Kalebudde Logistics.",
        cover_image="/images/warehouse.jpg",
        content="""## Fundamentals beat gadgets

### Slot by velocity, not by SKU code
Your fastest-moving 20% of SKUs should sit closest to dispatch. Re-slot quarterly.

### Measure inventory accuracy weekly
Cycle counting a rotating subset beats an annual full count that halts operations.

### Design for the dock, not the racking
Most warehouse bottlenecks are at inbound and outbound docks. Stage lanes, appointment
scheduling and pre-printed labels solve more than extra racking ever will.

### Make safety visible
Marked walkways, forklift horn discipline, and PPE compliance reduce both accidents and
damage claims.

### Adopt a WMS you will actually use
A simple system that every operator follows beats a sophisticated one that gets bypassed.

Our warehousing facilities are located to keep your inventory close to demand while
keeping handling costs predictable.""",
    ),
]

SHIPMENTS = [
    dict(
        tracking_number="KL100000001",
        consignor="Asian Paints Ltd",
        consignee="Sri Venkateshwara Traders",
        origin="Bengaluru, Karnataka",
        destination="Hyderabad, Telangana",
        commodity="Decorative paints",
        weight_kg=8400.0,
        packages=310,
        vehicle_number="KA 01 AJ 5919",
        driver_name="Ramesh Naik",
        driver_phone="+91 98450 11223",
        invoice_number="INV-2026-4401",
        lr_number="LR-900812",
        eway_bill_number="181045920311",
        status=ShipmentStatus.IN_TRANSIT,
        events=[
            (ShipmentStatus.BOOKED, "Bengaluru, Karnataka", "Booking confirmed", 4),
            (ShipmentStatus.PICKED_UP, "Bengaluru, Karnataka", "Loaded at plant", 3),
            (ShipmentStatus.IN_TRANSIT, "Anantapur, Andhra Pradesh", "In transit via NH44", 1),
        ],
    ),
    dict(
        tracking_number="KL100000002",
        consignor="Walkaroo International",
        consignee="Metro Footwear Distributors",
        origin="Coimbatore, Tamil Nadu",
        destination="Mumbai, Maharashtra",
        commodity="Footwear cartons",
        weight_kg=5200.0,
        packages=640,
        vehicle_number="KA 01 AJ 8125",
        driver_name="Imran Shaikh",
        driver_phone="+91 99860 44557",
        invoice_number="INV-2026-3912",
        lr_number="LR-881902",
        eway_bill_number="241088491022",
        status=ShipmentStatus.DELIVERED,
        events=[
            (ShipmentStatus.BOOKED, "Coimbatore, Tamil Nadu", "Booking confirmed", 9),
            (ShipmentStatus.PICKED_UP, "Coimbatore, Tamil Nadu", "Cargo picked up", 8),
            (ShipmentStatus.IN_TRANSIT, "Bengaluru, Karnataka", "Transhipment hub", 6),
            (ShipmentStatus.OUT_FOR_DELIVERY, "Mumbai, Maharashtra", "Out for delivery", 5),
            (ShipmentStatus.DELIVERED, "Mumbai, Maharashtra", "POD signed by consignee", 5),
        ],
    ),
    dict(
        tracking_number="KL100000003",
        consignor="DS Group",
        consignee="Northern Retail Depot",
        origin="Pune, Maharashtra",
        destination="Delhi NCR",
        commodity="FMCG assorted",
        weight_kg=11200.0,
        packages=980,
        vehicle_number="KA 05 BH 2210",
        driver_name="Sardar Singh",
        driver_phone="+91 97400 77881",
        invoice_number="INV-2026-5120",
        lr_number="LR-771239",
        eway_bill_number="311099214566",
        status=ShipmentStatus.ON_HOLD,
        events=[
            (ShipmentStatus.BOOKED, "Pune, Maharashtra", "Booking confirmed", 3),
            (ShipmentStatus.PICKED_UP, "Pune, Maharashtra", "Loaded", 2),
            (ShipmentStatus.ON_HOLD, "Indore, Madhya Pradesh", "Held for e-way bill revalidation", 1),
        ],
    ),
]


def seed_all() -> None:
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    try:
        # --- users ---
        if not db.query(User).first():
            db.add_all([
                User(
                    email=settings.SEED_ADMIN_EMAIL,
                    full_name="Farooque Kalebudde",
                    company="Kalebudde Logistics",
                    role=Role.ADMIN,
                    hashed_password=hash_password(settings.SEED_ADMIN_PASSWORD),
                ),
                User(
                    email="staff@kalebuddelogistics.in",
                    full_name="Operations Desk",
                    company="Kalebudde Logistics",
                    role=Role.STAFF,
                    hashed_password=hash_password("Staff@12345"),
                ),
                User(
                    email="client@example.com",
                    full_name="Priya Menon",
                    company="Sri Venkateshwara Traders",
                    role=Role.CLIENT,
                    hashed_password=hash_password("Client@12345"),
                ),
            ])
            db.commit()

        client = db.query(User).filter(User.role == Role.CLIENT).first()

        # --- shipments ---
        for idx, spec in enumerate(SHIPMENTS):
            if db.query(Shipment).filter(
                Shipment.tracking_number == spec["tracking_number"]
            ).first():
                continue
            events = spec.pop("events")

            # Calculate demo E-Way bill dates
            eb_date = now - timedelta(days=idx + 1)
            # Make KL100000001 & KL100000003 expiring within 12h & 8h to trigger Telegram near-expiry alert!
            eb_expiry = (
                now + timedelta(hours=14)
                if idx == 0
                else (now - timedelta(days=1) if idx == 1 else now + timedelta(hours=6))
            )

            s = Shipment(
                **spec,
                client_id=client.id if client else None,
                eway_bill_date=eb_date,
                eway_bill_expiry_date=eb_expiry,
                eta=now + timedelta(days=2),
            )
            db.add(s)
            db.flush()
            for status, location, note, days_ago in events:
                db.add(TrackingEvent(
                    shipment_id=s.id, status=status, location=location, note=note,
                    occurred_at=now - timedelta(days=days_ago),
                ))
            spec["events"] = events
        db.commit()

        # --- blog ---
        for i, p in enumerate(POSTS):
            if db.query(BlogPost).filter(BlogPost.slug == p["slug"]).first():
                continue
            db.add(BlogPost(
                **p,
                author="Farooque Kalebudde",
                meta_title=f"{p['title']} | Kalebudde Logistics",
                published=True,
                published_at=now - timedelta(days=i * 11),
            ))
        db.commit()
    finally:
        db.close()
