from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import date, datetime
import json


# ─── Journal ────────────────────────────────────────────────────────────────

class JournalEntryCreate(BaseModel):
    date: date
    market_context: Optional[str] = None
    game_plan: Optional[str] = None
    daily_pnl: Optional[float] = None
    mood: Optional[int] = Field(None, ge=1, le=10)
    confidence: Optional[int] = Field(None, ge=1, le=10)
    mistakes: Optional[List[str]] = None
    psych_notes: Optional[str] = None
    bias_direction: Optional[str] = None   # bullish/bearish/neutral
    bias_timeframe: Optional[str] = None   # intraday/swing
    bias_confidence: Optional[int] = Field(None, ge=0, le=100)
    bias_note: Optional[str] = None

    class Config:
        from_attributes = True


class JournalEntryUpdate(BaseModel):
    market_context: Optional[str] = None
    game_plan: Optional[str] = None
    daily_pnl: Optional[float] = None
    mood: Optional[int] = Field(None, ge=1, le=10)
    confidence: Optional[int] = Field(None, ge=1, le=10)
    mistakes: Optional[List[str]] = None
    psych_notes: Optional[str] = None
    bias_direction: Optional[str] = None
    bias_timeframe: Optional[str] = None
    bias_confidence: Optional[int] = Field(None, ge=0, le=100)
    bias_note: Optional[str] = None

    class Config:
        from_attributes = True


class JournalEntryOut(BaseModel):
    id: str
    date: date
    market_context: Optional[str]
    game_plan: Optional[str]
    daily_pnl: Optional[float]
    mood: Optional[int]
    confidence: Optional[int]
    mistakes: Optional[Any]
    psych_notes: Optional[str]
    bias_direction: Optional[str]
    bias_timeframe: Optional[str]
    bias_confidence: Optional[int]
    bias_note: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_json(cls, obj):
        data = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
        if isinstance(data.get("mistakes"), str):
            try:
                data["mistakes"] = json.loads(data["mistakes"])
            except Exception:
                pass
        return cls(**data)


# ─── Trade ──────────────────────────────────────────────────────────────────

class TradeCreate(BaseModel):
    asset: str
    direction: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    size: Optional[float] = None
    pnl: Optional[float] = None
    r_multiple: Optional[float] = None
    pattern_id: Optional[str] = None
    setup_thesis: Optional[str] = None
    execution_notes: Optional[str] = None
    chart_screenshot: Optional[str] = None
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    session: Optional[str] = None
    followed_rules: Optional[bool] = None
    rule_violations: Optional[List[str]] = None

    class Config:
        from_attributes = True


class TradeUpdate(BaseModel):
    asset: Optional[str] = None
    direction: Optional[str] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    size: Optional[float] = None
    pnl: Optional[float] = None
    r_multiple: Optional[float] = None
    pattern_id: Optional[str] = None
    setup_thesis: Optional[str] = None
    execution_notes: Optional[str] = None
    chart_screenshot: Optional[str] = None
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    session: Optional[str] = None
    followed_rules: Optional[bool] = None
    rule_violations: Optional[List[str]] = None

    class Config:
        from_attributes = True


class TradeOut(BaseModel):
    id: str
    journal_entry_id: Optional[str]
    asset: str
    direction: Optional[str]
    entry_price: Optional[float]
    exit_price: Optional[float]
    size: Optional[float]
    pnl: Optional[float]
    r_multiple: Optional[float]
    pattern_id: Optional[str]
    setup_thesis: Optional[str]
    execution_notes: Optional[str]
    chart_screenshot: Optional[str]
    entry_time: Optional[datetime]
    exit_time: Optional[datetime]
    session: Optional[str]
    followed_rules: Optional[bool]
    rule_violations: Optional[Any]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Missed Setup ────────────────────────────────────────────────────────────

class MissedSetupCreate(BaseModel):
    asset: Optional[str] = None
    pattern_id: Optional[str] = None
    reason_passed: Optional[str] = None
    potential_r: Optional[float] = None
    chart_screenshot: Optional[str] = None

    class Config:
        from_attributes = True


class MissedSetupOut(BaseModel):
    id: str
    journal_entry_id: Optional[str]
    asset: Optional[str]
    pattern_id: Optional[str]
    reason_passed: Optional[str]
    potential_r: Optional[float]
    chart_screenshot: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Watchlist ───────────────────────────────────────────────────────────────

class WatchlistCreate(BaseModel):
    asset: str
    asset_type: Optional[str] = "crypto"
    key_levels: Optional[Any] = None
    notes: Optional[str] = None
    priority: Optional[int] = 0

    class Config:
        from_attributes = True


class WatchlistUpdate(BaseModel):
    asset: Optional[str] = None
    asset_type: Optional[str] = None
    key_levels: Optional[Any] = None
    notes: Optional[str] = None
    priority: Optional[int] = None

    class Config:
        from_attributes = True


class WatchlistOut(BaseModel):
    id: str
    asset: str
    asset_type: Optional[str]
    key_levels: Optional[Any]
    notes: Optional[str]
    priority: Optional[int]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Pattern ─────────────────────────────────────────────────────────────────

class PatternCreate(BaseModel):
    name: str
    description: Optional[str] = None
    entry_criteria: Optional[str] = None
    exit_criteria: Optional[str] = None
    invalidation: Optional[str] = None
    timeframes: Optional[Any] = None
    screenshots: Optional[Any] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class PatternUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    entry_criteria: Optional[str] = None
    exit_criteria: Optional[str] = None
    invalidation: Optional[str] = None
    timeframes: Optional[Any] = None
    screenshots: Optional[Any] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class PatternOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    entry_criteria: Optional[str]
    exit_criteria: Optional[str]
    invalidation: Optional[str]
    timeframes: Optional[Any]
    screenshots: Optional[Any]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Pair ────────────────────────────────────────────────────────────────────

class PairCreate(BaseModel):
    asset_a: str
    asset_b: str
    lookback_days: Optional[int] = 60
    notes: Optional[str] = None
    active: Optional[bool] = True

    class Config:
        from_attributes = True


class PairUpdate(BaseModel):
    asset_a: Optional[str] = None
    asset_b: Optional[str] = None
    lookback_days: Optional[int] = None
    notes: Optional[str] = None
    active: Optional[bool] = None

    class Config:
        from_attributes = True


class PairOut(BaseModel):
    id: str
    asset_a: str
    asset_b: str
    lookback_days: int
    notes: Optional[str]
    active: bool

    class Config:
        from_attributes = True


# ─── Alert ───────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    alert_type: str
    asset: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    active: Optional[bool] = True
    telegram_notify: Optional[bool] = True
    browser_notify: Optional[bool] = True

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    alert_type: Optional[str] = None
    asset: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    active: Optional[bool] = None
    telegram_notify: Optional[bool] = None
    browser_notify: Optional[bool] = None

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: str
    alert_type: str
    asset: Optional[str]
    condition: Optional[str]
    threshold: Optional[float]
    active: bool
    telegram_notify: bool
    browser_notify: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class AlertHistoryOut(BaseModel):
    id: str
    alert_id: str
    triggered_at: Optional[datetime]
    value_at_trigger: Optional[float]
    message: Optional[str]

    class Config:
        from_attributes = True


# ─── Scanner Webhook ─────────────────────────────────────────────────────────

class WebhookPayload(BaseModel):
    ticker: Optional[str] = None
    exchange: Optional[str] = None
    interval: Optional[str] = None
    price: Optional[float] = None
    message: Optional[str] = None
    signal_type: Optional[str] = None
    extra: Optional[Any] = None
