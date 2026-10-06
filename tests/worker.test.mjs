// Unit tests for the lead Worker. Run with: node --test tests/*.test.mjs
// They call the real fetch handler with a recording fake D1, so every case proves whether a
// write happened. No network, no Cloudflare account and no dependencies are needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const LEAD = {
  interests: ['pilot'], current_situation: 'has_hardware', organization_type: 'fleet_transport',
  industry: 'freight_logistics', infrastructure: ['cameras'], name: 'Test Person', company: 'Test Co',
  email: 'test.person@example.com', country: 'AR', privacy_ack: true, language: 'en', page_source: '/',
};

function fakeEnv(vars = {}) {
  const writes = [];
  const DB = {
    prepare: () => ({ bind: (...args) => ({ run: async () => { writes.push(args); return { success: true }; } }) }),
  };
  const ASSETS = { fetch: async () => new Response('asset', { status: 200 }) };
  return { env: { DB, ASSETS, ...vars }, writes };
}

async function post(host, vars, body = LEAD) {
  const { env, writes } = fakeEnv(vars);
  const origin = `https://${host}`;
  const request = new Request(`${origin}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
  const logs = [];
  const original = { error: console.error, warn: console.warn, log: console.log };
  console.error = console.warn = console.log = (...a) => logs.push(a.join(' '));
  try {
    const response = await worker.fetch(request, env);
    return { status: response.status, text: await response.text(), writes, logs };
  } finally {
    Object.assign(console, original);
  }
}

const PRODUCTION = { LEAD_DB_ENV: 'production' };
const PREVIEW = { LEAD_DB_ENV: 'preview' };

for (const host of ['guaraplatform.com', 'www.guaraplatform.com', 'localhost', '127.0.0.1']) {
  test(`production env writes on allowed host ${host}`, async () => {
    const r = await post(host, PRODUCTION);
    assert.equal(r.status, 200);
    assert.deepEqual(JSON.parse(r.text), { ok: true });
    assert.equal(r.writes.length, 1);
  });
}

for (const host of [
  'feature-phase-b-lead-mvp-guara-website.diegomartinpedraza.workers.dev',
  'guara-website.diegomartinpedraza.workers.dev',
  'evil.example',
  'guaraplatform.com.evil.example',
]) {
  test(`production env refuses write on ${host}`, async () => {
    const r = await post(host, PRODUCTION);
    assert.equal(r.status, 503);
    assert.deepEqual(JSON.parse(r.text), { ok: false, error: 'unavailable' });
    assert.equal(r.writes.length, 0);
  });
}

test('missing LEAD_DB_ENV is treated as production (fail closed)', async () => {
  const r = await post('some-branch-guara-website.diegomartinpedraza.workers.dev', {});
  assert.equal(r.status, 503);
  assert.equal(r.writes.length, 0);
});

test('preview env still writes normally on a workers.dev preview host', async () => {
  const r = await post('feature-phase-b-lead-mvp-guara-website.diegomartinpedraza.workers.dev', PREVIEW);
  assert.equal(r.status, 200);
  assert.equal(r.writes.length, 1);
});

test('refusal reveals no configuration and logs no submitted data', async () => {
  const r = await post('evil.example', PRODUCTION);
  for (const secret of ['LEAD_DB_ENV', 'production', 'preview', 'guara-leads']) {
    assert.ok(!r.text.includes(secret), `response leaks "${secret}"`);
  }
  const logged = r.logs.join('\n');
  for (const value of [LEAD.name, LEAD.company, LEAD.email, 'evil.example']) {
    assert.ok(!logged.includes(value), `log leaks "${value}"`);
  }
});

test('stored row never takes status, internal_notes, id or created_at from the client', async () => {
  for (const field of ['status', 'internal_notes', 'id', 'created_at']) {
    const r = await post('guaraplatform.com', PRODUCTION, { ...LEAD, [field]: 'x' });
    assert.equal(r.status, 400);
    assert.equal(JSON.parse(r.text).fields[field], 'unexpected_field');
    assert.equal(r.writes.length, 0);
  }
});

test('honeypot returns generic success and stores nothing', async () => {
  const r = await post('guaraplatform.com', PRODUCTION, { ...LEAD, website: 'http://spam.example' });
  assert.equal(r.status, 200);
  assert.equal(r.writes.length, 0);
});

test('an instantly submitted lead is stored (speed never discards)', async () => {
  const r = await post('guaraplatform.com', PRODUCTION);
  assert.equal(r.status, 200);
  assert.equal(r.writes.length, 1);
});
