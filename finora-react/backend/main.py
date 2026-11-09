"""FINORA backend skeleton (FastAPI + SQLite + WebSocket).

Run:  pip install fastapi "uvicorn[standard]" pyjwt passlib[bcrypt]
      uvicorn main:app --reload

What it gives you
- Register/login with hashed passwords and JWT.
- One independent virtual account per user (cash, holdings, positions, orders, trades).
- A market-data adapter interface. Ships with a SimulatedFeed; replace it with a licensed
  NSE/BSE provider (see README). Every tick carries `source` and `status` so the UI can show
  LIVE / DELAYED / HISTORICAL / SIMULATED honestly.
- A WebSocket at /ws/ticks that streams quotes.
- An order endpoint that fills against the feed on the server, so the browser cannot cheat.

The margin and charge formulas below are simplified placeholders. Port the exact rules from the
front-end (index.html: charges(), posMargin(), applyFill()) or replace with your own before relying on them.
"""
import asyncio, json, math, random, sqlite3, time
from abc import ABC, abstractmethod
from contextlib import closing
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.hash import bcrypt
from pydantic import BaseModel, Field

SECRET = "change-me-in-production"          # load from environment in production
DB = "finora.db"
START_BALANCE = 1_000_000.0                  # configurable virtual balance

# ---------------------------------------------------------------- market data
class MarketData(ABC):
    """Implement this for every provider. Never return invented prices as LIVE."""
    source: str
    status: str            # LIVE | DELAYED | HISTORICAL | SIMULATED | UNAVAILABLE

    @abstractmethod
    async def quote(self, symbol: str) -> dict: ...
    @abstractmethod
    async def history(self, symbol: str, tf: str, n: int) -> list[dict]: ...
    @abstractmethod
    def symbols(self) -> list[str]: ...

class SimulatedFeed(MarketData):
    source, status = "built-in simulator", "SIMULATED"
    BASE = {"RELIANCE": 1412.6, "TCS": 4105.25, "INFY": 1788.4, "HDFCBANK": 1742.15, "NIFTY": 24812.35}
    def __init__(self): self.px = dict(self.BASE)
    def symbols(self): return list(self.BASE)
    async def quote(self, symbol):
        p = self.px[symbol] * (1 + random.gauss(0, 0.0004)); self.px[symbol] = p
        return {"symbol": symbol, "ltp": round(p, 2), "ts": time.time(), "source": self.source, "status": self.status}
    async def history(self, symbol, tf, n): return []

# class ProviderFeed(MarketData):  # example: Zerodha Kite / Angel One SmartAPI / a licensed vendor
#     source, status = "your-provider", "LIVE"
#     ...

feed: MarketData = SimulatedFeed()

# ---------------------------------------------------------------- database
def db():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

def init():
    with closing(db()) as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE, pw TEXT, cash REAL);
        CREATE TABLE IF NOT EXISTS holdings(user_id INT, symbol TEXT, qty INT, avg REAL, PRIMARY KEY(user_id,symbol));
        CREATE TABLE IF NOT EXISTS positions(user_id INT, instrument TEXT, product TEXT, qty INT, avg REAL, PRIMARY KEY(user_id,instrument,product));
        CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, user_id INT, ts REAL, instrument TEXT, side TEXT, qty INT,
                                          product TEXT, otype TEXT, price REAL, trigger REAL, status TEXT, fill REAL, note TEXT);
        CREATE TABLE IF NOT EXISTS trades(id INTEGER PRIMARY KEY, user_id INT, ts REAL, instrument TEXT, side TEXT, qty INT,
                                          price REAL, charges REAL, realized REAL);
        """); c.commit()

# ---------------------------------------------------------------- auth
app = FastAPI(title="FINORA API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
bearer = HTTPBearer()

class Creds(BaseModel):
    email: str
    password: str = Field(min_length=8)

def token(uid: int) -> str:
    return jwt.encode({"sub": str(uid), "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET, "HS256")

def current(cr: HTTPAuthorizationCredentials = Depends(bearer)) -> int:
    try: return int(jwt.decode(cr.credentials, SECRET, ["HS256"])["sub"])
    except Exception: raise HTTPException(401, "Invalid or expired token")

@app.on_event("startup")
def _s(): init()

@app.post("/auth/register")
def register(c: Creds):
    with closing(db()) as d:
        try: cur = d.execute("INSERT INTO users(email,pw,cash) VALUES(?,?,?)", (c.email.lower(), bcrypt.hash(c.password), START_BALANCE))
        except sqlite3.IntegrityError: raise HTTPException(409, "Email already registered")
        d.commit(); return {"token": token(cur.lastrowid)}

@app.post("/auth/login")
def login(c: Creds):
    with closing(db()) as d:
        r = d.execute("SELECT * FROM users WHERE email=?", (c.email.lower(),)).fetchone()
    if not r or not bcrypt.verify(c.password, r["pw"]): raise HTTPException(401, "Wrong email or password")
    return {"token": token(r["id"])}

# ---------------------------------------------------------------- orders
class OrderIn(BaseModel):
    instrument: str
    side: str = Field(pattern="^(BUY|SELL)$")
    qty: int = Field(gt=0)
    product: str = "INTRADAY"
    otype: str = "MARKET"
    price: float = 0
    trigger: float = 0

def est_charges(value: float) -> float:        # placeholder; port charges() from the front-end
    return round(min(20, value * 0.0003) * 1.18 + value * 0.00004, 2)

@app.post("/orders")
async def place(o: OrderIn, uid: int = Depends(current)):
    if o.otype != "MARKET": raise HTTPException(501, "Only MARKET orders in this skeleton. Add a matcher loop for LIMIT/SL.")
    q = await feed.quote(o.instrument)
    px = q["ltp"]; value = px * o.qty; ch = est_charges(value)
    with closing(db()) as d:
        u = d.execute("SELECT cash FROM users WHERE id=?", (uid,)).fetchone()
        need = value * (1 if o.product == "DELIVERY" else 0.2) + ch
        if o.side == "BUY" and need > u["cash"]:
            d.execute("INSERT INTO orders(user_id,ts,instrument,side,qty,product,otype,price,trigger,status,fill,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                      (uid, time.time(), o.instrument, o.side, o.qty, o.product, o.otype, o.price, o.trigger, "REJECTED", 0, "Insufficient funds")); d.commit()
            raise HTTPException(400, "Insufficient virtual funds")
        # TODO: update holdings/positions with the same averaging and square-off logic as the front-end applyFill().
        d.execute("UPDATE users SET cash = cash + ? WHERE id=?", ((-value if o.side == "BUY" else value) - ch, uid))
        d.execute("INSERT INTO orders(user_id,ts,instrument,side,qty,product,otype,price,trigger,status,fill,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                  (uid, time.time(), o.instrument, o.side, o.qty, o.product, o.otype, o.price, o.trigger, "EXECUTED", px, ""))
        d.execute("INSERT INTO trades(user_id,ts,instrument,side,qty,price,charges,realized) VALUES(?,?,?,?,?,?,?,?)",
                  (uid, time.time(), o.instrument, o.side, o.qty, px, ch, 0))
        d.commit()
    return {"status": "EXECUTED", "fill": px, "source": q["source"], "data_status": q["status"]}

@app.get("/portfolio")
def portfolio(uid: int = Depends(current)):
    with closing(db()) as d:
        return {"cash": d.execute("SELECT cash FROM users WHERE id=?", (uid,)).fetchone()["cash"],
                "orders": [dict(r) for r in d.execute("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 100", (uid,))],
                "trades": [dict(r) for r in d.execute("SELECT * FROM trades WHERE user_id=? ORDER BY id DESC LIMIT 100", (uid,))]}

@app.get("/quote/{symbol}")
async def quote(symbol: str):
    if symbol not in feed.symbols(): raise HTTPException(404, "Unknown symbol")
    return await feed.quote(symbol)

@app.websocket("/ws/ticks")
async def ticks(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            await ws.send_text(json.dumps([await feed.quote(s) for s in feed.symbols()]))
            await asyncio.sleep(1)
    except Exception:
        pass
