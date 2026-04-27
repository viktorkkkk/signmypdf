#!/usr/bin/env node
/**
 * One-time setup: uploads all required secrets to the GitHub repo
 * so GitHub Actions can run the daily blog publisher.
 *
 * Requires: npm install tweetnacl tweetnacl-util --no-save
 * Run once: node scripts/setup-github-secrets.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Load local tokens ─────────────────────────────────────────────
const tokensRaw = readFileSync(join(ROOT, '.claude/tokens.local'), 'utf8');
const tokens = Object.fromEntries(
  tokensRaw.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('='))
    .filter(([k, v]) => k && v)
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
);

// ── Load GSC credentials (base64 encode) ─────────────────────────
// Credentials live OUTSIDE the repo at ~/.config/signmypdf/. The legacy
// `scripts/gsc-credentials.json` location is supported as a fallback for
// users who haven't migrated yet.
const CONFIG_PATH = join(homedir(), '.config/signmypdf/gsc-credentials.json');
const LEGACY_PATH = join(ROOT, 'scripts/gsc-credentials.json');
const gscPath = existsSync(CONFIG_PATH) ? CONFIG_PATH : LEGACY_PATH;
const gscRaw = readFileSync(gscPath, 'utf8');
const gscBase64 = Buffer.from(gscRaw).toString('base64');

const OWNER = 'viktorkkkk';
const REPO  = 'signmypdf';
const GH_TOKEN = tokens.GITHUB_TOKEN;

const SECRETS = {
  ANTHROPIC_API_KEY: tokens.ANTHROPIC_API_KEY,
  VERCEL_TOKEN:      tokens.VERCEL_TOKEN,
  VERCEL_ORG_ID:     tokens.VERCEL_ORG_ID,
  VERCEL_PROJECT_ID: tokens.VERCEL_PROJECT_ID,
  GH_PAT:            tokens.GITHUB_TOKEN,
  GSC_CREDENTIALS:   gscBase64,
};

// ── GitHub API helpers ────────────────────────────────────────────
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

async function ghGet(path) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghPut(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`PUT ${path} → ${res.status} ${await res.text()}`);
  }
}

// ── Encryption (libsodium sealed box) ────────────────────────────
async function encryptSecret(publicKeyB64, secretValue) {
  const _sodium = await import('libsodium-wrappers');
  await _sodium.default.ready;
  const sodium = _sodium.default;

  const keyBytes     = Buffer.from(publicKeyB64, 'base64');
  const messageBytes = Buffer.from(secretValue, 'utf8');
  const encrypted    = sodium.crypto_box_seal(messageBytes, keyBytes);
  return Buffer.from(encrypted).toString('base64');
}

// ── Main ──────────────────────────────────────────────────────────
console.log('\n🔐  Setting GitHub Actions secrets...\n');

// Get repo public key
const { key, key_id } = await ghGet('/actions/secrets/public-key');

for (const [name, value] of Object.entries(SECRETS)) {
  if (!value) {
    console.log(`⚠️   Skipping ${name} — no value`);
    continue;
  }

  try {
    const encryptedValue = await encryptSecret(key, value);
    await ghPut(`/actions/secrets/${name}`, {
      encrypted_value: encryptedValue,
      key_id,
    });
    console.log(`✅  ${name}`);
  } catch (err) {
    console.error(`❌  ${name}: ${err.message}`);
  }
}

console.log('\n✨  Done! Secrets are now set in GitHub Actions.\n');
