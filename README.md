# FinanceBoard
Finance Dashboard

{
  "asset_id":    "BTC-USD",
  "asset_type":  "crypto" | "stock" | "macro",
  "timestamp":   "2026-03-06T14:30:00Z",
  "ohlcv":       { open, high, low, close, volume },
  "metadata":    { market_cap, sector, ... }
}
```

**Update-Frequenz:**
| Datentyp | Frequenz | Methode |
|---|---|---|
| Crypto Preise | Real-time | WebSocket (Binance) |
| Aktien | 1min delayed | Polling yfinance |
| Makrodaten | Täglich | FRED API |
| News | 5min | NewsAPI + RSS |
| On-Chain | Stündlich | REST Polling |
| Options | 15min | yfinance |

---

### Storage — Was wohin?
```
┌─────────────────────────────────────────────────┐
│  DuckDB (lokal, Haupt-Datenbank)                │
│  → OHLCV Zeitreihen                             │
│  → Fundamentals                                 │
│  → Berechnete Quant-Metriken                    │
│  → Schnell, kein Server, SQL-kompatibel         │
├─────────────────────────────────────────────────┤
│  SQLite                                         │
│  → User-Settings                                │
│  → Watchlists                                   │
│  → Alerts                                       │
├─────────────────────────────────────────────────┤
│  Redis (lokal, In-Memory Cache)                 │
│  → Live-Preise (TTL: 1s)                        │
│  → API-Responses cachen                         │
│  → Rate-Limit Tracking                          │
├─────────────────────────────────────────────────┤
│  Parquet Files                                  │
│  → Historische Daten (>1 Jahr)                  │
│  → Backtesting-Datasets                         │
│  → Platzsparend, schnell lesbar                 │
└─────────────────────────────────────────────────┘
```

---

## 2️⃣ PROCESSING LAYER

### Quant Engine
```
processing/
└── quant/
    ├── returns.py          ← Log/Simple Returns, Rolling Stats
    ├── risk.py             ← VaR, CVaR, Max Drawdown
    ├── ratios.py           ← Sharpe, Sortino, Calmar, Omega
    ├── portfolio.py        ← Efficient Frontier, HRP, Kelly
    ├── factors.py          ← Beta, Alpha, Fama-French
    ├── statistics.py       ← Hurst, ADF, Autocorrelation
    ├── options.py          ← Black-Scholes, Greeks, IV
    ├── volatility.py       ← RV, GARCH, Vol Surface
    └── technical.py        ← Alle TA-Indikatoren (ta-lib)
```

**Wann wird was berechnet?**
```
On Ingestion (sofort):     Technische Indikatoren, Returns
Stündlich (Batch):         Sharpe, VaR, Korrelationsmatrix
Täglich (Nacht):           Efficient Frontier, Faktor-Exposure
On Demand (User-Request):  Backtesting, Monte Carlo, Options Pricing
```

### NLP / Sentiment Engine
```
processing/
└── nlp/
    ├── sentiment.py        ← FinBERT (HuggingFace, gratis)
    ├── ner.py              ← Named Entity Recognition (spaCy)
    ├── aggregator.py       ← Asset-Level Sentiment Score
    └── social.py           ← Reddit/Twitter Aggregation
```

**Pipeline pro News-Artikel:**
```
Raw Text
  → Sprachfilter (EN/DE)
  → NER: Welche Assets erwähnt?
  → FinBERT: Sentiment Score (−1 bis +1)
  → Speichern in DuckDB
  → Asset-Sentiment aggregieren (rolling 24h)
```

### Signal Engine
```
processing/
└── signals/
    ├── technical.py        ← TA-Signale (RSI oversold, MACD cross)
    ├── macro.py            ← Yield Curve, CPI-Überraschungen
    ├── sentiment.py        ← Sentiment Extremwerte
    ├── onchain.py          ← MVRV, SOPR Signale
    └── composite.py        ← Alle Signale kombinieren → Score
```

---

## 3️⃣ API LAYER

**FastAPI** als Backend — einfach, schnell, Python-nativ
```
api/
├── routes/
│   ├── prices.py           ← GET /prices/{asset}?tf=1d
│   ├── quant.py            ← GET /quant/{asset}/metrics
│   ├── portfolio.py        ← POST /portfolio/optimize
│   ├── news.py             ← GET /news?asset=BTC&limit=20
│   ├── calendar.py         ← GET /calendar/events
│   ├── options.py          ← GET /options/{asset}/chain
│   └── signals.py          ← GET /signals/{asset}
├── websocket.py            ← WS /ws/prices (Live-Stream)
└── cache.py                ← Redis-Caching Decorator
```

**WebSocket für Live-Daten:**
```
Binance WS → Backend → Frontend WS
(Crypto Preise in Echtzeit, kein Polling nötig)
```

---

## 4️⃣ FRONTEND

**Stack:** React + TradingView Lightweight Charts + Recharts + TailwindCSS
```
frontend/
├── components/
│   ├── charts/
│   │   ├── CandlestickChart.jsx    ← TradingView Library
│   │   ├── VolSurface.jsx          ← D3.js 3D
│   │   ├── CorrelationHeatmap.jsx  ← Recharts
│   │   └── EfficientFrontier.jsx   ← D3.js
│   ├── panels/
│   │   ├── NewsPanel.jsx
│   │   ├── CalendarPanel.jsx
│   │   ├── QuantMetrics.jsx
│   │   ├── RiskPanel.jsx
│   │   └── OptionsChain.jsx
│   └── layout/
│       ├── Dashboard.jsx
│       └── Sidebar.jsx
├── hooks/
│   ├── useWebSocket.js             ← Live-Preise
│   ├── useQuant.js                 ← Quant-Daten fetchen
│   └── usePortfolio.js
└── store/
    └── zustand.js                  ← State Management
```

---

## 5️⃣ PROJEKT-STRUKTUR (komplett)
```
finance-os/
├── ingestion/          ← Daten holen
├── processing/
│   ├── quant/          ← Mathematik
│   ├── nlp/            ← Sentiment
│   └── signals/        ← Signale
├── storage/
│   ├── duckdb/         ← Zeitreihen
│   ├── sqlite/         ← User-Daten
│   └── parquet/        ← Historisches
├── api/                ← FastAPI Backend
├── frontend/           ← React
├── scheduler/          ← APScheduler Jobs
├── config/
│   ├── assets.yaml     ← Watchlist definieren
│   └── settings.yaml   ← API Keys, Limits
├── docker-compose.yml  ← Alles starten mit 1 Befehl
└── requirements.txt
```

---

## 6️⃣ DEPLOYMENT (gratis, lokal)
```
docker-compose up
  ├── redis          (Port 6379)
  ├── backend        (FastAPI, Port 8000)
  ├── scheduler      (APScheduler Daemon)
  └── frontend       (React Dev Server, Port 3000)
```

Wenn online: **Render.com Free Tier** für Backend + **Vercel** für Frontend.

---

## 7️⃣ BUILD-REIHENFOLGE (realistisch)
```
Woche 1-2:   DuckDB Setup + yfinance + CoinGecko Ingestion
Woche 3-4:   Quant Engine (Returns, VaR, Sharpe, Korrelation)
Woche 5-6:   FastAPI + WebSocket
Woche 7-8:   React Dashboard + TradingView Charts
Woche 9-10:  NLP Sentiment (FinBERT)
Woche 11-12: Options + Vol Surface
Woche 13+:   Backtesting Engine, Signale, Alerts


finance-os/
└── ingestion/
    ├── collectors/
    │   ├── stocks.py       ← yfinance, Alpha Vantage
    │   ├── crypto.py       ← CoinGecko, Binance WebSocket
    │   ├── macro.py        ← FRED API
    │   ├── news.py         ← NewsAPI + RSS Feeds
    │   ├── onchain.py      ← Glassnode Free, CryptoQuant
    │   └── options.py      ← yfinance Options Chain
    ├── scheduler.py        ← APScheduler (kein Airflow nötig)
    └── normalizer.py       ← Alles ins gleiche Schema


┌─────────────────────────────────────────────────────────┐
│                    EXTERNE DATENQUELLEN                  │
│  Yahoo Finance │ CoinGecko │ Binance │ FRED │ NewsAPI   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                     DATA LAYER                          │
│         Ingestion → Normalisierung → Storage            │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                   PROCESSING LAYER                      │
│     Quant Engine │ NLP Engine │ Signal Engine           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                      API LAYER                          │
│                  FastAPI (REST + WS)                    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    FRONTEND                             │
│              React + TradingView Charts                 │
└─────────────────────────────────────────────────────────┘
