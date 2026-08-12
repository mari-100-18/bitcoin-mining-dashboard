// Live data: fetched client-side, in the visitor's browser, from free
// public APIs that don't require a key. No backend/server involved.
//
//  - BTC/USD price          -> CoinGecko public API
//  - Difficulty / hashrate / block height -> mempool.space public API
//  - Ocean pool "blocks found" log        -> mempool.space mining-pool API
//
// Every call is wrapped so a failure (offline, rate-limited, endpoint
// shape changed) just falls back to the last good value / the seed
// snapshot in data.js — it never breaks the UI.

const BLOCK_SUBSIDY_BTC = 3.125;

async function fetchJson(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const ct = res.headers.get('content-type') || '';
    return ct.includes('json') ? await res.json() : await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchBtcPriceUsd() {
  const data = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
  const price = data && data.bitcoin && data.bitcoin.usd;
  if (typeof price !== 'number' || !isFinite(price)) throw new Error('bad price payload');
  return price;
}

function fmtRetargetDate(ms) {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function fetchMiningStats() {
  const [diffAdj, hashrate3d, heightRaw] = await Promise.all([
    fetchJson('https://mempool.space/api/v1/difficulty-adjustment'),
    fetchJson('https://mempool.space/api/v1/mining/hashrate/3d'),
    fetchJson('https://mempool.space/api/blocks/tip/height'),
  ]);

  const blockHeight = typeof heightRaw === 'number' ? heightRaw : parseInt(heightRaw, 10);
  if (!Number.isFinite(blockHeight)) throw new Error('bad height payload');

  const currentDifficulty = hashrate3d && hashrate3d.currentDifficulty;
  const currentHashrateHs = hashrate3d && hashrate3d.currentHashrate;
  if (!Number.isFinite(currentDifficulty) || !Number.isFinite(currentHashrateHs)) {
    throw new Error('bad hashrate payload');
  }

  const remainingBlocks = diffAdj.remainingBlocks;
  const nextRetargetHeight = diffAdj.nextRetargetHeight;
  const estNextChangePct = diffAdj.difficultyChange;
  const lastChangePct = diffAdj.previousRetarget;
  const estimatedRetargetMs = diffAdj.estimatedRetargetDate;
  const timeAvgMs = diffAdj.timeAvg; // avg time per block over current epoch, ms

  if (![remainingBlocks, nextRetargetHeight, estNextChangePct, lastChangePct, estimatedRetargetMs, timeAvgMs]
    .every(Number.isFinite)) {
    throw new Error('bad difficulty-adjustment payload');
  }

  const avgBlockTimeSec = timeAvgMs / 1000;
  const epoch = Math.floor(blockHeight / 2016);

  return {
    difficulty: currentDifficulty / 1e12, // T
    epoch,
    lastChangePct,
    estNextChangePct,
    blocksToRetarget: remainingBlocks,
    retargetBlock: nextRetargetHeight,
    retargetDate: fmtRetargetDate(estimatedRetargetMs),
    hashrateEhs: currentHashrateHs / 1e18,
    avgBlockTimeSec,
    blockHeight,
    asOf: 'just now (live)',
  };
}

// Derived, not fetched: standard "hashprice" formula (daily block-subsidy
// revenue per TH/s of hashrate, fees excluded) from live price/difficulty
// numbers we already have.
function computeHashPriceUsdPerTh(stats, btcPriceUsd) {
  const blocksPerDay = 86400 / stats.avgBlockTimeSec;
  const dailyBtcIssued = blocksPerDay * BLOCK_SUBSIDY_BTC;
  const dailyUsdIssued = dailyBtcIssued * btcPriceUsd;
  const networkThs = stats.hashrateEhs * 1e6;
  return dailyUsdIssued / networkThs;
}

function computeBlocksMined24h(stats) {
  return Math.round(86400 / stats.avgBlockTimeSec);
}

// mempool.space's blocks-by-pool endpoint is /api/v1/mining/pool/:slug/blocks
// (the plain /pool/:slug endpoint returns profile/stats, not blocks). The
// exact pool slug for Ocean is unverified, so try the likely candidates in
// order and use whichever responds with a real blocks array.
const OCEAN_POOL_SLUG_CANDIDATES = ['ocean', 'oceanxyz'];

async function fetchOceanBlocks() {
  let lastErr = null;
  for (const slug of OCEAN_POOL_SLUG_CANDIDATES) {
    try {
      const data = await fetchJson(`https://mempool.space/api/v1/mining/pool/${slug}/blocks`);
      const rawBlocks = Array.isArray(data) ? data : data && (data.blocks || data.recentBlocks || data.recent);
      if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) throw new Error('no blocks in payload');
      return parseOceanBlocks(rawBlocks);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('no blocks in payload');
}

function parseOceanBlocks(rawBlocks) {
  const blocks = rawBlocks.slice(0, 8).map((b) => {
    const height = b.height ?? b.blockHeight ?? b.h;
    const ts = b.timestamp ?? b.time ?? b.blockTimestamp ?? b.mediantime;
    const feeBtc = (b.extras && b.extras.totalFees != null)
      ? b.extras.totalFees / 1e8
      : (typeof b.fee === 'number' ? b.fee : null);
    if (!Number.isFinite(height) || !Number.isFinite(ts)) return null;
    const dateMs = ts > 2e10 ? ts : ts * 1000; // seconds vs ms
    const dateLabel = new Date(dateMs).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
    }) + ' UTC';
    return {
      height,
      dateLabel,
      fee: Number.isFinite(feeBtc) ? feeBtc : 0,
    };
  }).filter(Boolean);

  if (blocks.length === 0) throw new Error('unparseable block entries');
  return blocks;
}
