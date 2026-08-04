from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models import Role, ShipmentStatus


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    company: str | None = None


class UserAdminCreate(UserCreate):
    role: Role = Role.CLIENT


class UserOut(ORM):
    id: int
    email: EmailStr
    full_name: str
    company: str | None
    role: Role
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    company: str | None = None
    role: Role | None = None
    is_active: bool | None = None
    password: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- tracking ----------
class TrackingEventCreate(BaseModel):
    status: ShipmentStatus
    location: str
    note: str | None = None
    occurred_at: datetime | None = None


class TrackingEventOut(ORM):
    id: int
    status: ShipmentStatus
    location: str
    note: str | None
    occurred_at: datetime


class ShipmentBase(BaseModel):
    consignor: str
    consignee: str
    origin: str
    destination: str
    commodity: str | None = None
    weight_kg: float | None = None
    packages: int | None = None
    vehicle_number: str | None = None
    driver_name: str | None = None
    driver_phone: str | None = None
    eway_bill_number: str | None = None
    eway_bill_date: datetime | None = None
    eway_bill_expiry_date: datetime | None = None
    eway_bill_status: str | None = "VEHICLE NUMBER UPDATED"
    new_extended_eway_bill_date: datetime | None = None
    auto_extend_eway: bool = True
    invoice_number: str | None = None
    invoice_date: datetime | None = None
    lr_number: str | None = None
    lr_copy_url: str | None = None
    eta: datetime | None = None


class ShipmentCreate(ShipmentBase):
    client_id: int | None = None
    status: ShipmentStatus = ShipmentStatus.BOOKED


class ShipmentUpdate(BaseModel):
    consignor: str | None = None
    consignee: str | None = None
    origin: str | None = None
    destination: str | None = None
    commodity: str | None = None
    weight_kg: float | None = None
    packages: int | None = None
    vehicle_number: str | None = None
    driver_name: str | None = None
    driver_phone: str | None = None
    eway_bill_number: str | None = None
    eway_bill_date: datetime | None = None
    eway_bill_expiry_date: datetime | None = None
    eway_bill_status: str | None = None
    new_extended_eway_bill_date: datetime | None = None
    auto_extend_eway: bool | None = None
    invoice_number: str | None = None
    invoice_date: datetime | None = None
    lr_number: str | None = None
    lr_copy_url: str | None = None
    eta: datetime | None = None
    status: ShipmentStatus | None = None
    client_id: int | None = None


class ShipmentOut(ORM):
    id: int
    tracking_number: str
    client_id: int | None
    consignor: str
    consignee: str
    origin: str
    destination: str
    commodity: str | None
    weight_kg: float | None
    packages: int | None
    vehicle_number: str | None
    driver_name: str | None
    driver_phone: str | None
    eway_bill_number: str | None
    eway_bill_date: datetime | None
    eway_bill_expiry_date: datetime | None
    eway_bill_status: str | None
    new_extended_eway_bill_date: datetime | None
    auto_extend_eway: bool
    invoice_number: str | None
    invoice_date: datetime | None
    lr_number: str | None
    lr_copy_url: str | None
    status: ShipmentStatus
    eta: datetime | None
    created_at: datetime
    updated_at: datetime
    events: list[TrackingEventOut] = []


class PublicTrackingOut(ORM):
    """Trimmed payload for the anonymous public tracker."""

    tracking_number: str
    origin: str
    destination: str
    eway_bill_number: str | None = None
    eway_bill_expiry_date: datetime | None = None
    invoice_number: str | None = None
    lr_number: str | None = None
    lr_copy_url: str | None = None
    status: ShipmentStatus
    eta: datetime | None
    events: list[TrackingEventOut] = []


class TelegramConfigUpdate(BaseModel):
    bot_token: str | None = None
    chat_id: str | None = None
    threshold_hours: int = 48



# ---------- blog ----------
class BlogBase(BaseModel):
    title: str
    excerpt: str
    content: str
    cover_image: str | None = None
    author: str = "Kalebudde Logistics"
    tags: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    published: bool = True


class BlogCreate(BlogBase):
    slug: str | None = None


class BlogUpdate(BaseModel):
    title: str | None = None
    excerpt: str | None = None
    content: str | None = None
    cover_image: str | None = None
    tags: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    published: bool | None = None


class BlogOut(ORM):
    id: int
    slug: str
    title: str
    excerpt: str
    content: str
    cover_image: str | None
    author: str
    tags: str | None
    meta_title: str | None
    meta_description: str | None
    published: bool
    published_at: datetime
    updated_at: datetime


class BlogListOut(ORM):
    id: int
    slug: str
    title: str
    excerpt: str
    cover_image: str | None
    author: str
    tags: str | None
    published_at: datetime


# ---------- quotes ----------
class QuoteCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    company: str | None = None
    service: str | None = None
    origin: str | None = None
    destination: str | None = None
    message: str | None = None


class QuoteOut(ORM):
    id: int
    name: str
    email: EmailStr
    phone: str | None
    company: str | None
    service: str | None
    origin: str | None
    destination: str | None
    message: str | None
    handled: bool
    created_at: datetime


class DashboardStats(BaseModel):
    total_shipments: int
    in_transit: int
    delivered: int
    on_hold: int
    open_quotes: int
    total_clients: int
