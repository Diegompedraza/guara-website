// GUARA Platform V36 — based on script.v31.js (kept untouched for rollback).
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
