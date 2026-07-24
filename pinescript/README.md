# Circles Paper Trade — F&O / Options Journal (PineScript)

An on-chart **paper (demo) trading** indicator for the Indian F&O and options
market, built for TradingView (Pine Script v6). It is a learning tool for the
Circles Traders Club — **no real orders are ever placed**. You log simulated
trades and the indicator shows a live dashboard with everything on screen.

File: [`paper-trading-fno.pine`](./paper-trading-fno.pine)

## What it shows

A table on the chart with, for every trade you log:

| Column | Meaning |
| --- | --- |
| **#** | Row number |
| **Instrument** | e.g. `NIFTY 24500 CE`, `BANKNIFTY 52000 PE`, `NIFTY FUT` |
| **Side** | LONG (buy CE/PE/Fut) or SHORT (sell CE/PE/Fut) |
| **Qty (LxS)** | Lots × lot size = total quantity |
| **Entry** | Your entry price |
| **LTP/Exit** | Live price for open trades, exit price for closed trades (`*` = taken live from the chart) |
| **Days** | Number of days the position is / was held |
| **P&L (₹)** | Profit or loss in rupees (green = profit, red = loss), after optional charges |
| **P&L %** | Profit or loss as a % of premium/notional entered |
| **Status** | OPEN or CLOSED |
| **Reason** | *Reason of mine* — your own rationale / note for the trade |

Below the trades it totals **Realised** (closed trades), **Unrealised** (open
trades) and the **Net Total** P&L across everything.

## How to install

1. Open [TradingView](https://www.tradingview.com/) → open any chart.
2. Bottom panel → **Pine Editor**.
3. Paste the full contents of `paper-trading-fno.pine`.
4. Click **Save**, then **Add to chart**.
5. Click the indicator's ⚙ **Settings** to log your trades.

## How to log a paper trade

Open **Settings** and fill in a **Trade** slot (there are 6 slots):

- **Enable** — tick to activate the slot.
- **Instrument** — free text, e.g. `NIFTY 24500 CE`.
- **Side** — Buy/Long or Sell/Short (covers CE buy/sell, PE buy/sell, Futures long/short).
- **Lots** and **Lot size** — e.g. NIFTY lot size 75, BANKNIFTY 30, FINNIFTY 40, SENSEX 20 (use the current NSE/BSE lot size). Quantity = Lots × Lot size.
- **Entry price** and **Entry date**.
- **Current price (0 = auto)** — for OPEN trades. Type the latest option/future price to see live P&L. If you leave it `0` and *Auto price* is on, the indicator uses the chart's last price (best when the chart is showing the exact instrument you are trading).
- **Closed** — tick when you exit; then set **Exit price** and **Exit date**. P&L and days freeze at exit.
- **Reason of mine** — why you took the trade.

## How P&L and days are calculated

```
quantity   = lots × lot size
price used = exit price            (if the trade is Closed)
             current price          (if you typed one for an open trade)
             chart's last price     (open trade, current price = 0, Auto price ON)

per unit   = (price used − entry)   for LONG
             (entry − price used)   for SHORT
gross P&L  = per unit × quantity
charges    = round-trip charges per lot × lots      (optional, default 0)
net P&L    = gross P&L − charges
P&L %      = net P&L ÷ (entry × quantity) × 100
days held  = (exit date or today − entry date), in whole days
```

## Notes & limitations

- **Prices for open trades are manual.** TradingView cannot stream many
  different option strikes into a single indicator, so you update the *Current
  price* field (or use single-instrument auto mode) to refresh live P&L. This
  is normal and expected for a paper-trading journal.
- **Lot sizes change** — exchanges revise F&O lot sizes periodically. Always
  enter the current lot size for the contract.
- **P&L %** is measured against the premium/notional you entered (`entry ×
  quantity`), not against SPAN + exposure margin, so for option-selling and
  futures it is an indicative return, not a margin-based ROI.
- This tool is for **education and practice only**. It is not investment advice
  and does not connect to any broker.
