/**
 * Weekly blog report → Telegram.
 *
 * Read-only. Pulls Search Console, builds a phone-readable summary and
 * sends it with the Telegram Bot API. Nothing on the site is touched.
 *
 * Usage:
 *   node scripts/weekly-report.mjs              — build and send
 *   node scripts/weekly-report.mjs --dry-run    — print, don't send
 *
 * Env:
 *   GSC_CREDENTIALS      raw or base64 service-account JSON (falls back to
 *                        ~/.config/signmypdf/gsc-credentials.json)
 *   TELEGRAM_BOT_TOKEN   from @BotFather
 *   TELEGRAM_CHAT_ID     target chat
 *
 * With no Telegram env the script prints the message and exits 0, so a
 * manual run works before the bot exists.
 *
 * Why the windows are asymmetric: the site earns single-digit clicks a
 * week, so week-over-week click deltas are noise. Clicks and CTR are read
 * over 28 days; only impressions and position are compared week to week.
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createSign } from 'crypto';

const SITE = 'https://www.signmypdf.io';
const PROPERTY = 'sc-domain:signmypdf.io';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const ROW_LIMIT = 25000;
const DRY_RUN = process.argv.includes('--dry-run');

const HERE = dirname(fileURLToPath(import.meta.url));

/** Expected CTR by SERP position. Anything far below is a snippet problem. */
const CTR_NORM = { 1: 27, 2: 15, 3: 11, 4: 8, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2.6, 10: 2.3 };
function ctrNorm(pos) {
  const p = Math.round(pos);
  if (p <= 10) return CTR_NORM[Math.max(1, p)];
  if (p <= 15) return 1.5;
  if (p <= 20) return 1;
  return 0.5;
}

// ─── auth ───────────────────────────────────────────────────────────────────
function loadCreds() {
  const env = process.env.GSC_CREDENTIALS;
  if (env) {
    const raw = env.trim().startsWith('{') ? env : Buffer.from(env, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  const p = join(homedir(), '.config/signmypdf/gsc-credentials.json');
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  throw new Error('No GSC credentials (env GSC_CREDENTIALS or ~/.config/signmypdf/gsc-credentials.json)');
}

const b64u = (b) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function makeJWT(c) {
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64u(
    JSON.stringify({
      iss: c.client_email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const s = createSign('RSA-SHA256');
  s.update(data);
  return `${data}.${s.sign(c.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

async function getToken(c) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: makeJWT(c),
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Auth failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function query(token, body) {
  const r = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const j = await r.json();
  if (j.error) throw new Error(`GSC API: ${JSON.stringify(j.error)}`);
  return j.rows || [];
}

// ─── dates ──────────────────────────────────────────────────────────────────
const DAY = 86400000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
// GSC data lags 2-3 days; close the window on the day before yesterday so the
// last bucket is complete.
const END = new Date(Date.now() - 2 * DAY);

const W28 = { from: iso(END - 27 * DAY), to: iso(END) };
const W28PREV = { from: iso(END - 55 * DAY), to: iso(END - 28 * DAY) };
const W7 = { from: iso(END - 6 * DAY), to: iso(END) };
const W7PREV = { from: iso(END - 13 * DAY), to: iso(END - 7 * DAY) };

// ─── formatting ─────────────────────────────────────────────────────────────
const ru = (d) => {
  const M = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const dt = new Date(d);
  return `${dt.getUTCDate()} ${M[dt.getUTCMonth()]}`;
};
const pct = (v) => `${(v * 100).toFixed(2)}%`;
const pos = (v) => v.toFixed(1);
const shortPath = (url) => url.replace(SITE, '') || '/';

/** Arrow for a metric where bigger is better. */
const arrUp = (now, was) => (now > was ? ' ↑' : now < was ? ' ↓' : ' →');
/** Arrow for SERP position, where smaller is better. */
const arrPos = (now, was) => (now < was ? ' ↑' : now > was ? ' ↓' : ' →');

// ─── data ───────────────────────────────────────────────────────────────────
const creds = loadCreds();
const token = await getToken(creds);

const totals = async (w) => {
  const rows = await query(token, { startDate: w.from, endDate: w.to, dimensions: [] });
  return rows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
};

const pages = async (w) => {
  const rows = await query(token, {
    startDate: w.from,
    endDate: w.to,
    dimensions: ['page'],
    rowLimit: ROW_LIMIT,
  });
  const map = new Map();
  for (const r of rows) {
    map.set(r.keys[0], {
      url: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    });
  }
  return map;
};

const [t28, t28p, p28, p28p, p7, p7p] = await Promise.all([
  totals(W28),
  totals(W28PREV),
  pages(W28),
  pages(W28PREV),
  pages(W7),
  pages(W7PREV),
]);

const watchlist = JSON.parse(readFileSync(join(HERE, 'gsc-watchlist.json'), 'utf8')).pages;

/** Count article images on a page. Chrome (logo, extension banner) is served
 *  from /_next/static/media, article art from /images/blog — so the path is a
 *  reliable discriminator and needs no DOM parsing. */
const imageCache = new Map();
async function countImages(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  let n = 0;
  try {
    const html = await fetch(url).then((r) => r.text());
    n = (html.match(/<img[^>]+src="\/images\/blog\//g) || []).length;
  } catch {
    n = -1; // unreachable — don't recommend on a guess
  }
  imageCache.set(url, n);
  return n;
}

// ─── blocks ─────────────────────────────────────────────────────────────────
const L = [];
L.push(`📊 SignMyPDF — отчёт за ${ru(W28.from)} – ${ru(W28.to)}`);
L.push('');

// 1 — site totals
L.push('ИТОГО ПО САЙТУ (28 дней vs предыдущие 28)');
L.push(`Клики ${t28p.clicks} → ${t28.clicks}${arrUp(t28.clicks, t28p.clicks)}`);
L.push(`Показы ${t28p.impressions} → ${t28.impressions}${arrUp(t28.impressions, t28p.impressions)}`);
L.push(`CTR ${pct(t28p.ctr)} → ${pct(t28.ctr)}${arrUp(t28.ctr, t28p.ctr)}`);
L.push(`Позиция ${pos(t28p.position)} → ${pos(t28.position)}${arrPos(t28.position, t28p.position)}`);
L.push('');

// 2 — watchlist
L.push('ОТСЛЕЖИВАЕМЫЕ (28 дней)');
let shown = 0;
for (const path of watchlist) {
  const url = SITE + path;
  const now = p28.get(url);
  if (!now) continue;
  const was = p28p.get(url) || { clicks: 0, impressions: 0, ctr: 0, position: now.position };
  // One line per page — two lines each blew past the 35-line budget.
  L.push(
    `${shortPath(url).replace('/blog/', '')} · поз ${pos(was.position)}→${pos(now.position)}${arrPos(now.position, was.position)}` +
      ` · CTR ${pct(was.ctr)}→${pct(now.ctr)}${arrUp(now.ctr, was.ctr)}` +
      ` · клики ${was.clicks}→${now.clicks}${arrUp(now.clicks, was.clicks)}`,
  );
  shown++;
}
if (!shown) L.push('  нет данных за период');
L.push('');

// 3 — movement across every page, week over week
const TOP = 20;
const enteredTop = [];
const leftTop = [];
const grew = [];
const fell = [];
for (const [url, now] of p7) {
  const was = p7p.get(url);
  if (now.position <= TOP && (!was || was.position > TOP)) enteredTop.push(now);
  if (was && was.impressions >= 20) {
    const delta = (now.impressions - was.impressions) / was.impressions;
    if (delta > 0.3) grew.push({ ...now, delta });
    if (delta < -0.3) fell.push({ ...now, delta, wasImp: was.impressions });
  }
}
for (const [url, was] of p7p) {
  const now = p7.get(url);
  if (was.position <= TOP && (!now || now.position > TOP)) leftTop.push(was);
}
const top5 = (a) => a.sort((x, y) => y.impressions - x.impressions).slice(0, 5);

// Up to 5 per category, but the block as a whole is trimmed later to keep
// the message inside 35 lines. Rows are interleaved round-robin so a tight
// budget thins every category evenly instead of wiping out the last one.
const categories = [
  top5(enteredTop).map((p) => `🟢 в топ-20: ${shortPath(p.url)} — поз ${pos(p.position)}`),
  top5(leftTop).map((p) => `🔴 из топ-20: ${shortPath(p.url)} — было ${pos(p.position)}`),
  top5(fell).map(
    (p) => `↓ показы ${Math.round(p.delta * 100)}%: ${shortPath(p.url)} — ${p.wasImp}→${p.impressions}`,
  ),
  top5(grew).map((p) => `↑ показы +${Math.round(p.delta * 100)}%: ${shortPath(p.url)} — ${p.impressions}`),
];
const movementLines = [];
for (let i = 0; i < 5; i++) {
  for (const cat of categories) if (cat[i]) movementLines.push(cat[i]);
}

// 4 — recommendations
const candidates = [];
for (const [url, p] of p28) {
  const path = shortPath(url);
  const ctrPercent = p.ctr * 100;
  const norm = ctrNorm(p.position);

  if (p.position <= 15 && p.impressions >= 80 && ctrPercent < norm * 0.6) {
    candidates.push({
      imp: p.impressions,
      text: `✏️ Заголовок: ${path} — поз ${pos(p.position)}, CTR ${ctrPercent.toFixed(2)}% против нормы ${norm}%`,
    });
  }
  if (p.position >= 8 && p.position <= 20 && p.impressions >= 200) {
    candidates.push({
      imp: p.impressions,
      text: `📝 Переписать: ${path} — поз ${pos(p.position)}, ${p.impressions} показов, потенциал ×${(8 / norm).toFixed(1)}`,
    });
  }
  if (p.position > 50 && p.impressions >= 200) {
    candidates.push({
      imp: p.impressions,
      text: `🗑 Кандидат в noindex: ${path} — поз ${pos(p.position)}, ${p.impressions} показов`,
    });
  }
  if (watchlist.includes(path) || p.impressions >= 300) {
    const n = await countImages(url);
    if (n >= 0 && n < 2) {
      candidates.push({ imp: p.impressions, text: `🖼 Добавить скриншоты: ${path} — сейчас ${n} картинок` });
    }
  }
}
const recLines = [];
recLines.push('ЧТО ДЕЛАТЬ');
const recs = candidates.sort((a, b) => b.imp - a.imp).slice(0, 3);
if (!recs.length) recLines.push('  срочного нет');
else recLines.push(...recs.map((r) => r.text));

// 5 — alerts, only when there is something
const alerts = [];
for (const path of watchlist) {
  const url = SITE + path;
  const now = p28.get(url);
  const was = p28p.get(url);
  if (now && was && now.position - was.position > 5) {
    alerts.push(`⚠️ ${shortPath(url)}: позиция ${pos(was.position)} → ${pos(now.position)}`);
  }
}
if (t28p.impressions > 0 && (t28.impressions - t28p.impressions) / t28p.impressions < -0.2) {
  const drop = Math.round(((t28.impressions - t28p.impressions) / t28p.impressions) * 100);
  alerts.push(`⚠️ Показы по сайту ${drop}%`);
}
const alertLines = alerts.length ? ['', 'ТРЕВОГА', ...alerts] : [];

// Assemble with a hard 35-line budget. Movement is the only elastic block,
// so it absorbs whatever room is left; its rows are already ordered by
// priority, so the trim drops the least actionable ones.
const MAX_LINES = 35;
const fixed = L.length + 1 + recLines.length + alertLines.length; // +1 for the blank after movement
const budget = Math.max(0, MAX_LINES - fixed - 1); // -1 for the movement header
const shownMovement = movementLines.slice(0, budget);

L.push('ДВИЖЕНИЕ (неделя к неделе)');
if (!shownMovement.length) L.push('  без заметных изменений');
else L.push(...shownMovement);
L.push('');
L.push(...recLines);
L.push(...alertLines);

const message = L.join('\n');

// ─── output ─────────────────────────────────────────────────────────────────
const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;

if (DRY_RUN || !BOT || !CHAT) {
  console.log(message);
  console.log(`\n--- ${message.split('\n').length} строк`);
  if (!DRY_RUN && (!BOT || !CHAT)) {
    console.log('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — printed instead of sent.');
  }
  process.exit(0);
}

const r = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: CHAT, text: message, disable_web_page_preview: true }),
});
const j = await r.json();
if (!j.ok) {
  console.error(`Telegram error: ${JSON.stringify(j)}`);
  process.exit(1);
}
console.log(`Sent to Telegram (${message.split('\n').length} lines).`);
