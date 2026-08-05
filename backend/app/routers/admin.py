from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import get_db
from app.deps import require_admin, require_staff
from app.models import (
    BlogPost,
    QuoteRequest,
    Role,
    Shipment,
    ShipmentStatus,
    User,
)
from app.schemas import (
    DashboardStats,
    QuoteCreate,
    QuoteOut,
    UserAdminCreate,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/api", tags=["admin"])


# ---------- users (admin only) ----------
@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(
    payload: UserAdminCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        company=payload.company,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    if pw := data.pop("password", None):
        user.hashed_password = hash_password(pw)
    if user.id == admin.id and data.get("role") and data["role"] != Role.ADMIN:
        raise HTTPException(status_code=400, detail="You cannot demote yourself")
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
    db.delete(user)
    db.commit()


# ---------- quotes ----------
@router.post("/quotes", response_model=QuoteOut, status_code=201)
def submit_quote(payload: QuoteCreate, db: Session = Depends(get_db)):
    """Public endpoint - contact / free-quote form."""
    q = QuoteRequest(**payload.model_dump())
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.get("/quotes", response_model=list[QuoteOut])
def list_quotes(db: Session = Depends(get_db), _: User = Depends(require_staff)):
    return db.query(QuoteRequest).order_by(QuoteRequest.created_at.desc()).all()


@router.patch("/quotes/{quote_id}", response_model=QuoteOut)
def mark_quote(
    quote_id: int,
    handled: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    q = db.get(QuoteRequest, quote_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")
    q.handled = handled
    db.commit()
    db.refresh(q)
    return q


# ---------- dashboard ----------
@router.get("/stats", response_model=DashboardStats)
def stats(db: Session = Depends(get_db), _: User = Depends(require_staff)):
    def count(status: ShipmentStatus) -> int:
        return db.query(Shipment).filter(Shipment.status == status).count()

    return DashboardStats(
        total_shipments=db.query(Shipment).count(),
        in_transit=count(ShipmentStatus.IN_TRANSIT),
        delivered=count(ShipmentStatus.DELIVERED),
        on_hold=count(ShipmentStatus.ON_HOLD),
        open_quotes=db.query(QuoteRequest).filter(QuoteRequest.handled.is_(False)).count(),
        total_clients=db.query(User).filter(User.role == Role.CLIENT).count(),
    )


# ---------- telegram & e-way bill alerts ----------
from app.core.config import settings
from app.schemas import TelegramConfigUpdate
from app.services.telegram import (
    check_and_notify_eway_expirations,
    send_telegram_message,
)


@router.get("/admin/telegram-config")
def get_telegram_config(_: User = Depends(require_staff)):
    return {
        "bot_token": settings.TELEGRAM_BOT_TOKEN or "",
        "chat_id": settings.TELEGRAM_CHAT_ID or "",
        "threshold_hours": settings.EWAY_EXPIRY_THRESHOLD_HOURS,
    }


@router.post("/admin/telegram-config")
def update_telegram_config(
    payload: TelegramConfigUpdate, _: User = Depends(require_admin)
):
    if payload.bot_token is not None:
        settings.TELEGRAM_BOT_TOKEN = payload.bot_token.strip() or None
    if payload.chat_id is not None:
        settings.TELEGRAM_CHAT_ID = payload.chat_id.strip() or None
    if payload.threshold_hours:
        settings.EWAY_EXPIRY_THRESHOLD_HOURS = payload.threshold_hours

    # Save persistently to backend/.env
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    env_lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if not any(line.startswith(k) for k in ["TELEGRAM_BOT_TOKEN=", "TELEGRAM_CHAT_ID=", "EWAY_EXPIRY_THRESHOLD_HOURS="]):
                    if line.strip():
                        env_lines.append(line.strip())

    if settings.TELEGRAM_BOT_TOKEN:
        env_lines.append(f"TELEGRAM_BOT_TOKEN={settings.TELEGRAM_BOT_TOKEN}")
    if settings.TELEGRAM_CHAT_ID:
        env_lines.append(f"TELEGRAM_CHAT_ID={settings.TELEGRAM_CHAT_ID}")
    if settings.EWAY_EXPIRY_THRESHOLD_HOURS:
        env_lines.append(f"EWAY_EXPIRY_THRESHOLD_HOURS={settings.EWAY_EXPIRY_THRESHOLD_HOURS}")

    with open(env_path, "w", encoding="utf-8") as f:
        f.write("\n".join(env_lines) + "\n")

    return {
        "success": True,
        "message": "Telegram Bot settings updated and saved persistently to .env!",
        "bot_token": settings.TELEGRAM_BOT_TOKEN or "",
        "chat_id": settings.TELEGRAM_CHAT_ID or "",
        "threshold_hours": settings.EWAY_EXPIRY_THRESHOLD_HOURS,
    }


@router.post("/admin/notify-eway-expiry")
def trigger_eway_expiry_notifications(
    db: Session = Depends(get_db), _: User = Depends(require_staff)
):
    """Scan shipments and send Telegram alerts for E-Way Bills expiring within threshold."""
    result = check_and_notify_eway_expirations(
        db,
        bot_token=settings.TELEGRAM_BOT_TOKEN,
        chat_id=settings.TELEGRAM_CHAT_ID,
        threshold_hours=settings.EWAY_EXPIRY_THRESHOLD_HOURS,
    )
    return result


@router.post("/admin/test-telegram")
def test_telegram_bot(
    payload: TelegramConfigUpdate | None = None, _: User = Depends(require_staff)
):
    token = (payload.bot_token if payload and payload.bot_token else None) or settings.TELEGRAM_BOT_TOKEN
    target_chat = (payload.chat_id if payload and payload.chat_id else None) or settings.TELEGRAM_CHAT_ID

    test_msg = (
        "🤖 <b>Kalebudde Logistics — Telegram Bot Test</b>\n\n"
        "✅ Telegram notification bot is connected and working successfully!\n"
        "E-Way bill expiry alerts will be dispatched to this chat."
    )
    res = send_telegram_message(token, target_chat, test_msg)
    if not res.get("success"):
        err_msg = res.get("error", "Unknown error")
        if "chat not found" in err_msg.lower():
            err_msg += " — Please open Telegram, search for @Kalebuddelbot (or your bot), and tap START first!"
        raise HTTPException(
            status_code=400,
            detail=err_msg,
        )
    return {"success": True, "message": "Test notification sent to Telegram!"}

