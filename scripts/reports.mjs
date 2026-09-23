#!/usr/bin/env node
/**
 * The reports queue.
 *
 * The app tells people a report is read and acted on within 24 hours, so this
 * exists to make that true. It reads with the service role, which bypasses RLS
 * — nobody using the app can see this queue, including the person who filed a
 * report about them.
 *
 *   npm run reports                      list what is open
 *   npm run reports -- --all             include what is already handled
 *   npm run reports -- reviewed <id>     looked at it, nothing to do
 *   npm run reports -- actioned <id>     looked at it and acted
 *
 * The service role key never goes near the app. It lives in .env (gitignored),
 * separate from the EXPO_PUBLIC_ values that are compiled into the bundle.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function readEnv() {
  const env = {};
  for (const file of ['.env', '.env.local']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      env[key.trim()] = rest.join('=').trim();
    }
  }
  return { ...env, ...process.env };
}

const env = readEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error('No EXPO_PUBLIC_SUPABASE_URL. Run this from the project root.');
  process.exit(1);
}
if (!key) {
  console.error(
    [
      'No SUPABASE_SERVICE_ROLE_KEY.',
      '',
      'Reports are deliberately unreadable by the app, so this needs the secret',
      'key. Take it from Project Settings -> API Keys (sb_secret_… , or the',
      'legacy service_role key) and put it in .env, which is gitignored:',
      '',
      '  echo "SUPABASE_SERVICE_ROLE_KEY=your-secret-key" >> .env',
      '',
      'Never put it in .env.local next to the EXPO_PUBLIC_ values — those are',
      'compiled into the app that ships to phones.',
    ].join('\n'),
  );
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function api(path, init) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

function ago(iso) {
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

async function list({ all }) {
  const filter = all ? '' : '&status=eq.open';
  const reports = await api(
    `reports?select=id,kind,ref_id,reason,status,created_at,reporter_id,reported_id${filter}&order=created_at.desc`,
  );

  if (reports.length === 0) {
    console.log(all ? 'No reports at all.' : 'Nothing open. Queue is clear.');
    return;
  }

  // Names and the reported message, so a report can be judged without a second look.
  const ids = [...new Set(reports.flatMap((r) => [r.reporter_id, r.reported_id]).filter(Boolean))];
  const profiles = ids.length
    ? await api(`profiles?select=id,display_name&id=in.(${ids.join(',')})`)
    : [];
  const names = new Map(profiles.map((p) => [p.id, p.display_name]));

  const nudgeIds = [...new Set(reports.filter((r) => r.kind === 'nudge' && r.ref_id).map((r) => r.ref_id))];
  const nudges = nudgeIds.length
    ? await api(`nudges?select=id,message&id=in.(${nudgeIds.join(',')})`)
    : [];
  const messages = new Map(nudges.map((n) => [n.id, n.message]));

  const open = reports.filter((r) => r.status === 'open');
  const stale = open.filter((r) => Date.now() - new Date(r.created_at).getTime() > 86400000);

  console.log(`${open.length} open${stale.length ? `, ${stale.length} past 24 hours` : ''}\n`);

  for (const report of reports) {
    const late = report.status === 'open' && Date.now() - new Date(report.created_at).getTime() > 86400000;
    console.log(`${late ? '! ' : '  '}${report.id}  ${report.status.toUpperCase()}  ${ago(report.created_at)}`);
    console.log(`  ${report.kind} · ${names.get(report.reporter_id) ?? 'someone'} reported ${names.get(report.reported_id) ?? 'someone'}`);
    if (messages.has(report.ref_id)) console.log(`  message: "${messages.get(report.ref_id)}"`);
    console.log(`  reason:  ${report.reason}\n`);
  }

  if (stale.length > 0) {
    console.log(`${stale.length} marked ! are past the 24 hours the app promises.`);
  }
}

async function setStatus(status, id) {
  await api(`reports?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  console.log(`${id} -> ${status}`);
}

const [command, argument] = process.argv.slice(2).filter((arg) => arg !== '--all');
const all = process.argv.includes('--all');

try {
  if (command === 'reviewed' || command === 'actioned') {
    if (!argument) throw new Error(`Which report? npm run reports -- ${command} <id>`);
    await setStatus(command, argument);
  } else {
    await list({ all });
  }
} catch (error) {
  console.error(String(error.message ?? error));
  process.exit(1);
}
