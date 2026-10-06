// GUARA Platform V37 — script.v36.js (verbatim, itself based on script.v31.js) + the Phase B lead-form block at the end.
// V36: removed the client-side EN→ES text dictionary (EN and ES are separate
// pre-rendered URLs, so it never changed any text) and the stale runtime
// <title>/meta-description override. Language buttons still navigate / ↔ /es/.
(function(){
  const attrTranslations = [
    {selector:'#menuBtn', attr:'aria-label', en:'Open menu', es:'Abrir menú'},
    {selector:'#langSwitch', attr:'aria-label', en:'Language / Idioma', es:'Idioma / Language'}
  ];

  function applyLanguage(lang) {
    const useES = lang === 'es';
    document.documentElement.lang = useES ? 'es' : 'en';

    attrTranslations.forEach(item => {
      const el = document.querySelector(item.selector);
      if (el) el.setAttribute(item.attr, useES ? item.es : item.en);
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    try { localStorage.setItem('guara-language-v25', lang); } catch (_) {}
    window.dispatchEvent(new CustomEvent('guara:languagechange', {detail:{lang}}));
  }

  window.GUARA_I18N = { applyLanguage, getLanguage: () => document.documentElement.lang || 'en' };
  document.querySelectorAll('.lang-btn').forEach(btn => btn.addEventListener('click', () => {
    const target = btn.dataset.lang;
    if (target === 'es') {
      if (location.pathname !== '/es/' && location.pathname !== '/es') {
        window.location.assign('/es/');
        return;
      }
      applyLanguage('es');
      return;
    }
    if (target === 'en') {
      if (location.pathname === '/es/' || location.pathname === '/es') {
        window.location.assign('/');
        return;
      }
      applyLanguage('en');
    }
  }));
  const isSpanishUrl = location.pathname === '/es/' || location.pathname === '/es';
  const initial = isSpanishUrl ? 'es' : 'en';
  applyLanguage(initial);
})();


const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

function setMenuOpen(open) {
  if (!menuBtn || !navLinks) return;
  navLinks.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  const lang = document.documentElement.lang === "es" ? "es" : "en";
  menuBtn.setAttribute("aria-label", open
    ? (lang === "es" ? "Cerrar menú" : "Close menu")
    : (lang === "es" ? "Abrir menú" : "Open menu"));
}

if (menuBtn && navLinks) {
  menuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    setMenuOpen(!navLinks.classList.contains("open"));
  });

  document.addEventListener("click", (event) => {
    if (!navLinks.classList.contains("open")) return;
    if (!navLinks.contains(event.target) && !menuBtn.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) setMenuOpen(false);
  });
}

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => setMenuOpen(false));
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));


// ===== GUARA HERO V3: synchronize HUD states with the 6-second video loop =====
const guaraVideo = document.getElementById("guaraVideo");
const demoShell = document.getElementById("guaraDemoShell");
const humanState = document.getElementById("humanState");
const humanStateSub = document.getElementById("humanStateSub");
const temporalTrend = document.getElementById("temporalTrend");
const temporalSub = document.getElementById("temporalSub");
const confidenceValue = document.getElementById("confidenceValue");
const confidencePct = document.getElementById("confidencePct");
const confidenceBar = document.getElementById("confidenceBar");
const uncertaintyState = document.getElementById("uncertaintyState");
const uncertaintyPct = document.getElementById("uncertaintyPct");
const uncertaintyBar = document.getElementById("uncertaintyBar");
const riskState = document.getElementById("riskState");
const riskPath = document.getElementById("riskPath");
const riskDot = document.getElementById("riskDot");
const alertText = document.getElementById("alertText");
const bars = {
  eyes: document.getElementById("barEyes"), head: document.getElementById("barHead"),
  gaze: document.getElementById("barGaze"), obs: document.getElementById("barObs")
};
const vals = {
  eyes: document.getElementById("eyesVal"), head: document.getElementById("headVal"),
  gaze: document.getElementById("gazeVal"), obs: document.getElementById("obsVal")
};

const hudTranslationsES = {"STABLE": "ESTABLE", "Focused · attentive": "Enfocado · atento", "NORMAL": "NORMAL", "Consistent over time": "Consistente en el tiempo", "HIGH": "ALTA", "LOW": "BAJA", "MONITORING": "MONITOREANDO", "ADAPTING": "ADAPTANDO", "Context shift detected": "Cambio de contexto detectado", "CHANGING": "CAMBIANDO", "Short-term variation": "Variación de corto plazo", "WATCH": "OBSERVAR", "TRACKING": "SEGUIMIENTO", "ATTENTION DROP": "CAÍDA DE ATENCIÓN", "Temporal pattern emerging": "Patrón temporal emergente", "RISING": "EN AUMENTO", "Persistence increasing": "Persistencia en aumento", "MODERATE": "MODERADA", "ELEVATED": "ELEVADA", "CHECKING STATE": "VERIFICANDO ESTADO", "ELEVATED RISK": "RIESGO ELEVADO", "Drowsiness pattern": "Patrón de somnolencia", "CRITICAL TREND": "TENDENCIA CRÍTICA", "Risk trajectory increased": "Trayectoria de riesgo aumentada", "RISK DETECTED": "RIESGO DETECTADO", "RECOVERING": "RECUPERANDO", "Attention restored": "Atención restablecida", "STABILIZING": "ESTABILIZANDO", "Returning to baseline": "Volviendo a la línea base", "DECREASING": "EN DESCENSO", "RECOVERY": "RECUPERACIÓN"};
function hudText(v){ return document.documentElement.lang === "es" ? (hudTranslationsES[v] || v) : v; }
const hudStates = {
  stable: {cls:"", human:"STABLE", humanSub:"Focused · attentive", trend:"NORMAL", trendSub:"Consistent over time", conf:"HIGH", confPct:94, unc:"LOW", uncPct:8, risk:"LOW", alert:"MONITORING", eyes:82, head:74, gaze:79, obs:91, path:"M0 52 C55 50,95 48,130 47 S205 43,300 42", dotY:42},
  shift: {cls:"", human:"ADAPTING", humanSub:"Context shift detected", trend:"CHANGING", trendSub:"Short-term variation", conf:"HIGH", confPct:92, unc:"LOW", uncPct:11, risk:"WATCH", alert:"TRACKING", eyes:77, head:68, gaze:61, obs:89, path:"M0 52 C50 50,92 47,132 43 S212 34,300 30", dotY:30},
  warning: {cls:"warning", human:"ATTENTION DROP", humanSub:"Temporal pattern emerging", trend:"RISING", trendSub:"Persistence increasing", conf:"HIGH", confPct:90, unc:"MODERATE", uncPct:22, risk:"ELEVATED", alert:"CHECKING STATE", eyes:49, head:64, gaze:55, obs:86, path:"M0 52 C60 50,100 45,145 37 S225 18,300 13", dotY:13},
  danger: {cls:"danger", human:"ELEVATED RISK", humanSub:"Drowsiness pattern", trend:"CRITICAL TREND", trendSub:"Risk trajectory increased", conf:"HIGH", confPct:91, unc:"MODERATE", uncPct:20, risk:"HIGH", alert:"RISK DETECTED", eyes:28, head:57, gaze:44, obs:84, path:"M0 52 C55 49,104 41,150 29 S230 9,300 7", dotY:7},
  recovery: {cls:"", human:"RECOVERING", humanSub:"Attention restored", trend:"STABILIZING", trendSub:"Returning to baseline", conf:"HIGH", confPct:93, unc:"LOW", uncPct:10, risk:"DECREASING", alert:"RECOVERY", eyes:75, head:71, gaze:76, obs:90, path:"M0 14 C60 18,110 27,155 34 S230 43,300 48", dotY:48}
};
let lastHudKey = "";
function applyHud(key){
  if(key===lastHudKey) return; lastHudKey=key; const s=hudStates[key];
  demoShell.classList.remove("warning","danger"); if(s.cls) demoShell.classList.add(s.cls);
  humanState.textContent=hudText(s.human); humanStateSub.textContent=hudText(s.humanSub);
  temporalTrend.textContent=hudText(s.trend); temporalSub.textContent=hudText(s.trendSub);
  // V36: confidence / uncertainty read-outs were removed from the markup (scripted values
  // must not read as measured performance); keep the updates null-safe.
  if(confidenceValue) confidenceValue.textContent=hudText(s.conf);
  if(confidencePct) confidencePct.textContent=s.confPct+"%";
  if(confidenceBar) confidenceBar.style.width=s.confPct+"%";
  if(uncertaintyState) uncertaintyState.textContent=hudText(s.unc);
  if(uncertaintyPct) uncertaintyPct.textContent=String(s.uncPct).padStart(2,"0")+"%";
  if(uncertaintyBar) uncertaintyBar.style.width=s.uncPct+"%";
  riskState.textContent=hudText(s.risk); alertText.textContent=hudText(s.alert);
  riskPath.setAttribute("d",s.path); riskDot.setAttribute("cy",s.dotY);
  for(const k of ["eyes","head","gaze","obs"]){if(bars[k]) bars[k].style.width=s[k]+"%"; if(vals[k]) vals[k].textContent=s[k];}
}
window.addEventListener('guara:languagechange', () => {
  lastHudKey = "";
  if (guaraVideo) {
    const t = guaraVideo.currentTime || 0;
    let key = "stable";
    if(t>=1.8 && t<3.0) key="shift";
    else if(t>=3.0 && t<3.8) key="warning";
    else if(t>=3.8 && t<4.7) key="danger";
    else if(t>=4.7) key="recovery";
    applyHud(key);
  }
});

function syncHud(){
  if(!guaraVideo) return;
  const t=guaraVideo.currentTime || 0;
  let key="stable";
  if(t>=1.8 && t<3.0) key="shift";
  else if(t>=3.0 && t<3.8) key="warning";
  else if(t>=3.8 && t<4.7) key="danger";
  else if(t>=4.7) key="recovery";
  applyHud(key);
  requestAnimationFrame(syncHud);
}
if(guaraVideo){
  guaraVideo.muted=true;
  const p=guaraVideo.play(); if(p && p.catch) p.catch(()=>{});
  requestAnimationFrame(syncHud);
}



// ===== V10: animate problem section counters and charts on view =====
const animatedBlocks = document.querySelectorAll('.animate-on-view');
function formatProblemValue(value, format){
  if(format === 'percent') return Math.round(value).toLocaleString(document.documentElement.lang === 'es' ? 'es-AR' : 'en-US') + '%';
  if(format === 'decimal1') return value.toLocaleString(document.documentElement.lang === 'es' ? 'es-AR' : 'en-US', {minimumFractionDigits:1, maximumFractionDigits:1});
  return Math.round(value).toLocaleString(document.documentElement.lang === 'es' ? 'es-AR' : 'en-US');
}
function animateCount(el){
  if(el.dataset.done === '1') return;
  el.dataset.done = '1';
  const target = Number(el.dataset.count || 0);
  const format = el.dataset.format || 'integer';
  const duration = 1200;
  const start = performance.now();
  function tick(now){
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const value = target * eased;
    el.textContent = formatProblemValue(value, format);
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const problemObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(!entry.isIntersecting) return;
    const block = entry.target;
    block.classList.add('ready');
    block.querySelectorAll('.count-up').forEach(animateCount);
    block.querySelectorAll('[data-fill]').forEach(el => {
      const fill = Number(el.dataset.fill || 0);
      el.style.setProperty('--fill', fill);
    });
    problemObserver.unobserve(block);
  });
}, { threshold: 0.28 });
animatedBlocks.forEach(block => problemObserver.observe(block));



// ===== V13: staged validation animation on section enter =====
const stagedValidation = document.getElementById("stagedValidation");
if (stagedValidation) {
  const validationObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        stagedValidation.classList.add("active");
        validationObserver.unobserve(stagedValidation);
      }
    });
  }, { threshold: 0.32 });

  validationObserver.observe(stagedValidation);
}


// ===== V29: prevent persistent horizontal document offset on mobile =====
(function mobileViewportGuard(){
  const resetHorizontalOffset = () => {
    document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
  };
  window.addEventListener('load', resetHorizontalOffset, { once: true });
  window.addEventListener('orientationchange', () => setTimeout(resetHorizontalOffset, 80));
})();


// ===== V37 (Phase B): lead form — two steps, intent preselection, UTM attribution =====
// script.v37.js = script.v36.js (verbatim) + this block. Without JavaScript the form still posts
// natively to /api/lead, which validates everything again (the checks here are UX only).
(function leadForm(){
  const form = document.getElementById('leadForm');
  if (!form) return;

  const INTENTS = ['professional', 'pilot', 'licensing', 'integration', 'oem', 'general'];
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  const UTM_STORE = 'guara-utm-v1';
  const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;
  const SCALE_ORGS = ['end_user', 'fleet_transport', 'industrial_mining'];
  const SCALE_INTERESTS = ['professional', 'pilot'];

  const step1 = document.getElementById('leadStep1');
  const step2 = document.getElementById('leadStep2');
  const progress = form.querySelector('.v37-progress');
  const summary = document.getElementById('leadErrors');
  const success = document.getElementById('leadSuccess');
  const title = document.getElementById('leadTitle');
  const nextBtn = form.querySelector('.v37-next');
  const backBtn = form.querySelector('.v37-back');
  const submitBtn = form.querySelector('.v37-submit');
  const infraDetail = document.getElementById('f-infrastructure_detail');
  const scaleField = document.getElementById('f-operation_scale');
  const message = document.getElementById('leadMessage');
  const counter = form.querySelector('.v37-counter [data-count]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Progressive enhancement: JS takes over validation and splits the form in two steps.
  form.noValidate = true;
  form.classList.add('is-enhanced');
  progress.hidden = false;
  nextBtn.hidden = false;
  backBtn.hidden = false;
  step2.hidden = true;

  const values = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  const setField = (name, value) => { if (form.elements[name]) form.elements[name].value = value; };

  // ---- UTM attribution (only the four campaign keys; kept for the current tab session) ----
  function cleanUtm(value) {
    return String(value || '').replace(/[^A-Za-z0-9 ._~+\-/:]/g, '').slice(0, 100);
  }
  let utm = {};
  try { utm = JSON.parse(sessionStorage.getItem(UTM_STORE) || '{}') || {}; } catch (_) { utm = {}; }
  const params = new URLSearchParams(location.search);
  if (UTM_KEYS.some((k) => params.get(k))) {
    utm = {};
    UTM_KEYS.forEach((k) => { const v = cleanUtm(params.get(k)); if (v) utm[k] = v; });
    try { sessionStorage.setItem(UTM_STORE, JSON.stringify(utm)); } catch (_) {}
  }
  UTM_KEYS.forEach((k) => setField(k, cleanUtm(utm[k])));

  // ---- Intent preselection (data-intent links and ?intent= URLs) ----
  function applyIntent(intent) {
    if (!INTENTS.includes(intent)) return;
    setField('intent_source', intent);
    if (intent === 'general') return; // "Talk to GUARA": no forced interest
    const box = form.querySelector(`input[name="interests"][value="${intent}"]`);
    if (box && !box.checked) {
      box.checked = true;
      box.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  function focusFormSoon() {
    window.setTimeout(() => title.focus({ preventScroll: true }), reduceMotion ? 0 : 450);
  }
  const urlIntent = params.get('intent');
  if (urlIntent) {
    applyIntent(urlIntent);
    if (location.hash === '#contacto') focusFormSoon();
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-intent]');
    if (!link) return;
    applyIntent(link.dataset.intent);
    if (link.getAttribute('href') === '#contacto') focusFormSoon();
  });

  // ---- Exclusive options and conditional fields ----
  function exclusive(name, value, changed) {
    const boxes = [...form.querySelectorAll(`input[name="${name}"]`)];
    if (!changed.checked) return;
    boxes.forEach((b) => {
      if (b === changed) return;
      if (changed.value === value || b.value === value) b.checked = false;
    });
  }
  function updateConditionals() {
    const infra = values('infrastructure');
    const showDetail = infra.some((v) => v !== 'nothing');
    infraDetail.hidden = !showDetail;
    if (!showDetail) form.elements.infrastructure_detail.value = '';

    const org = form.elements.organization_type.value;
    const showScale = SCALE_ORGS.includes(org) || values('interests').some((v) => SCALE_INTERESTS.includes(v));
    scaleField.hidden = !showScale;
    if (!showScale) form.querySelectorAll('input[name="operation_scale"]').forEach((r) => { r.checked = false; });
  }
  form.addEventListener('change', (event) => {
    const el = event.target;
    if (el.name === 'interests') exclusive('interests', 'unsure', el);
    if (el.name === 'infrastructure') exclusive('infrastructure', 'nothing', el);
    if (el.name === 'interests' || el.name === 'infrastructure' || el.name === 'organization_type') updateConditionals();
    const field = el.closest('.v37-field');
    if (field && field.classList.contains('is-invalid')) clearError(field);
  });
  form.addEventListener('input', (event) => {
    if (event.target === message) counter.textContent = String(message.value.length);
    const field = event.target.closest('.v37-field');
    if (field && field.classList.contains('is-invalid')) clearError(field);
  });
  updateConditionals();

  // ---- Validation (mirrors the server rules for a better experience) ----
  function fieldError(name) {
    const el = form.elements[name];
    switch (name) {
      case 'interests':
      case 'infrastructure':
        return values(name).length ? null : 'required';
      case 'current_situation':
        return values(name).length ? null : 'required';
      case 'email': {
        const v = el.value.trim();
        if (!v) return 'required';
        if (v.length > 254) return 'too_long';
        return EMAIL.test(v) ? null : 'invalid';
      }
      case 'privacy_ack':
        return el.checked ? null : 'required';
      case 'message':
        return el.value.length > 1000 ? 'too_long' : null;
      case 'infrastructure_detail':
        return el.value.length > 300 ? 'too_long' : null;
      default: {
        const v = el.value.trim();
        if (!v) return 'required';
        return el.maxLength > 0 && v.length > el.maxLength ? 'too_long' : null;
      }
    }
  }
  const STEP_FIELDS = {
    1: ['interests', 'current_situation', 'organization_type', 'industry', 'infrastructure', 'infrastructure_detail'],
    2: ['name', 'company', 'email', 'country', 'message', 'privacy_ack'],
  };
  function wrapperFor(name) { return document.getElementById(`f-${name}`); }
  function controlFor(name) {
    const w = wrapperFor(name);
    return w && w.querySelector('input:not([type="hidden"]), select, textarea');
  }
  function clearError(wrapper) {
    wrapper.classList.remove('is-invalid');
    const msg = wrapper.querySelector('.v37-error-msg');
    if (msg) { msg.hidden = true; msg.textContent = ''; }
    wrapper.querySelectorAll('input, select, textarea').forEach((c) => c.removeAttribute('aria-invalid'));
  }
  function showError(name, code) {
    const wrapper = wrapperFor(name);
    if (!wrapper) return null;
    const key = code === 'too_long' ? 'msgToo_long' : code === 'required' ? 'msgRequired' : 'msgInvalid';
    const text = wrapper.dataset[key] || wrapper.dataset.msgInvalid || wrapper.dataset.msgRequired || '';
    wrapper.classList.add('is-invalid');
    const msg = wrapper.querySelector('.v37-error-msg');
    msg.textContent = text;
    msg.hidden = false;
    wrapper.querySelectorAll('input, select, textarea').forEach((c) => c.setAttribute('aria-invalid', 'true'));
    return { name, text };
  }
  function renderSummary(items, override) {
    summary.textContent = '';
    if (!items.length && !override) { summary.hidden = true; return; }
    const p = document.createElement('p');
    p.textContent = override || form.dataset.msgSummary;
    summary.appendChild(p);
    if (items.length) {
      const ul = document.createElement('ul');
      items.forEach((item) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#f-${item.name}`;
        a.textContent = item.text;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const c = controlFor(item.name);
          if (c) c.focus();
        });
        li.appendChild(a);
        ul.appendChild(li);
      });
      summary.appendChild(ul);
    }
    summary.hidden = false;
    summary.focus();
  }
  function validate(names) {
    const errors = [];
    names.forEach((name) => {
      const wrapper = wrapperFor(name);
      if (!wrapper || wrapper.hidden) return;
      clearError(wrapper);
      const code = fieldError(name);
      if (code) errors.push(showError(name, code));
    });
    return errors.filter(Boolean);
  }

  // ---- Steps ----
  function goTo(step) {
    const first = step === 1;
    step1.hidden = !first;
    step2.hidden = first;
    const items = progress.querySelectorAll('li');
    items.forEach((li, i) => {
      const current = i === step - 1;
      li.classList.toggle('is-current', current);
      li.classList.toggle('is-done', i < step - 1);
      if (current) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    summary.hidden = true;
    const heading = document.getElementById(first ? 'leadStep1Title' : 'leadStep2Title');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
  nextBtn.addEventListener('click', () => {
    const errors = validate(STEP_FIELDS[1]);
    if (errors.length) { renderSummary(errors); return; }
    updateConditionals();
    goTo(2);
  });
  backBtn.addEventListener('click', () => goTo(1));

  // ---- Submit ----
  let sending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const errors1 = validate(STEP_FIELDS[1]);
    if (errors1.length) { goTo(1); renderSummary(errors1); return; }
    const errors2 = validate(STEP_FIELDS[2]);
    if (errors2.length) { renderSummary(errors2); return; }

    sending = true;
    submitBtn.disabled = true;
    submitBtn.textContent = form.dataset.msgSending;
    let response = null;
    try {
      response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams(new FormData(form)).toString(),
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) { showSuccess(); return; }
      if (response.status === 400 && data.fields) {
        const items = Object.entries(data.fields).map(([name, code]) => showError(name, code)).filter(Boolean);
        const onStep1 = items.some((i) => STEP_FIELDS[1].includes(i.name));
        if (onStep1) goTo(1);
        renderSummary(items, items.length ? null : form.dataset.msgNetwork);
      } else {
        renderSummary([], response.status === 429 || response.status === 503 ? form.dataset.msgBusy : form.dataset.msgNetwork);
      }
    } catch (_) {
      renderSummary([], form.dataset.msgNetwork);
    } finally {
      sending = false;
      submitBtn.disabled = false;
      submitBtn.textContent = form.dataset.msgSubmit;
    }
  });

  function showSuccess() {
    const name = form.elements.name.value.trim().split(/\s+/)[0] || '';
    const heading = document.getElementById('leadSuccessTitle');
    heading.textContent = name
      ? heading.dataset.template.replace('{name}', name)
      : heading.dataset.templateNoname;
    form.hidden = true;
    success.hidden = false;
    heading.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }
})();
