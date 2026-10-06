// GUARA Platform Worker (Phase B).
// Static pages, CSS, JS and assets are served by Workers Static Assets; wrangler.jsonc routes
// only /api/* here first. Any other request that reaches this Worker (no matching asset) is
// handed back to the asset service so 404 behaviour is unchanged.
//
// Privacy: no submitted values, e-mail addresses or IP addresses are ever logged or persisted
// outside the leads row. The client IP is read only for the optional rate limiter.
import { validateLead } from './lead.js';

const MAX_BODY_BYTES = 16 * 1024;

// Hosts on which a production-configured Worker may write leads. Preview deployments carry
// LEAD_DB_ENV = "preview" and their own database (see wrangler.jsonc), so they are exempt.
// Anything else is treated as production (fail closed): a branch or *.workers.dev upload that
// somehow received production bindings can never write into the production database.
const PRODUCTION_WRITE_HOSTS = new Set(['guaraplatform.com', 'www.guaraplatform.com', 'localhost', '127.0.0.1']);

export function leadWriteAllowed(env, hostname) {
  if (env.LEAD_DB_ENV === 'preview') return true;
  return PRODUCTION_WRITE_HOSTS.has(hostname);
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Robots-Tag': 'noindex, nofollow',
};

const THANKS = { en: '/thanks/', es: '/es/gracias/' };
const FORM_PAGE = { en: '/#contacto', es: '/es/#contacto' };

const ERROR_PAGE = {
  en: {
    title: 'We could not send your request',
    body: 'Some required information is missing or invalid. Please go back to the form, review the highlighted fields and try again.',
    busy: 'We could not process your request right now. Please try again in a few minutes.',
    back: 'Back to the form',
    mail: 'You can also write to',
  },
  es: {
    title: 'No pudimos enviar tu solicitud',
    body: 'Falta información obligatoria o hay datos no válidos. Volvé al formulario, revisá los campos y probá de nuevo.',
    busy: 'No pudimos procesar tu solicitud en este momento. Probá de nuevo en unos minutos.',
    back: 'Volver al formulario',
    mail: 'También podés escribirnos a',
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/lead') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'POST' });
      }
      return handleLead(request, env, url);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ ok: false, error: 'not_found' }, 404);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleLead(request, env, url) {
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  const isJson = contentType.startsWith('application/json');
  const isForm = contentType.startsWith('application/x-www-form-urlencoded');
  // Browsers with JavaScript ask for JSON; the native (no-JS) form POST gets HTML/redirects.
  const wantsJson = isJson || (request.headers.get('Accept') || '').includes('application/json');

  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) {
    return fail(wantsJson, 'en', 403, 'forbidden');
  }
  if (!isJson && !isForm) {
    return fail(wantsJson, 'en', 415, 'unsupported_media_type');
  }
  if (!leadWriteAllowed(env, url.hostname)) {
    // Same generic answer as an unavailable database: never reveal environment or configuration.
    console.error('lead write refused: host not allowed for this environment');
    return fail(wantsJson, 'en', 503, 'unavailable');
  }

  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES) return fail(wantsJson, 'en', 413, 'payload_too_large');
  const text = await readLimited(request, MAX_BODY_BYTES);
  if (text === null) return fail(wantsJson, 'en', 413, 'payload_too_large');

  let raw;
  try {
    raw = isJson ? parseJson(text) : parseForm(text);
  } catch {
    return fail(wantsJson, 'en', 400, 'malformed_body');
  }
  const lang = raw.language === 'es' ? 'es' : 'en';

  if (env.LEAD_RATE_LIMITER) {
    // Optional Cloudflare rate-limiting binding (not configured yet). The IP is used only as a key here.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { success } = await env.LEAD_RATE_LIMITER.limit({ key: ip });
    if (!success) return fail(wantsJson, lang, 429, 'rate_limited');
  }

  const result = validateLead(raw);
  if (!result.ok) {
    return wantsJson
      ? json({ ok: false, error: 'validation', fields: result.errors }, 400)
      : errorPage(lang, 400);
  }

  if (result.spam) {
    // Look identical to a real success so automated senders learn nothing; nothing is stored.
    console.warn(`lead discarded: ${result.spam}`);
    return succeed(wantsJson, lang);
  }

  if (!env.DB) {
    console.error('lead storage unavailable: DB binding missing');
    return fail(wantsJson, lang, 503, 'unavailable');
  }

  const lead = result.lead;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO leads (
        id, created_at, language, page_source, intent_source,
        interests, current_situation, organization_type, industry, infrastructure,
        infrastructure_detail, operation_scale, goal,
        name, company, email, country, message,
        utm_source, utm_medium, utm_campaign, utm_content,
        privacy_acknowledged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, now, lead.language, lead.page_source, lead.intent_source,
      JSON.stringify(lead.interests), lead.current_situation, lead.organization_type, lead.industry,
      JSON.stringify(lead.infrastructure),
      lead.infrastructure_detail, lead.operation_scale, lead.goal,
      lead.name, lead.company, lead.email, lead.country, lead.message,
      lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content,
      now
    ).run();
  } catch (err) {
    console.error(`lead insert failed: ${err && err.name ? err.name : 'error'}`);
    return fail(wantsJson, lang, 500, 'storage_error');
  }

  // Future hook: notify GUARA (e.g. Cloudflare Email Workers `send_email` binding or a queue).
  // It must run after the insert so D1 stays the system of record, and must never block the reply.

  return succeed(wantsJson, lang);
}

async function readLimited(request, limit) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function parseJson(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object');
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') out[key] = String(value);
    else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) out[key] = value;
    else throw new Error('unsupported value');
  }
  return out;
}

function parseForm(text) {
  const params = new URLSearchParams(text);
  const out = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    out[key] = values.length > 1 || key === 'interests' || key === 'infrastructure' ? values : values[0];
  }
  return out;
}

function succeed(wantsJson, lang) {
  if (wantsJson) return json({ ok: true }, 200);
  return new Response(null, { status: 303, headers: { ...SECURITY_HEADERS, Location: THANKS[lang] } });
}

function fail(wantsJson, lang, status, code) {
  return wantsJson ? json({ ok: false, error: code }, status) : errorPage(lang, status);
}

function json(body, status, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

// Static error page for the no-JavaScript fallback. It never echoes submitted values.
function errorPage(lang, status) {
  const t = ERROR_PAGE[lang] || ERROR_PAGE.en;
  const message = status === 400 ? t.body : t.busy;
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${t.title} | GUARA Platform</title><link rel="stylesheet" href="/seo-pages.css"></head><body><header class="top"><div class="wrap"><a class="brand" href="${lang === 'es' ? '/es/' : '/'}" translate="no">GUARA PLATFORM</a></div></header><main><section class="hero"><div class="wrap"><h1>${t.title}</h1><p class="lead">${message}</p></div></section><div class="content"><div class="wrap"><div class="cta"><p>${t.mail} <a href="mailto:guaraplatform@guaraplatform.com">guaraplatform@guaraplatform.com</a></p><div class="cta-links"><a href="${FORM_PAGE[lang]}">${t.back}</a></div></div></div></div></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    },
  });
}
