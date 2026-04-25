from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, Date,
    ForeignKey, JSON,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String, primary_key=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    market_context = Column(Text)
    game_plan = Column(Text)
    daily_pnl = Column(Float)
    mood = Column(Integer)              # 1-10
    confidence = Column(Integer)        # 1-10
    mistakes = Column(Text)             # JSON array
    psych_notes = Column(Text)
    bias_direction = Column(String)     # bullish / bearish / neutral
    bias_timeframe = Column(String)     # intraday / swing
    bias_confidence = Column(Integer)   # 0-100
    bias_note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    trades = relationship("Trade", back_populates="journal_entry", cascade="all, delete-orphan")
    missed_setups = relationship("MissedSetup", back_populates="journal_entry", cascade="all, delete-orphan")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(String, primary_key=True)
    journal_entry_id = Column(String, ForeignKey("journal_entries.id"), nullable=True)
    asset = Column(String, nullable=False)
    direction = Column(String)          # long / short
    entry_price = Column(Float)
    exit_price = Column(Float)
    size = Column(Float)
    pnl = Column(Float)
    r_multiple = Column(Float)
    pattern_id = Column(String, ForeignKey("patterns.id"), nullable=True)
    setup_thesis = Column(Text)
    execution_notes = Column(Text)
    chart_screenshot = Column(Text)
    entry_time = Column(DateTime)
    exit_time = Column(DateTime)
    session = Column(String)            # asia / europe / us
    followed_rules = Column(Boolean)
    rule_violations = Column(Text)      # JSON array
    created_at = Column(DateTime, default=datetime.utcnow)

    journal_entry = relationship("JournalEntry", back_populates="trades")
    pattern = relationship("Pattern", back_populates="trades")


class MissedSetup(Base):
    __tablename__ = "missed_setups"

    id = Column(String, primary_key=True)
    journal_entry_id = Column(String, ForeignKey("journal_entries.id"), nullable=True)
    asset = Column(String)
    pattern_id = Column(String, ForeignKey("patterns.id"), nullable=True)
    reason_passed = Column(Text)
    potential_r = Column(Float)
    chart_screenshot = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    journal_entry = relationship("JournalEntry", back_populates="missed_setups")
    pattern = relationship("Pattern")


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(String, primary_key=True)
    asset = Column(String, nullable=False)
    asset_type = Column(String)         # crypto / equity
    key_levels = Column(Text)           # JSON
    notes = Column(Text)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    entry_criteria = Column(Text)
    exit_criteria = Column(Text)
    invalidation = Column(Text)
    timeframes = Column(Text)           # JSON
    screenshots = Column(Text)          # JSON
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    trades = relationship("Trade", back_populates="pattern")


class Pair(Base):
    __tablename__ = "pairs"

    id = Column(String, primary_key=True)
    asset_a = Column(String, nullable=False)
    asset_b = Column(String, nullable=False)
    lookback_days = Column(Integer, default=60)
    notes = Column(Text)
    active = Column(Boolean, default=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True)
    alert_type = Column(String)         # price / funding / scanner / oi_liq
    asset = Column(String)
    condition = Column(String)          # gt / lt / crosses
    threshold = Column(Float)
    active = Column(Boolean, default=True)
    telegram_notify = Column(Boolean, default=True)
    browser_notify = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    history = relationship("AlertHistory", back_populates="alert", cascade="all, delete-orphan")


class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(String, primary_key=True)
    alert_id = Column(String, ForeignKey("alerts.id"), nullable=False)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    value_at_trigger = Column(Float)
    message = Column(Text)

    alert = relationship("Alert", back_populates="history")


class ScannerSignal(Base):
    """Stores TradingView webhook payloads and internally generated signals."""
    __tablename__ = "scanner_signals"

    id = Column(String, primary_key=True)
    source = Column(String)             # tradingview / internal
    signal_type = Column(String)        # breakout / funding / pair_divergence / custom
    asset = Column(String)
    message = Column(Text)
    payload = Column(Text)              # raw JSON
    created_at = Column(DateTime, default=datetime.utcnow)
