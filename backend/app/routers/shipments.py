import os
import random
import string
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_staff
from app.models import Role, Shipment, ShipmentStatus, TrackingEvent, User
from app.schemas import (
    PublicTrackingOut,
    ShipmentCreate,
    ShipmentOut,
    ShipmentUpdate,
    TrackingEventCreate,
    TrackingEventOut,
)

router = APIRouter(prefix="/api", tags=["shipments"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/shipments/upload-lr")
def upload_lr_copy(
    file: UploadFile = File(...),
    user: User = Depends(require_staff),
):
    """Upload LR Copy document (PDF, PNG, JPG) and return public URL."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload PDF, PNG, JPG, or WEBP.",
        )

    filename = f"LR_{uuid.uuid4().hex[:12]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    return {"lr_copy_url": f"/uploads/{filename}", "filename": filename}



def generate_tracking_number(db: Session) -> str:
    while True:
        code = "KL" + "".join(random.choices(string.digits, k=9))
        if not db.query(Shipment).filter(Shipment.tracking_number == code).first():
            return code


# ---------- public tracker ----------
@router.get("/track/{tracking_number}", response_model=PublicTrackingOut)
def public_track(tracking_number: str, db: Session = Depends(get_db)):
    s = (
        db.query(Shipment)
        .filter(Shipment.tracking_number == tracking_number.upper().strip())
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Tracking number not found")
    return s


# ---------- authenticated ----------
@router.get("/shipments", response_model=list[ShipmentOut])
def list_shipments(
    status_filter: ShipmentStatus | None = Query(None, alias="status"),
    q: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Shipment)
    if user.role == Role.CLIENT:
        query = query.filter(Shipment.client_id == user.id)
    if status_filter:
        query = query.filter(Shipment.status == status_filter)
    if q:
        like = f"%{q}%"
        query = query.filter(
            Shipment.tracking_number.ilike(like)
            | Shipment.consignee.ilike(like)
            | Shipment.destination.ilike(like)
        )
    return query.order_by(Shipment.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/shipments/{shipment_id}", response_model=ShipmentOut)
def get_shipment(
    shipment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    s = db.get(Shipment, shipment_id)
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if user.role == Role.CLIENT and s.client_id != user.id:
        raise HTTPException(status_code=403, detail="Not your shipment")
    return s


@router.post("/shipments", response_model=ShipmentOut, status_code=201)
def create_shipment(
    payload: ShipmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
):
    s = Shipment(**payload.model_dump(), tracking_number=generate_tracking_number(db))
    db.add(s)
    db.flush()
    db.add(
        TrackingEvent(
            shipment_id=s.id,
            status=s.status,
            location=s.origin,
            note="Shipment booked with Kalebudde Logistics",
        )
    )
    db.commit()
    db.refresh(s)
    return s


@router.patch("/shipments/{shipment_id}", response_model=ShipmentOut)
def update_shipment(
    shipment_id: int,
    payload: ShipmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
):
    s = db.get(Shipment, shipment_id)
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    data = payload.model_dump(exclude_unset=True)
    new_status = data.get("status")
    for k, v in data.items():
        setattr(s, k, v)
    if new_status and new_status != ShipmentStatus(s.status):
        db.add(
            TrackingEvent(
                shipment_id=s.id, status=new_status, location=s.destination,
                note="Status updated",
            )
        )
    db.commit()
    db.refresh(s)
    return s


@router.delete("/shipments/{shipment_id}", status_code=204)
def delete_shipment(
    shipment_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
):
    s = db.get(Shipment, shipment_id)
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    db.delete(s)
    db.commit()


@router.post(
    "/shipments/{shipment_id}/events", response_model=TrackingEventOut, status_code=201
)
def add_event(
    shipment_id: int,
    payload: TrackingEventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
):
    s = db.get(Shipment, shipment_id)
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    ev = TrackingEvent(
        shipment_id=s.id,
        status=payload.status,
        location=payload.location,
        note=payload.note,
        occurred_at=payload.occurred_at or datetime.now(timezone.utc),
    )
    s.status = payload.status
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev
