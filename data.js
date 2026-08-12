// Static/manually-updated content. These have no reliable free, no-key,
// CORS-open API for a static site to poll live, so they're a dated snapshot
// that gets refreshed by hand — same limitation flagged in the original
// design chat for bitbo.io/finviz.com. Everything else in this app (BTC
// price, difficulty, hashrate, block height, Ocean's block list) is fetched
// live client-side — see live.js.

const FALLBACK_STATS = {
  difficulty: 127.48,
  epoch: 478,
  lastChangePct: 0.99,
  estNextChangePct: -4.46,
  blocksToRetarget: 1595,
  retargetBlock: 963648,
  retargetDate: 'Aug 22, 2026',
  hashrateEhs: 850.42,
  avgBlockTimeSec: 628,
  blockHeight: 962053,
  asOf: 'Aug 11, 2026 (cached snapshot)',
};

const FALLBACK_BTC_PRICE = 63623.34;

// Fallback list shown until/unless the live Ocean pool fetch succeeds.
const FALLBACK_OCEAN_BLOCKS = [
  { height: 962441, dateLabel: 'Aug 8, 2026 · 2:14 PM UTC', fee: 0.086 },
  { height: 962190, dateLabel: 'Aug 7, 2026 · 6:02 AM UTC', fee: 0.041 },
  { height: 961865, dateLabel: 'Aug 6, 2026 · 9:47 PM UTC', fee: 0.113 },
  { height: 961410, dateLabel: 'Aug 4, 2026 · 11:20 AM UTC', fee: 0.067 },
  { height: 960900, dateLabel: 'Aug 2, 2026 · 3:35 AM UTC', fee: 0.029 },
  { height: 960505, dateLabel: 'Jul 31, 2026 · 8:12 PM UTC', fee: 0.098 },
  { height: 960050, dateLabel: 'Jul 29, 2026 · 1:44 PM UTC', fee: 0.052 },
  { height: 959600, dateLabel: 'Jul 27, 2026 · 5:30 AM UTC', fee: 0.074 },
];

const EQUITY_SNAPSHOT_DATE = 'Aug 11, 2026';

const EQUITY_PRICES = [
  { ticker: 'MARA', price: 9.68, pct: 1.26 },
  { ticker: 'RIOT', price: 20.24, pct: 4.33 },
  { ticker: 'CLSK', price: 11.52, pct: -0.60 },
  { ticker: 'CORZ', price: 19.76, pct: 1.65 },
  { ticker: 'HUT', price: 88.78, pct: 3.64 },
  { ticker: 'WULF', price: 17.60, pct: 3.52 },
];

const NEWS_ITEMS = [
  { ticker: 'RIOT', dateLabel: 'Aug 11, 2026', category: 'AI Pivot', headline: 'Riot signs 20-year, $9.1B AI hosting deal with Anthropic', summary: "Analysts see meaningful upside from the new lease layered on top of Riot's existing data-center contracts." },
  { ticker: 'WULF', dateLabel: 'Aug 11, 2026', category: 'AI Pivot', headline: "TeraWulf rallies with neocloud peers after Nvidia's $500B infrastructure pledge", summary: 'Shares rose alongside Hut 8 and Core Scientific as Nvidia teams with Apollo, BlackRock and KKR to fund AI data center buildouts.' },
  { ticker: 'MARA', dateLabel: 'Aug 9, 2026', category: 'Operations', headline: 'MARA expands bitcoin-backed credit line as shares slide', summary: 'Loan collateral rose to 18,750 BTC from 4,253 in a restructured financing package; shares fell nearly 11% on the week.' },
  { ticker: 'CLSK', dateLabel: 'Aug 6, 2026', category: 'Earnings', headline: 'CleanSpark misses Q3 estimates as mining revenue slides', summary: 'Revenue of $138.0M missed the $148.9M estimate, down 30.5% year over year, with a wider than expected per-share loss.' },
  { ticker: 'MARA', dateLabel: 'Aug 6, 2026', category: 'Earnings', headline: 'MARA swings to $611M net loss despite higher Bitcoin output', summary: 'The company mined 2,422 BTC in the quarter and holds 35,577 BTC, but mark-to-market swings drove the steep loss.' },
  { ticker: 'CLSK', dateLabel: 'Aug 5, 2026', category: 'AI Pivot', headline: "CleanSpark signs its first HPC lease, $6.6B over 20 years", summary: 'The 175 MW deal at its Sandersville, Georgia campus is with an unnamed investment-grade tech company; capacity arrives in late 2027.' },
  { ticker: 'CORZ', dateLabel: 'Jul 30, 2026', category: 'AI Pivot', headline: 'Core Scientific inks AMD partnership covering up to 2.5 GW', summary: 'An initial 530 MW across five sites is anchored by 15-year leases worth more than $14B in base contracted revenue.' },
  { ticker: 'HUT', dateLabel: 'Jul 20, 2026', category: 'AI Pivot', headline: 'Hut 8 jumps up to 17% on $9.8B, 15-year AI lease for Beacon Point', summary: 'The second-phase lease anchors roughly $26.6B in expected contracted value across 949 MW of capacity.' },
];

const LETTER_ISSUES = [
  {
    dateLabel: 'Aug 8, 2026',
    subject: 'Difficulty keeps grinding higher, Ocean keeps stacking blocks, and ETF flows go quiet',
    paragraphs: [
      "Difficulty adjusted up again this morning, +2.35%, putting it at 152.4T. That's the fourth increase in a row and network hashrate is now sitting around 1,090 EH/s. A stretch like this used to spook the market, but most of the fleet running today is newer and more efficient than what was online even two years ago, so the pain from these increases is landing unevenly. If you're still running older generation ASICs, your margin just got thinner again, and I know a few smaller shops that have already gone quiet rather than mine at a loss this month.",
      "Ocean added another handful of blocks to its total this week. Nothing that moves the leaderboard, but every one of those blocks was built by the miner, not handed to them by the pool. That's the whole point of Datum and it's worth remembering why that matters. When one or two pools control block template construction for most of the hashrate, they control what goes in a block and what doesn't. Ocean is still small next to the big pools, but it's the clearest example right now of what mining looks like when that control gets pushed back down to individual miners.",
      "On the equity side, the AI pivot story kept building. TeraWulf said its Lake Mariner hosting revenue passed its mining revenue for the first time, and Core Scientific converted another site over to HPC hosting, trimming its own self-mining share again. Riot is doing the same thing at Corsicana, just more slowly. I don't think this means bitcoin mining as a business is going away at these companies, but the public miners are clearly hedging their bet on block rewards alone, and a chunk of the market is now pricing these stocks more like data center landlords than pure miners. Worth watching who still wants the label \"bitcoin miner\" a year from now.",
      "Spot ETF inflows cooled off this week. Still positive, just a lot lighter than the pace we saw through most of the summer. That flow has quietly been one of the biggest sources of demand soaking up the bitcoin that miners sell every month to cover costs, so a quiet week here is worth more attention than the day to day price action suggests. One slow week doesn't mean much on its own. But if inflows stay light while difficulty keeps climbing and margins keep getting squeezed on older fleets, miners could end up supplying more of the sell pressure themselves instead of the ETFs soaking it up. That's the setup I'm watching most closely heading into next week.",
      'Talk next week.',
    ],
  },
  {
    dateLabel: 'Aug 1, 2026',
    subject: 'Difficulty holds near recent highs while equities lean harder into AI hosting',
    paragraphs: [
      "Difficulty is still sitting at 148.9T after last week's +1.99% adjustment, and hashrate is holding around 1,066 EH/s. No adjustment today, so there isn't a fresh number to react to, but the trend from the last four epochs is clear: hashrate keeps adding faster than a lot of people expected going into the back half of the year.",
      "Ocean didn't have a headline week, just steady, methodical block finding, same as always. I'll take boring and consistent over flashy any day with this pool.",
      'MARA and Riot both put out production updates and the story was similar at both: output came in a touch lighter than the prior month as older units get rotated out for newer ones. Short term that shows up as a small dip in coins produced. Longer term it should mean better efficiency and lower breakeven power costs, so I wouldn\'t read too much into one month.',
      "ETF inflows were solid again this week, continuing the pace from most of July. That demand has been doing a lot of the heavy lifting for price this summer, and it's one of the clearer bullish signals out there right now if it keeps up. I'll be watching closely to see if that pace holds into August or starts cooling off like it sometimes does once the summer data slows down.",
      'Talk next week.',
    ],
  },
  {
    dateLabel: 'Jul 25, 2026',
    subject: 'New epoch, same story: hashrate up, ETF demand steady',
    paragraphs: [
      "Fresh difficulty print today, +1.99% to 148.9T, with hashrate near 1,066 EH/s. That's three increases in a row now, and each one has come in above 1.5%, which is a faster pace of growth than the first half of the year.",
      "CleanSpark posted a solid update, leaning on its treasury strategy again to make up ground even with bitcoin's price mostly flat over the past month. Hut 8's American Bitcoin business also put out its first full quarter of numbers, and it's clear that side of the company is becoming a bigger part of the story than the legacy mining fleet.",
      "Ocean's block count keeps ticking up steadily. I don't have much new to say there this week beyond: it's working, and every no-KYC, self-built block is a small vote for miners deciding what goes into their own blocks.",
      'ETF inflows have been steady, not spectacular, but steady is underrated. Slow and consistent demand is easier for the market to absorb than a big single week that gets unwound just as fast.',
      'Talk next week.',
    ],
  },
];

const TICKER_LIST = ['ALL', 'MARA', 'RIOT', 'CLSK', 'CORZ', 'HUT', 'WULF'];
