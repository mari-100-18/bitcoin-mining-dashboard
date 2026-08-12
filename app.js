(function () {
  'use strict';

  const state = {
    activeTab: 'home',
    calculatorOpen: false,
    btcPerDayInput: '0.42',
    convBtc: '',
    convSats: '',
    selectedIssueIndex: 0,
    newsFilter: 'ALL',
  };

  const live = {
    btcPriceUsd: FALLBACK_BTC_PRICE,
    btcSource: 'cached',
    stats: FALLBACK_STATS,
    statsSource: 'cached',
    oceanBlocks: FALLBACK_OCEAN_BLOCKS,
    oceanSource: 'cached',
  };

  // ---------- formatting helpers (mirrors the original prototype's logic) ----------
  const fmtDiff = (t) => t.toFixed(2) + 'T';
  const fmtPct = (p) => (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
  const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
  const fmtNum = (n, d) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtBlockTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  };

  function setState(patch) {
    Object.assign(state, patch);
    render();
  }

  // ---------- derived view model ----------
  function computeVals() {
    const s = state;
    const btcPrice = live.btcPriceUsd;
    const rs = live.stats;

    const filteredNews = s.newsFilter === 'ALL' ? NEWS_ITEMS : NEWS_ITEMS.filter((n) => n.ticker === s.newsFilter);

    const equityPrices = EQUITY_PRICES.map((eq) => ({
      ...eq,
      priceLabel: fmtNum(eq.price, 2),
      pctLabel: fmtPct(eq.pct),
      pctColor: eq.pct >= 0 ? 'var(--green)' : 'var(--red)',
    }));

    const btcPerDay = parseFloat(s.btcPerDayInput) || 0;
    const satsPerDay = btcPerDay * 1e8;
    const satsPerMonth = satsPerDay * 30;
    const usdPerDay = btcPerDay * btcPrice;

    const selectedIssue = LETTER_ISSUES[s.selectedIssueIndex];
    const latestBlock = live.oceanBlocks[0];
    const maxBar = 6;

    const hashPrice = computeHashPriceUsdPerTh(rs, btcPrice);
    const blocksMined24h = computeBlocksMined24h(rs);

    return {
      btcPrice, rs, filteredNews, equityPrices, btcPerDay, satsPerDay, satsPerMonth, usdPerDay,
      selectedIssue, latestBlock, maxBar, hashPrice, blocksMined24h,
      lastChangeColor: rs.lastChangePct >= 0 ? 'var(--green)' : 'var(--red)',
      lastChangeBarPct: Math.min(100, Math.abs(rs.lastChangePct) / maxBar * 100),
      estNextChangeColor: rs.estNextChangePct >= 0 ? 'var(--green)' : 'var(--red)',
      estNextChangeBarPct: Math.min(100, Math.abs(rs.estNextChangePct) / maxBar * 100),
    };
  }

  // ---------- screen renderers ----------
  function renderHome(v) {
    const newsPreview = NEWS_ITEMS.slice(0, 2).map((n) => `
      <div style="display:flex;gap:8px;font-size:12.5px;color:var(--text-dim);padding:3px 0;">
        <span style="color:var(--accent);font-weight:700;flex-shrink:0;">${esc(n.ticker)}</span>
        <span>${esc(n.headline)}</span>
      </div>`).join('');

    return `
    <div class="page-title heading">Overview</div>
    <div class="page-sub">${esc(TODAY_LABEL)}</div>

    <div class="two-up">
      <div>
        <div class="stat-label">BTC/USD</div>
        <div class="stat-value">$${fmtNum(v.btcPrice, 2)}</div>
      </div>
      <div>
        <div class="stat-label">Network hashrate</div>
        <div class="stat-value" style="color:var(--accent);">${fmtNum(v.rs.hashrateEhs, 2)} EH/s</div>
      </div>
    </div>

    <button class="card link" data-action="open-calc">
      <div class="row-between">
        <div class="heading" style="font-size:15px;font-weight:600;">BTC &rarr; SATS calculator</div>
        <div class="chevron">&rsaquo;</div>
      </div>
      <div style="display:flex;gap:24px;">
        <div><div class="small-label">Mining</div><div class="value-md">${v.btcPerDay.toFixed(2)} BTC/day</div></div>
        <div><div class="small-label">&asymp; SATS/day</div><div class="value-md" style="color:var(--accent);">${fmtInt(v.satsPerDay)}</div></div>
      </div>
    </button>

    <button class="card link" data-action="go-tab" data-tab="difficulty">
      <div class="row-between">
        <div class="heading" style="font-size:15px;font-weight:600;">Difficulty &amp; hashrate</div>
        <div class="chevron">&rsaquo;</div>
      </div>
      <div class="row-between" style="align-items:flex-end;gap:10px;">
        <div style="min-width:0;"><div class="small-label">Difficulty &middot; epoch ${v.rs.epoch}</div><div class="value-md">${fmtDiff(v.rs.difficulty)}</div></div>
        <div style="text-align:right;flex-shrink:0;font-size:12px;color:var(--text-faint);">Last <span style="font-weight:700;color:${v.lastChangeColor};">${fmtPct(v.rs.lastChangePct)}</span> &middot; Est. <span style="font-weight:700;color:${v.estNextChangeColor};">${fmtPct(v.rs.estNextChangePct)}</span></div>
      </div>
      <div style="font-size:12px;color:var(--text-faint);">Retargets ~${esc(v.rs.retargetDate)} &middot; ${fmtInt(v.rs.blocksToRetarget)} blocks to go</div>
    </button>

    <button class="card link" data-action="go-tab" data-tab="blocks" style="gap:8px;">
      <div class="row-between">
        <div class="heading" style="font-size:15px;font-weight:600;">Ocean Mining Pool</div>
        <div class="chevron">&rsaquo;</div>
      </div>
      <div style="font-size:13px;color:var(--text-dim);">Block #${fmtInt(v.latestBlock.height)} found &middot; ${esc(v.latestBlock.dateLabel)}</div>
      <div style="font-size:12px;color:var(--text-faint);">3.125 BTC + ${v.latestBlock.fee.toFixed(3)} BTC fees &middot; no-KYC, Datum template</div>
    </button>

    <button class="card link" data-action="go-tab" data-tab="news">
      <div class="row-between">
        <div class="heading" style="font-size:15px;font-weight:600;">Mining equities</div>
        <div class="chevron">&rsaquo;</div>
      </div>
      ${newsPreview}
    </button>

    <button class="card link" data-action="go-tab" data-tab="letter" style="gap:6px;">
      <div class="row-between">
        <div class="heading" style="font-size:15px;font-weight:600;">This week's letter</div>
        <div class="chevron">&rsaquo;</div>
      </div>
      <div style="font-size:13px;color:var(--text-dim);line-height:1.4;">${esc(LETTER_ISSUES[0].subject)}</div>
      <div style="font-size:11.5px;color:var(--text-faint);">JB On Chain &middot; ${esc(LETTER_ISSUES[0].dateLabel)}</div>
    </button>

    <div class="footnote">Price, difficulty &amp; hashrate: live (CoinGecko / mempool.space) &middot; as of ${esc(v.rs.asOf)}</div>
  `;
  }

  function renderDifficulty(v) {
    return `
    <div class="page-title heading">Difficulty &amp; Hashrate</div>
    <div style="display:flex;gap:10px;">
      <div class="card" style="flex:1;padding:14px;">
        <div class="small-label">Current difficulty</div>
        <div class="value-md" style="font-size:20px;">${fmtDiff(v.rs.difficulty)}</div>
        <div style="font-size:11px;color:var(--text-faintest);margin-top:3px;">Epoch ${v.rs.epoch}</div>
      </div>
      <div class="card" style="flex:1;padding:14px;">
        <div class="small-label">Network hashrate (live)</div>
        <div class="value-md" style="font-size:20px;color:var(--accent);">${fmtNum(v.rs.hashrateEhs, 2)} EH/s</div>
      </div>
    </div>

    <div class="card" style="gap:12px;display:flex;flex-direction:column;">
      <div class="small-label">This epoch vs. next estimate</div>
      <div class="bar-row">
        <div class="top"><span style="color:var(--text-dim);white-space:nowrap;">Last adjustment</span><span style="font-weight:700;white-space:nowrap;color:${v.lastChangeColor};">${fmtPct(v.rs.lastChangePct)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="background:${v.lastChangeColor};width:${v.lastChangeBarPct}%;"></div></div>
      </div>
      <div class="bar-row">
        <div class="top"><span style="color:var(--text-dim);white-space:nowrap;">Estimated next</span><span style="font-weight:700;white-space:nowrap;color:${v.estNextChangeColor};">${fmtPct(v.rs.estNextChangePct)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="background:${v.estNextChangeColor};width:${v.estNextChangeBarPct}%;"></div></div>
      </div>
      <div style="font-size:12px;color:var(--text-faint);">Retarget block ${fmtInt(v.rs.retargetBlock)} &middot; est. ${esc(v.rs.retargetDate)} &middot; ${fmtInt(v.rs.blocksToRetarget)} blocks to go</div>
    </div>

    <div class="card" style="gap:10px;display:flex;flex-direction:column;">
      <div class="small-label">Mining stats (live / derived)</div>
      <div class="stat-grid">
        <div><div class="small-label">Avg block time</div><div class="value-sm">${fmtBlockTime(v.rs.avgBlockTimeSec)}</div></div>
        <div><div class="small-label">Hashprice (est., excl. fees)</div><div class="value-sm">$${v.hashPrice.toFixed(3)}/TH</div></div>
        <div><div class="small-label">Block subsidy</div><div class="value-sm">3.125 BTC</div></div>
        <div><div class="small-label">Blocks mined (24h, est.)</div><div class="value-sm">${v.blocksMined24h}</div></div>
        <div><div class="small-label">Block height</div><div class="value-sm">${fmtInt(v.rs.blockHeight)}</div></div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text-faintest);">Full history: <a href="https://charts.bitbo.io/mining-difficulty/" target="_blank" rel="noopener">charts.bitbo.io/mining-difficulty</a></div>
    <div class="footnote">Live: mempool.space public API &middot; refreshes automatically &middot; ${esc(v.rs.asOf)}</div>
  `;
  }

  function renderBlocks(v) {
    const rows = live.oceanBlocks.map((b) => `
      <div class="block-item">
        <div>
          <div class="height">#${fmtInt(b.height)}</div>
          <div class="date">${esc(b.dateLabel)}</div>
        </div>
        <div>
          <div class="total">${(BLOCK_SUBSIDY_BTC + b.fee).toFixed(3)} BTC</div>
          <div class="incl">incl. ${b.fee.toFixed(3)} fees</div>
        </div>
      </div>`).join('');

    return `
    <div>
      <div class="page-title heading">Blocks Found</div>
      <div class="page-sub">Ocean Mining Pool</div>
    </div>
    <div style="font-size:12.5px;color:var(--text-faint);line-height:1.5;">Every block below was assembled by the miner who found it using Datum, not handed down by the pool &mdash; no KYC, no custodied funds.</div>
    ${rows}
    <div class="footnote">${live.oceanSource === 'live' ? 'Live from mempool.space' : 'Cached snapshot &mdash; live fetch unavailable right now'}</div>
  `;
  }

  function renderNews(v) {
    const equityStrip = v.equityPrices.map((eq) => `
      <div class="equity-pill">
        <div class="ticker">${esc(eq.ticker)}</div>
        <div class="price">$${eq.priceLabel}</div>
        <div class="pct" style="color:${eq.pctColor};">${eq.pctLabel}</div>
      </div>`).join('');

    const chips = TICKER_LIST.map((t) => `
      <button class="chip ${state.newsFilter === t ? 'active' : ''}" data-action="filter-news" data-ticker="${esc(t)}">${esc(t)}</button>`).join('');

    const items = v.filteredNews.map((n) => `
      <div class="news-item">
        <div class="top">
          <div class="tags">
            <span class="ticker">${esc(n.ticker)}</span>
            <span class="cat">${esc(n.category)}</span>
          </div>
          <span class="date">${esc(n.dateLabel)}</span>
        </div>
        <div class="headline">${esc(n.headline)}</div>
        <div class="summary">${esc(n.summary)}</div>
      </div>`).join('');

    return `
    <div class="page-title heading">Mining Equities</div>
    <div class="equity-strip">${equityStrip}</div>
    <div class="chips">${chips}</div>
    ${items}
    <div class="footnote">Stock prices &amp; headlines: dated snapshot (${esc(EQUITY_SNAPSHOT_DATE)}) &mdash; no free live no-key API for equities/news, updated by hand.</div>
  `;
  }

  function renderLetter(v) {
    const chips = LETTER_ISSUES.map((iss, idx) => `
      <button class="chip ${state.selectedIssueIndex === idx ? 'active' : ''}" data-action="select-issue" data-idx="${idx}">${idx === 0 ? 'This week' : esc(iss.dateLabel)}</button>`).join('');

    const paragraphs = v.selectedIssue.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');

    return `
    <div>
      <div class="page-title heading">Weekly Letter</div>
      <div style="font-size:12.5px;color:var(--text-faint);margin-top:2px;">New issue every Friday</div>
    </div>
    <div class="chips">${chips}</div>
    <div class="card letter-card">
      <div>
        <div class="letter-subject">${esc(v.selectedIssue.subject)}</div>
        <div class="letter-byline">JB On Chain &middot; ${esc(v.selectedIssue.dateLabel)}</div>
      </div>
      ${paragraphs}
      <div class="letter-sign">JB On Chain</div>
    </div>
  `;
  }

  function renderCalculator(v) {
    return `
    <div class="modal-backdrop" data-action="close-calc-backdrop">
      <div class="modal-sheet" data-stop>
        <div class="modal-header">
          <button class="modal-close" data-action="close-calc">&lsaquo;</button>
          <div class="modal-title">Calculator</div>
        </div>
        <div class="modal-body">
          <div>
            <div class="subhead">Mining calculator</div>
            <div class="field">
              <label>BTC mined per day</label>
              <input type="number" step="0.01" id="btcPerDayInput" value="${esc(state.btcPerDayInput)}" />
            </div>
            <div class="result-row">
              <div class="result-box"><div class="k">SATS / day</div><div class="v accent">${fmtInt(v.satsPerDay)}</div></div>
              <div class="result-box"><div class="k">SATS / month</div><div class="v">${fmtInt(v.satsPerMonth)}</div></div>
            </div>
            <div class="result-box" style="margin-top:10px;"><div class="k">&asymp; USD / day (est.)</div><div class="v">$${fmtInt(v.usdPerDay)}</div></div>
          </div>
          <div class="divider"></div>
          <div>
            <div class="subhead">Quick convert</div>
            <div class="field">
              <label>BTC</label>
              <input class="plain" type="number" id="convBtc" value="${esc(state.convBtc)}" placeholder="0.0" />
            </div>
            <div class="field" style="margin-top:12px;">
              <label>SATS</label>
              <input class="plain" type="number" id="convSats" value="${esc(state.convSats)}" placeholder="0" />
            </div>
            <div style="font-size:11px;color:var(--text-faintest);margin-top:10px;">1 BTC = 100,000,000 SATS</div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  const TABS = [
    { key: 'home', label: 'Home' },
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'blocks', label: 'Blocks' },
    { key: 'news', label: 'News' },
    { key: 'letter', label: 'Letter' },
  ];

  function renderTabbar() {
    return TABS.map((t) => `
      <button class="tab-btn ${state.activeTab === t.key ? 'active' : ''}" data-action="go-tab" data-tab="${t.key}">
        <div class="dot"></div>
        <div class="label">${t.label}</div>
      </button>`).join('');
  }

  function render() {
    const v = computeVals();
    const screenMap = { home: renderHome, difficulty: renderDifficulty, blocks: renderBlocks, news: renderNews, letter: renderLetter };
    const screenHtml = screenMap[state.activeTab](v);

    const btcBadgeClass = live.btcSource === 'live' ? 'is-live' : 'is-cached';
    const badgeLabel = live.btcSource === 'live' ? '&#9679; live' : 'cached';

    document.getElementById('app-shell').innerHTML = `
      <div class="topbar">
        <div class="brand"><span class="dot"></span> Mining Dashboard</div>
        <div class="live-badge ${btcBadgeClass}">${badgeLabel}</div>
      </div>
      <div class="screen ${state.activeTab === 'home' ? '' : 'tight'}">${screenHtml}</div>
      <div class="tabbar">${renderTabbar()}</div>
      ${state.calculatorOpen ? renderCalculator(v) : ''}
    `;

    if (state.calculatorOpen) {
      const btcInput = document.getElementById('btcPerDayInput');
      const convBtcInput = document.getElementById('convBtc');
      const convSatsInput = document.getElementById('convSats');
      btcInput.addEventListener('input', (e) => setState({ btcPerDayInput: e.target.value }));
      convBtcInput.addEventListener('input', (e) => {
        const val = e.target.value;
        let sats = '';
        if (val !== '' && !isNaN(parseFloat(val))) sats = Math.round(parseFloat(val) * 1e8).toString();
        setState({ convBtc: val, convSats: sats });
      });
      convSatsInput.addEventListener('input', (e) => {
        const val = e.target.value;
        let btc = '';
        if (val !== '' && !isNaN(parseFloat(val))) {
          btc = (parseFloat(val) / 1e8).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
        }
        setState({ convSats: val, convBtc: btc });
      });
      // full-innerHTML re-render drops focus every keystroke unless we restore it
      if (lastFocusedInputId) {
        const toFocus = document.getElementById(lastFocusedInputId);
        if (toFocus) {
          toFocus.focus();
          try {
            const len = toFocus.value.length;
            toFocus.setSelectionRange(len, len);
          } catch (_) {
            // number inputs don't support setSelectionRange in most browsers; focus is enough
          }
        }
      }
    }
  }

  let lastFocusedInputId = null;
  document.addEventListener('focusin', (e) => {
    if (e.target && e.target.id && e.target.tagName === 'INPUT') lastFocusedInputId = e.target.id;
  });

  // ---------- event delegation ----------
  document.addEventListener('click', (e) => {
    const backdrop = e.target.closest('[data-action="close-calc-backdrop"]');
    if (backdrop && !e.target.closest('[data-stop]')) {
      setState({ calculatorOpen: false });
      return;
    }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'go-tab') setState({ activeTab: el.dataset.tab, calculatorOpen: false });
    else if (action === 'open-calc') setState({ calculatorOpen: true });
    else if (action === 'close-calc') setState({ calculatorOpen: false });
    else if (action === 'filter-news') setState({ newsFilter: el.dataset.ticker });
    else if (action === 'select-issue') setState({ selectedIssueIndex: parseInt(el.dataset.idx, 10) });
  });

  // ---------- live data polling ----------
  const TODAY_LABEL = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  async function refreshBtcPrice() {
    try {
      live.btcPriceUsd = await fetchBtcPriceUsd();
      live.btcSource = 'live';
    } catch (err) {
      console.warn('BTC price live fetch failed, keeping last known value', err);
      live.btcSource = live.btcSource === 'live' ? 'live' : 'cached';
    }
    render();
  }

  async function refreshMiningStats() {
    try {
      const fresh = await fetchMiningStats();
      live.stats = fresh;
      live.statsSource = 'live';
    } catch (err) {
      console.warn('Mining stats live fetch failed, keeping last known value', err);
    }
    render();
  }

  async function refreshOceanBlocks() {
    try {
      live.oceanBlocks = await fetchOceanBlocks();
      live.oceanSource = 'live';
    } catch (err) {
      console.warn('Ocean blocks live fetch failed, keeping cached list', err);
    }
    render();
  }

  render();
  refreshBtcPrice();
  refreshMiningStats();
  refreshOceanBlocks();

  setInterval(refreshBtcPrice, 60 * 1000);
  setInterval(refreshMiningStats, 5 * 60 * 1000);
  setInterval(refreshOceanBlocks, 10 * 60 * 1000);
})();
