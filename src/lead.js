// Lead form schema and server-side validation (authoritative; the browser checks are UX only).
import { COUNTRY_CODES } from './countries.js';

export const ENUMS = {
  interests: ['professional', 'pilot', 'licensing', 'integration', 'oem', 'unsure'],
  current_situation: [
    'complete_solution', 'has_hardware', 'has_platform',
    'has_hardware_and_software', 'manufacturer', 'defining_problem',
  ],
  organization_type: [
    'end_user', 'fleet_transport', 'industrial_mining', 'integrator', 'telematics',
    'software_company', 'hardware_manufacturer', 'oem_equipment', 'research', 'investor', 'other',
  ],
  industry: [
    'passenger_transport', 'freight_logistics', 'mining', 'industry_manufacturing',
    'construction_machinery', 'control_centers', 'technology_software', 'other',
  ],
  infrastructure: ['cameras', 'edge_hardware', 'gps_telematics', 'fleet_platform', 'software_platform', 'nothing', 'other'],
  operation_scale: ['1-10', '11-50', '51-200', '201-1000', '1000+', 'not_applicable', 'prefer_to_discuss'],
  goal: ['fatigue', 'attention', 'add_hsi_to_product', 'operational_safety', 'other_use_case', 'other'],
  language: ['en', 'es'],
  intent_source: ['professional', 'pilot', 'licensing', 'integration', 'oem', 'general', 'none'],
};

// "I'm not sure yet" and "Nothing yet" cannot be combined with other answers. When a visitor
// (e.g. without JavaScript) selects both, the more specific answers are kept.
const EXCLUSIVE = { interests: 'unsure', infrastructure: 'nothing' };

const TEXT_LIMITS = {
  name: 120,
  company: 160,
  email: 254,
  infrastructure_detail: 300,
  message: 1000,
};

const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
const UTM_MAX = 100;

export const HONEYPOT_FIELD = 'website';
const MULTI_FIELDS = new Set(['interests', 'infrastructure']);

export const ALLOWED_FIELDS = new Set([
  'interests', 'current_situation', 'organization_type', 'industry', 'infrastructure',
  'infrastructure_detail', 'operation_scale', 'goal',
  'name', 'company', 'email', 'country', 'message', 'privacy_ack',
  'language', 'page_source', 'intent_source', ...UTM_FIELDS,
  HONEYPOT_FIELD,
]);

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]/g;
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;
const PAGE_SOURCE = /^\/[a-z0-9/_-]{0,80}$/;

function cleanLine(value) {
  return String(value).normalize('NFC').replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
}

function cleanMultiline(value) {
  return String(value)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanUtm(value) {
  return cleanLine(value).replace(/[^A-Za-z0-9 ._~+\-/:]/g, '').slice(0, UTM_MAX) || null;
}

function isTrue(value) {
  return value === true || value === 'true' || value === 'on' || value === '1' || value === 'yes';
}

/**
 * Validates a raw submission (field name -> string | string[] | boolean).
 * Returns { ok: true, lead, spam } or { ok: false, errors } where errors maps field -> code.
 */
export function validateLead(raw) {
  const errors = {};

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_FIELDS.has(key)) errors[key] = 'unexpected_field';
  }
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value) && !MULTI_FIELDS.has(key)) errors[key] = 'invalid';
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  // The honeypot is the only anti-spam signal that discards a submission (silently, by the caller).
  // Submission speed is deliberately not used: a fast, autofilled form must never lose a real lead.
  const honeypot = raw[HONEYPOT_FIELD];
  const spam = honeypot !== undefined && cleanLine(honeypot) !== '' ? 'honeypot' : null;

  const lead = {};

  for (const field of ['interests', 'infrastructure']) {
    let values = raw[field];
    if (values === undefined || values === '') values = [];
    if (!Array.isArray(values)) values = [values];
    values = [...new Set(values.map((v) => cleanLine(v)))].filter(Boolean);
    if (values.some((v) => !ENUMS[field].includes(v))) { errors[field] = 'invalid'; continue; }
    if (values.length > 1) values = values.filter((v) => v !== EXCLUSIVE[field]);
    if (!values.length) { errors[field] = 'required'; continue; }
    lead[field] = values;
  }

  for (const [field, required] of [
    ['current_situation', true], ['organization_type', true], ['industry', true],
    ['operation_scale', false], ['goal', false], ['language', true], ['intent_source', false],
  ]) {
    const value = raw[field] === undefined ? '' : cleanLine(raw[field]);
    if (!value) {
      if (required) errors[field] = 'required';
      else lead[field] = null;
      continue;
    }
    if (!ENUMS[field].includes(value)) { errors[field] = 'invalid'; continue; }
    lead[field] = value;
  }

  for (const field of ['name', 'company', 'email', 'infrastructure_detail', 'message']) {
    const value = raw[field] === undefined ? '' : (field === 'message' ? cleanMultiline(raw[field]) : cleanLine(raw[field]));
    if (value.length > TEXT_LIMITS[field]) { errors[field] = 'too_long'; continue; }
    lead[field] = value || null;
  }
  for (const field of ['name', 'company', 'email']) {
    if (!errors[field] && !lead[field]) errors[field] = 'required';
  }
  if (!errors.email && lead.email) {
    if (!EMAIL.test(lead.email)) errors.email = 'invalid';
    else {
      const at = lead.email.lastIndexOf('@');
      lead.email = lead.email.slice(0, at) + '@' + lead.email.slice(at + 1).toLowerCase();
    }
  }
  // The free-text infrastructure detail only makes sense when some infrastructure exists.
  if (lead.infrastructure && lead.infrastructure.length === 1 && lead.infrastructure[0] === 'nothing') {
    lead.infrastructure_detail = null;
  }

  const country = raw.country === undefined ? '' : cleanLine(raw.country).toUpperCase();
  if (!country) errors.country = 'required';
  else if (!COUNTRY_CODES.has(country)) errors.country = 'invalid';
  else lead.country = country;

  if (!isTrue(raw.privacy_ack)) errors.privacy_ack = 'required';

  const page = raw.page_source === undefined ? '' : cleanLine(raw.page_source).toLowerCase();
  lead.page_source = PAGE_SOURCE.test(page) ? page : null;

  for (const field of UTM_FIELDS) {
    lead[field] = raw[field] === undefined ? null : cleanUtm(raw[field]);
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, lead, spam };
}
