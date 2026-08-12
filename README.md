# Bitcoin Mining Dashboard — live website

A static site, no build step, no server. Files:

- `index.html` / `styles.css` — page + styles
- `data.js` — the mining-equities, news, and weekly-letter content (hand-updated snapshot)
- `live.js` — the live data fetchers (BTC price, difficulty/hashrate/block height, Ocean pool blocks)
- `app.js` — app logic, rendering, tabs, calculator

## What's actually live vs. a snapshot

| Data | Source | Live? |
|---|---|---|
| BTC/USD price | CoinGecko public API | Yes — refetches every 60s |
| Difficulty, hashrate, block height, retarget estimate | mempool.space public API | Yes — refetches every 5 min |
| "Hashprice" & 24h blocks mined | Derived from the live numbers above | Yes (calculated, not fetched) |
| Ocean Mining Pool blocks-found log | mempool.space public API | Yes — refetches every 10 min, falls back to a cached list if the pool endpoint's response shape doesn't match |
| Mining-equity prices (MARA/RIOT/CLSK/CORZ/HUT/WULF) & news | Hand-written in `data.js` | No — no free, no-key, browser-callable API exists for stock prices/news. Update `EQUITY_PRICES` and `NEWS_ITEMS` in `data.js` and redeploy when you want fresh numbers. |
| Weekly letter | Hand-written in `data.js` (`LETTER_ISSUES`) | No — add a new entry at the top of the array each week. |

Every live fetch is wrapped in a try/catch — if a fetch fails (offline, rate-limited, API down), the UI falls back to the last known value instead of breaking. The small badge in the top-right corner shows "live" vs "cached" for the BTC price; the Blocks and Difficulty screens say directly whether they're showing live or cached data.

**Important:** this was built and tested in a network-sandboxed environment that couldn't reach the live APIs, so the fetch code is correct but unverified end-to-end. Once deployed, open the site and confirm the badge says "live" (not "cached") and that difficulty/hashrate/block height match current real values — see the Deploying section for a quick check.

## Deploying — connected to Netlify via this repo

This repo is meant to be linked directly to Netlify (Netlify → "Import an existing project" → GitHub → pick this repo). Build settings: no build command, publish directory `.` (repo root). Once linked, every push to `main` auto-deploys — no manual dragging needed.

To update the site (e.g. a new weekly letter, refreshed stock prices): edit `data.js`, commit, push to `main`. Netlify picks it up automatically within about a minute.
