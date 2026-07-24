# Circles Paper Trade PRO — Auto F&O / Options (PineScript)

A self-updating **paper (demo) trading** cockpit for the Indian F&O market,
built for TradingView (Pine Script v6). Education tool for Circles Traders Club
— **no real orders are ever placed.**

File: [`paper-trading-fno.pine`](./paper-trading-fno.pine)

## What makes it automatic

Whatever chart you open, the indicator:

- **Reads the symbol from the chart** — RELIANCE, ONGC, WIPRO, NIFTY, BANKNIFTY… switch charts and it re-reads instantly.
- **Auto-fills the F&O lot size** from a built-in NSE lot-size table (keyed to the symbol). A manual **override** field always wins, for when NSE revises a lot or a symbol isn't listed.
- **Shows the front-month futures price** (e.g. `NSE:RELIANCE1!`) even while you're on the cash chart, via `request.security`.

## How to place a paper trade (click on chart)

1. Add the indicator. TradingView will ask you to **click 4 points in order**:
   **1) Entry level → 2) Stop-loss → 3) Target → 4) the entry candle (time).**
2. The trade draws automatically: entry/stop/target lines, shaded risk (red) and reward (green) zones, and a P&L label.
3. The **info panel** (top-right) then shows everything live:

| Field | Meaning |
| --- | --- |
| Side | LONG/SHORT — auto-derived (stop below entry = long, above = short) |
| Lot size | Auto from the table (or manual) |
| Lots × size = Qty | Total quantity |
| Entry / LTP | Your entry and the live price |
| Stop-loss / Target | Your levels |
| Risk / unit, Risk amount | Points at risk, and ₹ at risk |
| Planned R:R | Reward ÷ risk of the plan |
| Live R-multiple | Where price is now, in units of risk |
| P&L (live/final) | ₹ profit/loss, after optional charges |
| P&L % | Return on premium/notional entered |
| Days held | Auto-counted from the entry time |
| Status | RUNNING / TARGET HIT / STOP HIT (whichever came first) |
| Reason | Your own note for the trade |

> **Tip:** to paper-trade the **future**, open the futures chart (e.g. `NSE:RELIANCE1!`) and click there — then Entry/Stop/Target/LTP/P&L are all on the futures series and match perfectly. On a cash chart the trade runs on cash prices, with the futures price shown as info.

## The journal (extra trades)

In Settings → **Journal**, enable up to 5 more trades by typing a symbol, side,
lots and entry. Each row auto-fills its lot size and auto-fetches its front-month
futures price, showing live P&L. A **BOOK NET** row sums the journal plus the
active clicked trade — your whole paper book at a glance.

## How the numbers are calculated

```
quantity   = lots × lot size
side        = Long if stop < entry, else Short   (or forced in settings)
per unit    = (LTP − entry) for Long,  (entry − LTP) for Short
gross P&L   = per unit × quantity
net P&L     = gross P&L − (round-trip charges per lot × lots)
risk/unit   = |entry − stop|      risk ₹ = risk/unit × quantity
planned R:R = |target − entry| ÷ risk/unit
live R      = per unit ÷ risk/unit
days held   = (stop/target hit time, or today) − entry time, in whole days
```

## Install

1. TradingView → open a chart → bottom panel **Pine Editor**.
2. Delete anything in the editor, paste the full contents of `paper-trading-fno.pine`.
3. **Save**, then **Add to chart**, and click the 4 points when prompted.

## Notes & honest limits

- **Lot sizes are indicative.** Exchanges revise F&O lot sizes periodically. The built-in table is a best-effort starting point — always confirm against the current NSE circular and use the override. A `⚠` shows when a symbol isn't in the table.
- **One active clicked trade per indicator instance.** Add the indicator more than once, or use the journal, to track several at a time.
- **No persistent, broker-style trade history.** Pine can't save a growing trade log on its own — that needs a database/login (the Circles web app can, and we can wire it up later). Within Pine, trades live in the indicator's saved settings.
- For **education and practice only.** Not investment advice; not connected to any broker.
