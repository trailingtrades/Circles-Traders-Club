# ⭕ CTC Paper Trade PRO — Option-Buying Ecosystem (PineScript)

A self-updating **paper (demo) trading** cockpit for Indian F&O, built for
TradingView (Pine Script v6), focused on **option buying** — CE buying, PE
buying, long straddle and long strangle. Education tool for Circles Traders
Club — **no real orders are ever placed.**

File: [`paper-trading-fno.pine`](./paper-trading-fno.pine)

## Project phases

| Phase | What | Status |
| --- | --- | --- |
| 1 | Manual paper journal (P&L, days, reason) | ✅ Done |
| 2 | Auto engine — chart-following symbol, auto lot size, futures price, click-to-trade, R:R, journal book | ✅ Done |
| 3 | **Option Engine** — live premiums by expiry+strike (no manual updates), IV from live premium, Delta/Gamma/Theta/Vega, breakevens, straddle/strangle | ✅ Done |
| 4 | **Opportunity Scanner** — BUY CE / BUY PE momentum signals, squeeze → straddle window, TradingView alerts | ✅ Done |
| 5 | Branding — ⭕ CTC logo in panel, labels, tables | ✅ Done |
| 6 | (Optional, future) Web-app integration: persistent student trade history, leaderboards | ⏳ Pending |

## How live prices work (no manual updating)

1. **Futures** — auto-fetched for the chart's symbol (`NSE:RELIANCE1!` etc.) and for every journal row. Nothing to type.
2. **Options** — turn on the **⭕ Option engine**, pick the **expiry date**, **strike** and **CE/PE**. The script builds the real TradingView contract symbol (e.g. `NSE:NIFTY260827C24500`) and streams its premium live via `request.security`. No manual price entry, ever.
3. If TradingView shows *delayed* NSE data on your plan, the same delay applies here. Enable NSE real-time data in your TradingView profile for true live prices.
4. If the Option Engine shows `no data ⚠` — the exact contract (that expiry/strike combo) isn't listed on TradingView; double-check the expiry date and strike.

## Option Engine (Phase 3)

Two legs. Use Leg 1 alone for plain CE/PE buying; enable Leg 2 with the
opposite type for a **long straddle** (same strike) or **strangle** (different
strikes). For each leg and for the NET position it shows:

- LTP (live premium), entry premium, **P&L ₹ and %**
- **IV** — solved from the live premium via Newton-Raphson on Black-Scholes
- **Delta, Gamma, Theta (₹/day for your position), Vega (₹ per 1% IV)**
- **Breakevens** — per leg, and the combined lower/upper for straddle/strangle
- Days to expiry, total premium at risk, detected strategy name

Greeks use the chart's underlying price, the expiry you set, and a
configurable risk-free rate (default 6.5%).

## Opportunity Scanner (Phase 4) — "never miss a move"

- **BUY CE** — fast EMA crosses above slow EMA + RSI strong + volume surge
- **BUY PE** — the bearish mirror
- **STRADDLE window** — Bollinger-inside-Keltner volatility squeeze: while the
  squeeze is ON a big move is loading (get the straddle ready); when it
  RELEASES the window opens
- Signals are marked on the chart, shown in the panel, and exposed as
  **alert conditions** — right-click the chart → *Add alert* → choose this
  indicator's conditions once, and TradingView watches the live market for
  you even when the chart is closed.

## Click-to-trade + journal (Phases 1–2)

Unchanged: click Entry → Stop → Target → entry time to place the active paper
trade (auto side, auto lot size, R:R, live R-multiple, days held, reason,
risk/reward zones). The journal tracks 5 more typed trades with auto lot size
and auto futures prices, plus a BOOK NET total.

## Install

1. TradingView → open a chart → **Pine Editor** (bottom panel).
2. Delete everything there, paste the full contents of `paper-trading-fno.pine`.
3. **Save** → **Add to chart** → click the 4 points when prompted.

## Honest limits

- **Lot sizes:** index lots follow the NSE January-2026 revision (NIFTY 65, BANKNIFTY 30, FINNIFTY 60, MIDCPNIFTY 120, NIFTYNXT50 25; SENSEX 20 on BSE), cross-checked in July 2026. Stock lots are indicative — NSE revises them quarterly; confirm against the current circular and use the override field (⚠ shows for unknown symbols).
- **A logo image cannot be embedded** — Pine only renders text/emoji, so the ⭕ CTC mark is used. (Your TradingView profile picture is what shows as the publisher logo if you publish the script.)
- **IV/Greeks are model values** (Black-Scholes, European-style) — good for learning and comparison; they can differ slightly from broker-shown Greeks.
- Signals are educational starting points, not tips. **Not investment advice; not connected to any broker.**
