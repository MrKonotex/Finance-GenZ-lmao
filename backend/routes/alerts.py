import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Alert, AlertHistory, ScannerSignal
from schemas import AlertCreate, AlertUpdate, WebhookPayload

router = APIRouter()


def _serialize_alert(a: Alert) -> dict:
    return {c.name: getattr(a, c.name) for c in a.__table__.columns}


def _serialize_history(h: AlertHistory) -> dict:
    return {c.name: getattr(h, c.name) for c in h.__table__.columns}


@router.get("", response_model=List[dict])
async def list_alerts(db: Session = Depends(get_db)):
    """List all configured alerts."""
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return [_serialize_alert(a) for a in alerts]


@router.post("", response_model=dict, status_code=201)
async def create_alert(payload: AlertCreate, db: Session = Depends(get_db)):
    """Create a new alert."""
    alert = Alert(
        id=str(uuid.uuid4()),
        alert_type=payload.alert_type,
        asset=payload.asset,
        condition=payload.condition,
        threshold=payload.threshold,
        active=payload.active if payload.active is not None else True,
        telegram_notify=payload.telegram_notify if payload.telegram_notify is not None else True,
        browser_notify=payload.browser_notify if payload.browser_notify is not None else True,
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _serialize_alert(alert)


@router.put("/{alert_id}", response_model=dict)
async def update_alert(alert_id: str, payload: AlertUpdate, db: Session = Depends(get_db)):
    """Update an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    data = payload.model_dump(exclude_unset=True)
    for key, val in data.items():
        setattr(alert, key, val)
    db.commit()
    db.refresh(alert)
    return _serialize_alert(alert)


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: str, db: Session = Depends(get_db)):
    """Delete an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()


@router.get("/history", response_model=List[dict])
async def alert_history(
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Get triggered alert history."""
    history = (
        db.query(AlertHistory)
        .order_by(AlertHistory.triggered_at.desc())
        .limit(limit)
        .all()
    )
    return [_serialize_history(h) for h in history]


@router.post("/scanner/webhook", response_model=dict, status_code=201)
async def scanner_webhook(payload: WebhookPayload, db: Session = Depends(get_db)):
    """
    TradingView webhook receiver.
    Saves incoming alert payloads as scanner signals.
    """
    import json

    signal = ScannerSignal(
        id=str(uuid.uuid4()),
        source="tradingview",
        signal_type=payload.signal_type or "custom",
        asset=payload.ticker or "",
        message=payload.message or "",
        payload=json.dumps(payload.model_dump()),
        created_at=datetime.utcnow(),
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)

    return {
        "id": signal.id,
        "status": "received",
        "asset": signal.asset,
        "signal_type": signal.signal_type,
        "created_at": signal.created_at.isoformat(),
    }
