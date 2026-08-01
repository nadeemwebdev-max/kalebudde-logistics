import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    ADMIN = "admin"        # full control
    STAFF = "staff"        # ops: create/update shipments, write blogs
    CLIENT = "client"      # read-only on their own shipments


class ShipmentStatus(str, enum.Enum):
    BOOKED = "booked"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    company: Mapped[str | None] = mapped_column(String(160), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.CLIENT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    shipments: Mapped[list["Shipment"]] = relationship(back_populates="client")


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True)
    tracking_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    consignor: Mapped[str] = mapped_column(String(160))
    consignee: Mapped[str] = mapped_column(String(160))
    origin: Mapped[str] = mapped_column(String(160))
    destination: Mapped[str] = mapped_column(String(160))

    commodity: Mapped[str | None] = mapped_column(String(160), nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    packages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    driver_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)

    eway_bill_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    eway_bill_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    eway_bill_expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_extend_eway: Mapped[bool] = mapped_column(Boolean, default=True)
    invoice_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lr_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lr_copy_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[ShipmentStatus] = mapped_column(
        Enum(ShipmentStatus), default=ShipmentStatus.BOOKED, index=True
    )
    eta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    client: Mapped["User | None"] = relationship(back_populates="shipments")
    events: Mapped[list["TrackingEvent"]] = relationship(
        back_populates="shipment",
        cascade="all, delete-orphan",
        order_by="TrackingEvent.occurred_at",
    )


class TrackingEvent(Base):
    __tablename__ = "tracking_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id", ondelete="CASCADE"))
    status: Mapped[ShipmentStatus] = mapped_column(Enum(ShipmentStatus))
    location: Mapped[str] = mapped_column(String(160))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    shipment: Mapped["Shipment"] = relationship(back_populates="events")


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(220))
    excerpt: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    cover_image: Mapped[str | None] = mapped_column(String(400), nullable=True)
    author: Mapped[str] = mapped_column(String(120), default="Kalebudde Logistics")
    tags: Mapped[str | None] = mapped_column(String(300), nullable=True)
    meta_title: Mapped[str | None] = mapped_column(String(220), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(400), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class QuoteRequest(Base):
    __tablename__ = "quote_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    company: Mapped[str | None] = mapped_column(String(160), nullable=True)
    service: Mapped[str | None] = mapped_column(String(120), nullable=True)
    origin: Mapped[str | None] = mapped_column(String(160), nullable=True)
    destination: Mapped[str | None] = mapped_column(String(160), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    handled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
