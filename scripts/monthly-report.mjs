/**
 * Monthly blog report → Telegram.
 *
 * Read-only. Deliberately NOT built on weekly-report.mjs: the weekly answers
 * "what happened", this one answers "where are we heading and what pays off".
 * Different windows, different blocks, different failure modes — sharing code
 * would couple two things that need to change independently.
 *
 * The block that matters is 3: for every watchlist page carrying a
 * lastChangeDate, it compares the 28 days before the edit against the 28 days
 * after. That is the only honest read on whether the optimisation work is
 * earning anything, and it is why lastChangeDate lives in the watchlist.
 *
 * Usage:
 *   node scripts/monthly-report.mjs              — build and send
 *   node scripts/monthly-report.mjs --dry-run    — print, don't send
 *
 * Env: GSC_CREDENTIALS, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createSign } from 'crypto';
import { getIndexStatus } from './lib/index-status.mjs';

const SITE = 'https://www.signmypdf.io';
const PROPERTY = 'sc-domain:signmypdf.io';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const ROW_LIMIT = 25000;
const MAX_LINES = 60;
const DRY_RUN = process.argv.includes('--dry-run');
/** `--month=YYYY-MM` re-reports a past month. Default is the month END falls
 *  in — and because the job runs on the 1st, END (today − 2) lands in the
 *  month just finished, which is the one worth reporting on. */
const MONTH_ARG = (process.argv.find((a) => a.startsWith('--month=')) || '').slice(8);
const HERE = dirname(fileURLToPath(import.meta.url));

const CTR_NORM = { 1: 27, 2: 15, 3: 11, 4: 8, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2.6, 10: 2.3 };
function ctrNorm(pos) {
  const p = Math.round(pos);
  if (p <= 10) return CTR_NORM[Math.max(1, p)];
  if (p <= 15) return 1.5;
  if (p <= 20) return 1;
  return 0.5;
}
const NORM_AT_4 = 8;

// ─── auth ───────────────────────────────────────────────────────────────────
function loadCreds() {
  const env = process.env.GSC_CREDENTIALS;
  if (env) {
    const raw = env.trim().startsWith('{') ? env : Buffer.from(env, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  const p = join(homedir(), '.config/signmypdf/gsc-credentials.json');
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  throw new Error('No GSC credentials');
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
async function gsc(token, body) {
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
let END = new Date(Date.now() - 2 * DAY);
if (MONTH_ARG) {
  const [y, m] = MONTH_ARG.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0));
  END = lastDay > END ? END : lastDay;
}
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const ru = (d) => {
  const dt = new Date(d);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
};

/** Calendar months, newest last. The current month is partial by design —
 *  it is the one being reported on. */
function lastMonths(n) {
  const out = [];
  const anchor = new Date(Date.UTC(END.getUTCFullYear(), END.getUTCMonth(), 1));
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
    const endOfMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    const end = endOfMonth > END ? END : endOfMonth;
    out.push({ label: MONTHS[start.getUTCMonth()], from: iso(start), to: iso(end), start });
  }
  return out;
}

const pct = (v) => `${(v * 100).toFixed(2)}%`;
const pos = (v) => v.toFixed(1);
const shortPath = (u) => u.replace(SITE, '') || '/';
const arrUp = (a, b) => (a > b ? ' ↑' : a < b ? ' ↓' : ' →');
const arrPos = (a, b) => (a < b ? ' ↑' : a > b ? ' ↓' : ' →');

// ─── data ───────────────────────────────────────────────────────────────────
const token = await getToken(loadCreds());
const totals = async (w) => (await gsc(token, { startDate: w.from, endDate: w.to, dimensions: [] }))[0] || {
  clicks: 0, impressions: 0, ctr: 0, position: 0,
};
const pagesOf = async (w) => {
  const rows = await gsc(token, {
    startDate: w.from, endDate: w.to, dimensions: ['page'], rowLimit: ROW_LIMIT,
  });
  return new Map(rows.map((r) => [r.keys[0], {
    url: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
  }]));
};

const months = lastMonths(6);
const monthTotals = await Promise.all(months.map((m) => totals(m)));

const thisMonth = months[months.length - 1];
const prevMonth = months[months.length - 2];
const [pagesThis, pagesPrev] = await Promise.all([pagesOf(thisMonth), pagesOf(prevMonth)]);

const indexStatus = await getIndexStatus(token);

const wl = JSON.parse(readFileSync(join(HERE, 'gsc-watchlist.json'), 'utf8'));
const entries = wl.pages.map((p) => (typeof p === 'string' ? { path: p } : p));

// Block 3 needs a before/after window per changed page, so query per entry.
const changed = entries.filter((e) => e.lastChangeDate);
const beforeAfter = await Promise.all(
  changed.map(async (e) => {
    const change = new Date(e.lastChangeDate);
    const before = { from: iso(change.getTime() - 28 * DAY), to: iso(change.getTime() - DAY) };
    const daysSince = Math.floor((END - change) / DAY);
    const url = SITE + e.path;
    const b = await pagesOf(before);
    // A change made after the reporting cut-off has no "after" window yet;
    // GSC rejects an inverted range outright, so don't ask for one.
    const a = daysSince >= 0 ? await pagesOf({ from: e.lastChangeDate, to: iso(END) }) : new Map();
    return { ...e, daysSince, before: b.get(url), after: a.get(url) };
  }),
);

// ─── build ──────────────────────────────────────────────────────────────────
// Blocks are built separately, then assembled under a 60-line budget. The
// plan and the trend are always kept; the three list blocks are elastic, so
// a busy month thins the lists instead of silently losing the plan off the
// bottom.
const head = [
  `📆 SignMyPDF — ${MONTHS_FULL[END.getUTCMonth()]} ${END.getUTCFullYear()}`,
  `Данные по ${ru(iso(END))}`,
  '',
];

// 1 — six-month trend
const trend = ['ДИНАМИКА ЗА 6 МЕСЯЦЕВ', 'мес   клики  показы   CTR    поз'];
months.forEach((m, i) => {
  const t = monthTotals[i];
  if (!t.impressions && !t.clicks) return;
  trend.push(
    `${m.label.padEnd(5)}${String(t.clicks).padStart(6)}${String(t.impressions).padStart(8)}` +
      `${pct(t.ctr).padStart(8)}${pos(t.position).padStart(7)}`,
  );
});
trend.push('');

// 2 — this month vs last
const tThis = monthTotals[monthTotals.length - 1];
const tPrev = monthTotals[monthTotals.length - 2];
const top20This = [...pagesThis.values()].filter((p) => p.position <= 20).length;
const top20Prev = [...pagesPrev.values()].filter((p) => p.position <= 20).length;
const summary = [
  `ИТОГ МЕСЯЦА vs ${MONTHS_FULL[new Date(prevMonth.from).getUTCMonth()].toLowerCase()}`,
  `Клики ${tPrev.clicks} → ${tThis.clicks}${arrUp(tThis.clicks, tPrev.clicks)}`,
  `Показы ${tPrev.impressions} → ${tThis.impressions}${arrUp(tThis.impressions, tPrev.impressions)}`,
  `CTR ${pct(tPrev.ctr)} → ${pct(tThis.ctr)}${arrUp(tThis.ctr, tPrev.ctr)}`,
  `Позиция ${pos(tPrev.position)} → ${pos(tThis.position)}${arrPos(tThis.position, tPrev.position)}`,
  `Страниц в топ-20: ${top20Prev} → ${top20This}${arrUp(top20This, top20Prev)}`,
];
if (indexStatus) summary.push(`Индекс: ${indexStatus.indexed} из ${indexStatus.total} страниц в Google`);
summary.push('');

// 3 — did the work pay off (the block this report exists for)
const TYPE_RU = { title: 'заголовок', content: 'содержимое', images: 'картинки' };
const resultGroups = beforeAfter.map((e) => {
  const g = [];
  const label = shortPath(SITE + e.path).replace('/blog/', '');
  const b = e.before;
  const a = e.after;
  g.push(`${label} · ${TYPE_RU[e.changeType] || e.changeType || '—'} · ${ru(e.lastChangeDate)}`);
  if (!b && !a) {
    g.push('  нет данных ни до, ни после');
  } else {
    g.push(
      `  до: поз ${b ? pos(b.position) : '—'}, CTR ${b ? pct(b.ctr) : '—'}` +
        ` → после: поз ${a ? pos(a.position) : '—'}, CTR ${a ? pct(a.ctr) : '—'}`,
    );
    if (e.daysSince < 28) {
      g.push(`  ⏳ рано судить — прошло ${Math.max(0, e.daysSince)} дн. из 28`);
    } else if (b && a) {
      const better = a.position < b.position - 0.5 || a.ctr > b.ctr * 1.15;
      const worse = a.position > b.position + 0.5 && a.ctr <= b.ctr;
      g.push(better ? '  ✅ сработало' : worse ? '  ❌ не сработало' : '  ➖ без изменений');
    } else {
      g.push('  ➖ недостаточно данных');
    }
  }
  return g;
});

// 4 — top 10 by impressions
const top10 = [...pagesThis.values()].sort((a, b) => b.impressions - a.impressions).slice(0, 10);
const topLines = top10.map((p) => {
  const was = pagesPrev.get(p.url);
  const delta = was
    ? `${was.impressions}→${p.impressions}${arrUp(p.impressions, was.impressions)}`
    : `${p.impressions} 🆕`;
  return `${shortPath(p.url).replace('/blog/', '')} · ${delta} · поз ${pos(p.position)}`;
});

// 5 — new in the top 20
const newcomerLines = [...pagesThis.values()]
  .filter((p) => p.position <= 20 && (!pagesPrev.get(p.url) || pagesPrev.get(p.url).position > 20))
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 5)
  .map((p) => `🟢 ${shortPath(p.url).replace('/blog/', '')} · ${p.impressions} показов · поз ${pos(p.position)}`);

// 6 — plan, priced in clicks
/**
 * Extra clicks a fix could earn per month.
 *
 * The norm depends on which fix it is. A better title does not move the page
 * up the page — it lifts CTR at the position the page already holds, so the
 * norm for THAT position is the ceiling. A rewrite is what moves the page, so
 * position 4 is the fair target there. Using the position-4 norm for title
 * work overstated it by 3-4x.
 */
const potentialAt = (p, normPercent) => Math.floor(p.impressions * (normPercent / 100) - p.clicks);
const plan = [];
for (const p of pagesThis.values()) {
  const path = shortPath(p.url);
  const ctrPercent = p.ctr * 100;
  const norm = ctrNorm(p.position);
  const gainTitle = potentialAt(p, norm); // same position, better CTR
  const gainRewrite = potentialAt(p, NORM_AT_4); // page actually climbs
  const tail = (g) => (g > 0 ? ` → потенциал +${g} кликов/мес` : '');
  if (p.position <= 15 && p.impressions >= 80 && ctrPercent < norm * 0.6) {
    plan.push({
      path,
      imp: p.impressions,
      text: `✏️ Заголовок: ${path} — поз ${pos(p.position)}, CTR ${ctrPercent.toFixed(2)}% против ${norm}%${tail(gainTitle)}`,
    });
  }
  if (p.position >= 8 && p.position <= 20 && p.impressions >= 200) {
    plan.push({
      path,
      imp: p.impressions,
      text: `📝 Переписать: ${path} — поз ${pos(p.position)}, ${p.impressions} показов${tail(gainRewrite)}`,
    });
  }
  if (p.position > 50 && p.impressions >= 200) {
    plan.push({
      path,
      imp: p.impressions,
      text: `🗑 Кандидат в noindex: ${path} — поз ${pos(p.position)}, ${p.impressions} показов`,
    });
  }
}
const planLines = ['ПЛАН НА МЕСЯЦ'];
// One line per URL — a page can trip two rules at once and listing it twice
// just burns a slot that another page could use.
const seenPath = new Set();
const picked = plan
  .sort((a, b) => b.imp - a.imp)
  .filter((x) => {
    if (seenPath.has(x.path)) return false;
    seenPath.add(x.path);
    return true;
  })
  .slice(0, 5)
  .map((x) => x.text);
planLines.push(...(picked.length ? picked : ['  срочного нет']));

const alarms = [];
if (indexStatus && indexStatus.previousIndexed !== null && indexStatus.indexed < indexStatus.previousIndexed) {
  alarms.push('');
  alarms.push('ТРЕВОГА');
  alarms.push(`⚠️ Индекс: ${indexStatus.previousIndexed} → ${indexStatus.indexed} страниц в Google`);
}

const footer = [];
if (wl.lastChangeDate) {
  const stable = new Date(new Date(wl.lastChangeDate).getTime() + 28 * DAY);
  footer.push('');
  footer.push(
    `Заголовки обновлены ${ru(wl.lastChangeDate)} · данные за 28 дней стабилизируются к ${ru(stable)}`,
  );
}

// Assemble: fixed blocks first, then spend what is left on the three lists.
const fixed = head.length + trend.length + summary.length + planLines.length + alarms.length + footer.length;
// Reserve slots up front. Block 3 is the point of this report, but a top-10
// rendered as a top-1 is worse than useless, so the lists get a floor.
const RESERVE_TOP = Math.min(10, topLines.length);
const RESERVE_NEW = Math.min(5, newcomerLines.length);
// -3 section headers, -3 trailing blanks after the elastic blocks
let budget = MAX_LINES - fixed - 6 - RESERVE_TOP - RESERVE_NEW;

const L = [...head, ...trend, ...summary];

L.push('РЕЗУЛЬТАТ ДОРАБОТОК');
if (!resultGroups.length) {
  L.push('  изменений не отмечено');
  budget -= 1;
} else {
  // Whole entries only — half an entry is worse than none.
  let usedGroups = 0;
  for (const g of resultGroups) {
    if (budget - g.length < 0) break;
    L.push(...g);
    budget -= g.length;
    usedGroups++;
  }
  if (usedGroups < resultGroups.length) {
    L.push(`  … ещё ${resultGroups.length - usedGroups} страниц, полный список в отчёте за следующий месяц`);
    budget -= 1;
  }
}
L.push('');
budget += RESERVE_TOP + RESERVE_NEW; // release the reservations

const topShown = topLines.slice(0, Math.max(0, Math.min(RESERVE_TOP + budget - RESERVE_NEW, budget)));
L.push('ТОП-10 ПО ПОКАЗАМ');
L.push(...topShown);
L.push('');
budget -= topShown.length + 1;

if (newcomerLines.length && budget > 1) {
  L.push('НОВЫЕ ВОЗМОЖНОСТИ');
  L.push(...newcomerLines.slice(0, Math.min(RESERVE_NEW, budget - 1)));
  L.push('');
}

L.push(...planLines);
L.push(...alarms);
L.push(...footer);

const message = L.join('\n');

// ─── output ─────────────────────────────────────────────────────────────────
const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
if (DRY_RUN || !BOT || !CHAT) {
  console.log(message);
  console.log(`\n--- ${message.split('\n').length} строк (лимит ${MAX_LINES})`);
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
