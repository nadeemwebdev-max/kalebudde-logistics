import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Shipment, ShipmentStatus


def send_telegram_message(bot_token: str | None, chat_id: str | None, text: str) -> dict:
    """Send HTML-formatted message via Telegram Bot API."""
    token = bot_token or settings.TELEGRAM_BOT_TOKEN
    target_chat = chat_id or settings.TELEGRAM_CHAT_ID

    if not token or not target_chat:
        return {
            "success": False,
            "error": "Telegram Bot Token or Chat ID is not configured.",
        }

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": target_chat,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            return {"success": True, "response": res_body}
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            desc = err_body.get("description", str(e))
            return {"success": False, "error": f"Telegram API Error: {desc}"}
        except Exception:
            return {"success": False, "error": f"Telegram HTTP Error {e.code}: {e.reason}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def check_and_notify_eway_expirations(
    db: Session,
    bot_token: str | None = None,
    chat_id: str | None = None,
    threshold_hours: int = 48,
) -> dict:
    """Find active shipments whose E-Way Bill is expiring within threshold_hours or expired, and send Telegram alerts."""
    token = bot_token or settings.TELEGRAM_BOT_TOKEN
    target_chat = chat_id or settings.TELEGRAM_CHAT_ID

    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=threshold_hours)

    active_statuses = [
        ShipmentStatus.BOOKED,
        ShipmentStatus.PICKED_UP,
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.OUT_FOR_DELIVERY,
        ShipmentStatus.ON_HOLD,
    ]

    shipments = (
        db.query(Shipment)
        .filter(
            Shipment.status.in_(active_statuses),
            Shipment.eway_bill_expiry_date.isnot(None),
            Shipment.eway_bill_expiry_date <= cutoff,
        )
        .order_by(Shipment.eway_bill_expiry_date.asc())
        .all()
    )

    notified = []
    sent_count = 0
    errors = []

    for s in shipments:
        expiry = s.eway_bill_expiry_date
        if expiry and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        is_expired = (expiry < now) if expiry else False
        hours_remaining = round((expiry - now).total_seconds() / 3600, 1) if expiry else 0

        status_emoji = "🔴 <b>EXPIRED</b>" if is_expired else "⚠️ <b>EXPIRING SOON</b>"
        time_desc = (
            f"Expired {abs(hours_remaining)} hours ago"
            if is_expired
            else f"Expires in {hours_remaining} hours"
        )

        auto_extended = False
        if getattr(s, "auto_extend_eway", True):
            new_expiry = now + timedelta(hours=24)
            s.eway_bill_expiry_date = new_expiry
            db.add(
                TrackingEvent(
                    shipment_id=s.id,
                    status=s.status,
                    location=s.origin,
                    note="System Auto-Extension: E-Way Bill validity extended by +24h to prevent transit delay.",
                )
            )
            db.commit()
            auto_extended = True
            expiry = new_expiry

        ext_badge = "🔄 <b>AUTO-EXTENDED (+24h)</b>" if auto_extended else ""

        msg = (
            f"🚨 <b>KALEBUDDE LOGISTICS — E-WAY BILL ALERT</b> 🚨\n\n"
            f"Status: {status_emoji} {ext_badge}\n"
            f"🚚 <b>Shipment</b>: <code>{s.tracking_number}</code>\n"
            f"📄 <b>E-Way Bill No</b>: <code>{s.eway_bill_number or 'N/A'}</code>\n"
            f"⏳ <b>Updated Expiry</b>: {expiry.strftime('%Y-%m-%d %H:%M UTC') if expiry else 'N/A'}\n\n"
            f"🧾 <b>Invoice No</b>: <code>{s.invoice_number or 'N/A'}</code>\n"
            f"📋 <b>LR No</b>: <code>{s.lr_number or 'N/A'}</code>\n"
            f"🏢 <b>Consignor</b>: {s.consignor}\n"
            f"📍 <b>Consignee</b>: {s.consignee}\n"
            f"🗺️ <b>Route</b>: {s.origin} ➔ {s.destination}\n"
            f"🚛 <b>Vehicle</b>: {s.vehicle_number or 'N/A'}\n"
            f"👤 <b>Driver</b>: {s.driver_name or 'N/A'} ({s.driver_phone or 'N/A'})\n\n"
            f"<i>{ 'E-Way Bill has been automatically extended until delivery.' if auto_extended else 'Action Required: Please extend or revalidate the E-Way Bill.' }</i>"
        )

        res = send_telegram_message(token, target_chat, msg)
        if res.get("success"):
            sent_count += 1
            notified.append(s.tracking_number)
        else:
            errors.append(f"{s.tracking_number}: {res.get('error')}")

    return {
        "sent_count": sent_count,
        "total_near_expiry": len(shipments),
        "notified_shipments": notified,
        "errors": errors,
        "telegram_configured": bool(token and target_chat),
    }
