import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

# ─── In-memory caches (populated by scheduled jobs) ───────────────────────────

_funding_cache: list = []
_scanner_signals_cache: list = []


def get_funding_cache() -> list:
    return _funding_cache


def get_scanner_signals_cache() -> list:
    return _scanner_signals_cache


# ─── Job functions ────────────────────────────────────────────────────────────

async def refresh_funding_cache():
    """Refresh funding rate cache from Hyperliquid every 60 seconds."""
    global _funding_cache
    try:
        from services.hyperliquid import get_funding_rates
        rates = await get_funding_rates()
        _funding_cache = rates
        logger.debug(f"Funding cache refreshed: {len(rates)} assets")
    except Exception as e:
        logger.warning(f"refresh_funding_cache error: {e}")


async def check_price_alerts():
    """Check price-based alerts against current mid prices every 30 seconds."""
    try:
        from services.hyperliquid import get_all_mids
        from database import SessionLocal
        from models import Alert, AlertHistory
        import uuid
        from datetime import datetime

        mids = await get_all_mids()
        if not mids:
            return

        db = SessionLocal()
        try:
            active_alerts = (
                db.query(Alert)
                .filter(Alert.active == True, Alert.alert_type == "price")
                .all()
            )
            for alert in active_alerts:
                if not alert.asset or alert.threshold is None:
                    continue
                current_price = mids.get(alert.asset.upper())
                if current_price is None:
                    continue

                current_price = float(current_price)
                triggered = False
                if alert.condition == "gt" and current_price > alert.threshold:
                    triggered = True
                elif alert.condition == "lt" and current_price < alert.threshold:
                    triggered = True

                if triggered:
                    message = (
                        f"Alert: {alert.asset} is {alert.condition} {alert.threshold} "
                        f"(current: {current_price:.4f})"
                    )
                    history = AlertHistory(
                        id=str(uuid.uuid4()),
                        alert_id=alert.id,
                        triggered_at=datetime.utcnow(),
                        value_at_trigger=current_price,
                        message=message,
                    )
                    db.add(history)

                    if alert.telegram_notify:
                        try:
                            from services.telegram import send_alert
                            await send_alert(message)
                        except Exception as e:
                            logger.warning(f"Telegram alert send failed: {e}")

            db.commit()
        finally:
            db.close()

    except Exception as e:
        logger.warning(f"check_price_alerts error: {e}")


async def refresh_scanner_signals():
    """Refresh scanner signals cache every 120 seconds."""
    global _scanner_signals_cache
    try:
        from services.hyperliquid import get_funding_rates

        rates = await get_funding_rates()
        threshold = 0.0005
        signals = []

        for r in rates:
            fr = r.get("funding_rate", 0)
            if abs(fr) >= threshold:
                signals.append(
                    {
                        "asset": r["asset"],
                        "signal_type": "funding_extreme",
                        "funding_rate": fr,
                        "direction": "short_bias" if fr > 0 else "long_bias",
                    }
                )

        _scanner_signals_cache = signals
        logger.debug(f"Scanner signals refreshed: {len(signals)} signals")
    except Exception as e:
        logger.warning(f"refresh_scanner_signals error: {e}")


# ─── Scheduler setup ──────────────────────────────────────────────────────────

def start_scheduler():
    """Add all jobs and start the scheduler."""
    scheduler.add_job(
        refresh_funding_cache,
        trigger=IntervalTrigger(seconds=60),
        id="refresh_funding_cache",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        check_price_alerts,
        trigger=IntervalTrigger(seconds=30),
        id="check_price_alerts",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        refresh_scanner_signals,
        trigger=IntervalTrigger(seconds=120),
        id="refresh_scanner_signals",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("APScheduler started with 3 jobs")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
