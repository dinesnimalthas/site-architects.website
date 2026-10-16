/* ═══════════════════════════════════════════════════════
   Site Architects — script.js
═══════════════════════════════════════════════════════ */
'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Navigation: Linie beim Scrollen */
const nav = document.getElementById('nav');

/* Werdegang: Linie zeichnet sich beim Scrollen, Stationen leuchten auf */
const timeline = document.getElementById('timeline');
const tlItems  = [...timeline.children];

function updateTimeline() {
  const r = timeline.getBoundingClientRect();
  const p = Math.min(Math.max((window.innerHeight * 0.75 - r.top) / r.height, 0), 1);
  timeline.style.setProperty('--tl', p.toFixed(3));
  tlItems.forEach(li => li.classList.toggle('on', li.offsetTop <= p * r.height));
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
    if (!reduceMotion) updateTimeline();
    ticking = false;
  });
}
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });

/* Mobile-Menü */
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
  mobileMenu.hidden = !open;
}
menuBtn.addEventListener('click', () => setMenu(mobileMenu.hidden));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

/* Plankopf: heutiges Datum */
document.getElementById('pkDate').textContent =
  new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

/* Dezentes Einblenden beim Scrollen */
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.section__head, .about__body > p, .about__li, .about__cols > div, .phase, .row, .faq, .contact > *, .contact__big')
    .forEach(el => {
      // Geschwister in Gruppen (Phasen, Leistungen, Spalten) erscheinen gestaffelt
      const group = el.matches('.phase, .row, .about__cols > div, .contact > *');
      if (group) el.style.setProperty('--d', ([...el.parentElement.children].indexOf(el) % 5) * 70 + 'ms');
      el.classList.add('reveal'); io.observe(el);
    });
}

/* Navigation: aktuellen Abschnitt markieren */
if ('IntersectionObserver' in window) {
  const navLinks = [...document.querySelectorAll('.nav__links a, .mobile-menu a')];
  const sections = [...new Set(navLinks.map(a => a.getAttribute('href')))]
    .map(id => document.querySelector(id)).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => {
        if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));
}

/* Plan → Bau: eine kleine Baustelle. Erst zeichnet sich der Plan, dann setzt ein Kran
   die echte Website Etage für Etage ein, und der Hammer schlägt jede Etage fest. */
const build       = document.getElementById('build');
const buildSite   = build.querySelector('.build__site');
const buildFrame  = document.getElementById('buildFrame');
const buildReal   = document.getElementById('buildReal');
const buildPlan   = document.getElementById('buildPlan');
const buildFx     = document.getElementById('buildFx');
const hammer      = document.getElementById('hammer');
const hammerSvg   = hammer.querySelector('svg');
const buildPhase  = document.getElementById('buildPhase');
const buildPct    = document.getElementById('buildPct');
const buildReplay = document.getElementById('buildReplay');

const EASE_OUT    = 'cubic-bezier(.23,1,.32,1)';
const EASE_IN_OUT = 'cubic-bezier(.77,0,.175,1)';
const EASE_CRANE  = 'cubic-bezier(.45,.05,.25,1)';  // anfahren, langsam absetzen
const EASE_STRIKE = 'cubic-bezier(.55,0,1,.45)';    // beschleunigt bis zum Aufprall
const mobile = window.matchMedia('(max-width: 760px)');

// Etagengrenzen in Pixeln der jeweiligen Aufnahme, an ruhigen Stellen geschnitten
const LAYOUTS = {
  desk: { h: 900, floors: [0, 67, 395, 715, 900] },
  mob:  { h: 624, floors: [0, 66, 335, 483, 624] },
};

const wait = ms => new Promise(r => setTimeout(r, ms));
const make = (tag, cls, parent) => {
  const el = document.createElement(tag);
  el.className = cls;
  parent.appendChild(el);
  return el;
};

const strips  = make('div', 'build__strips', buildFx);
const crane   = make('div', 'crane', buildFx);
const cable   = make('div', 'crane__cable', buildFx);
const rig     = make('div', 'crane__rig', buildFx);
buildFx.appendChild(hammer); // Hammer über Kran und Etagen

buildPlan.querySelectorAll('.p-line, .p-dim, .p-thin').forEach(el => {
  el.setAttribute('pathLength', '1'); el.classList.add('p-draw');
});
buildPlan.querySelectorAll('.p-block, .p-callout, .p-note, .p-label, .p-dimtext')
  .forEach(el => el.classList.add('p-pop'));

let g = null, stripEls = [];
let angle = -35, hx = 0, hy = 0, pct = 0, runId = 0, running = false;

/* Masse der Baustelle für die aktuelle Breite */
function measure() {
  const W = buildSite.clientWidth;
  const sky = Math.round(Math.min(Math.max(W * 0.1, 76), 132));
  buildSite.style.setProperty('--sky', sky + 'px');
  const fx = buildFrame.offsetLeft + buildFrame.clientLeft;
  const fy = buildFrame.offsetTop + buildFrame.clientTop;
  const fw = buildFrame.clientWidth, fh = buildFrame.clientHeight;
  const L = mobile.matches ? LAYOUTS.mob : LAYOUTS.desk;
  const tw = Math.round(Math.min(Math.max(W * 0.022, 12), 22));
  const jibY = Math.round(sky * 0.34);
  const jh = Math.round(tw * 0.8);
  return {
    W, sky, fx, fy, fw, fh, tw, jibY, jh,
    floors: L.floors.map(v => v / L.h * fh),
    radius: Math.max(parseFloat(getComputedStyle(buildFrame).borderTopLeftRadius) - buildFrame.clientLeft, 0),
    towerX: Math.round(W - Math.max(W * 0.045, 12) - tw),
    cx: Math.round(fx + fw / 2),
    cableTop: jibY + jh + 6,
    hookH: 20,
    slingH: Math.round(Math.min(Math.max(fh * 0.07, 24), 48)),
    bottom: fy + fh,
  };
}

/* Kran als Strichzeichnung, passend zur Planoptik */
function drawCrane() {
  const { W, tw, jibY, jh, towerX, bottom, cx, sky } = g;
  const tipX = Math.round(Math.max(W * 0.025, 8));
  const tailX = Math.min(towerX + tw + Math.round(W * 0.06), W - 2);
  const apexY = Math.round(jibY - sky * 0.26);
  const top = jibY + jh;
  let d = `M${towerX} ${jibY}V${bottom}M${towerX + tw} ${jibY}V${bottom}`;
  for (let y = top; y < bottom - tw * .5; y += tw) {
    d += `M${towerX} ${y}H${towerX + tw}L${towerX} ${Math.min(y + tw, bottom)}`;
  }
  d += `M${tipX} ${jibY}H${tailX}M${tipX} ${top}H${tailX}M${tipX} ${jibY}V${top}M${tailX} ${jibY}V${top}`;
  const step = jh * 1.3;
  for (let x = tipX, k = 0; x < tailX - 1; x += step, k++) {
    d += `M${x} ${k % 2 ? jibY : top}L${Math.min(x + step, tailX)} ${k % 2 ? top : jibY}`;
  }
  const ax = towerX + tw / 2;
  d += `M${towerX} ${jibY}L${ax} ${apexY}L${towerX + tw} ${jibY}`;
  d += `M${ax} ${apexY}L${tipX + (towerX - tipX) * .3} ${jibY}M${ax} ${apexY}L${tailX} ${jibY}`;
  d += `M${towerX - tw * .7} ${bottom}H${towerX + tw * 1.7}`;
  crane.innerHTML = `<svg width="${W}" height="${bottom + 2}" viewBox="0 0 ${W} ${bottom + 2}">
    <path class="crane__halo" d="${d}" />
    <path class="crane__lines" d="${d}" />
    <rect class="crane__cab" x="${towerX - tw * 1.15}" y="${top}" width="${tw * 1.15}" height="${tw}" rx="2" />
    <rect class="crane__weight" x="${tailX - tw * 1.5}" y="${top}" width="${tw * 1.4}" height="${tw * 1.1}" rx="1" />
    <rect class="crane__trolley" x="${cx - 9}" y="${top}" width="18" height="6" rx="1" />
  </svg>`;
}

/* Haken mit Anschlagseilen, die die Etage an beiden Enden fassen */
function drawRig() {
  const { W, cx, hookH, slingH, fx, fw } = g;
  const h = hookH + slingH;
  rig.innerHTML = `<svg width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">
    <rect class="crane__block" x="${cx - 6}" y="0" width="12" height="9" rx="2" />
    <path class="crane__hook" d="M${cx} 9v5a5 5 0 1 1-5 5" />
    <path class="crane__halo crane__halo--thin" d="M${cx} ${hookH}L${fx + fw * .1} ${h}M${cx} ${hookH}L${fx + fw * .9} ${h}" />
    <path class="crane__sling" d="M${cx} ${hookH}L${fx + fw * .1} ${h}M${cx} ${hookH}L${fx + fw * .9} ${h}" />
  </svg>`;
  cable.style.translate = `${cx - .75}px ${g.cableTop}px`;
  cable.style.height = (g.fy + g.floors[g.floors.length - 2] - hookH - slingH - g.cableTop) + 'px';
}

function buildStrips() {
  const { fx, fy, fw, fh, floors, radius } = g;
  const src = buildReal.currentSrc || buildReal.src;
  strips.innerHTML = '';
  stripEls = floors.slice(0, -1).map((top, i) => {
    const img = make('img', '', strips);
    img.src = src; img.alt = '';
    const bottom = fh - floors[i + 1];
    const r = i === 0 ? `${radius}px ${radius}px 0 0` : i === floors.length - 2 ? `0 0 ${radius}px ${radius}px` : '0';
    img.style.cssText = `left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;clip-path:inset(${top}px 0 ${bottom}px 0 round ${r})`;
    return img;
  });
}

/* Hammer so platzieren, dass seine Schlagfläche im Aufprall genau auf dem Ziel liegt */
function hammerPos([tx, ty]) {
  const size = hammer.offsetWidth, k = size / 100;
  return [tx + 81 * k - 0.6 * size, ty - 32 * k - size];
}
function swing(to, duration, easing) {
  const a = hammerSvg.animate(
    [{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${to}deg)` }],
    { duration, easing, fill: 'forwards' });
  angle = to;
  return a.finished;
}
function moveHammer(x, y, duration) {
  const a = hammer.animate(
    [{ transform: `translate(${hx}px,${hy}px)` }, { transform: `translate(${x}px,${y}px)` }],
    { duration, easing: EASE_IN_OUT, fill: 'forwards' });
  hx = x; hy = y;
  return a.finished;
}
function countTo(target, duration = 420) {
  const from = pct, t0 = performance.now(), id = runId;
  const step = now => {
    if (id !== runId) return;
    const t = Math.min((now - t0) / duration, 1);
    pct = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
    buildPct.textContent = pct;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Partikel: Staub beim Absetzen, Funken beim Hammerschlag */
function burst(x, y, { n, colors, spread, rise, size = [3, 7], life = [500, 850] }) {
  for (let i = 0; i < n; i++) {
    const bit = make('span', 'fx-bit', buildFx);
    const s = size[0] + Math.random() * (size[1] - size[0]);
    const bx = typeof x === 'function' ? x() : x;
    bit.style.cssText = `width:${s}px;height:${s}px;background:${colors[i % colors.length]};translate:${bx}px ${y}px`;
    const dx = (Math.random() - .5) * spread, dy = -(rise * (.4 + Math.random() * .6));
    bit.animate([
      { transform: 'translate(0,0) scale(1)', opacity: .95 },
      { transform: `translate(${dx * .7}px,${dy}px) scale(1.1)`, opacity: .8, offset: .5 },
      { transform: `translate(${dx}px,${dy * .4 + 14}px) scale(.6)`, opacity: 0 }
    ], { duration: life[0] + Math.random() * (life[1] - life[0]), easing: 'cubic-bezier(.2,.7,.4,1)' })
      .finished.then(() => bit.remove(), () => bit.remove());
  }
}
function shake(px = 3) {
  const kf = [{ transform: 'translate(0,0)' }, { transform: `translate(-${px}px,${px}px)` },
              { transform: `translate(${px * .6}px,-${px * .4}px)` }, { transform: 'translate(0,0)' }];
  buildFrame.animate(kf, { duration: 200, easing: 'ease-out' });
  strips.animate(kf, { duration: 200, easing: 'ease-out' });
}

/* Eine Etage am Kran herablassen und absetzen */
async function lowerFloor(i) {
  const land = g.fy + g.floors[i] - g.slingH - g.hookH;  // Oberkante Haken, wenn die Etage sitzt
  const start = g.cableTop + 6;
  const dy = start - land;
  const maxLen = parseFloat(cable.style.height);
  const opts = { duration: 760, easing: EASE_CRANE, fill: 'forwards' };
  rig.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'forwards' });
  stripEls[i].animate([
    { transform: `translateY(${dy}px)`, opacity: 0 },
    { opacity: 1, offset: .12 },
    { transform: 'translateY(0)', opacity: 1 }
  ], opts);
  rig.animate([{ transform: `translateY(${start}px)` }, { transform: `translateY(${land}px)` }], opts);
  await cable.animate([
    { transform: `scaleY(${(start - g.cableTop) / maxLen})` },
    { transform: `scaleY(${(land - g.cableTop) / maxLen})` }
  ], opts).finished;
  return { land, start, maxLen };
}
async function raiseHook({ land, start, maxLen }) {
  const opts = { duration: 420, easing: EASE_IN_OUT, fill: 'forwards' };
  rig.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
  rig.animate([{ transform: `translateY(${land}px)` }, { transform: `translateY(${start}px)` }], opts);
  await cable.animate([
    { transform: `scaleY(${(land - g.cableTop) / maxLen})` },
    { transform: `scaleY(${(start - g.cableTop) / maxLen})` }
  ], opts).finished;
}

/* Zwei Schläge auf die Fuge unter der neuen Etage */
async function hammerSeam(tx, ty, first) {
  const [x, y] = hammerPos([tx, ty]);
  if (first) {
    hx = x + 60; hy = y - 50; angle = -35;
    hammer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
  }
  await Promise.all([moveHammer(x, y, first ? 360 : 300), swing(-35, 300, EASE_IN_OUT)]);
  for (let k = 0; k < 2; k++) {
    await swing(k ? -40 : -18, 120, EASE_OUT);
    await swing(-90, 85, EASE_STRIKE);
    const ring = make('span', 'fx-ring', buildFx);
    ring.style.translate = `${tx}px ${ty}px`;
    ring.animate([{ transform: 'scale(.3)', opacity: .9 }, { transform: 'scale(1.3)', opacity: 0 }],
      { duration: 380, easing: EASE_OUT }).finished.then(() => ring.remove(), () => ring.remove());
    burst(tx, ty, { n: 7, colors: ['#e0412b', '#e0412b', '#121212'], spread: 70, rise: 40, size: [2, 5], life: [380, 600] });
    await swing(-76, 90, EASE_OUT);
  }
}

function cancelAll() {
  [build, buildFx, buildFrame, strips, crane, cable, rig, hammer, hammerSvg, buildReal, buildPlan, ...stripEls,
   ...buildPlan.querySelectorAll('.p-draw, .p-pop')]
    .forEach(el => el.getAnimations().forEach(a => a.cancel()));
  buildFx.querySelectorAll('.fx-bit, .fx-ring').forEach(el => el.remove());
}

function resetBuild() {
  runId++;
  cancelAll();
  angle = -35; hx = 0; hy = 0; pct = 0;
  buildPct.textContent = '0';
  buildPhase.textContent = 'Plan';
  buildReplay.hidden = true;
  build.classList.remove('is-done', 'is-building');
}

function finishBuild() {
  runId++;
  running = false;
  cancelAll();
  pct = 100;
  buildPct.textContent = '100';
  buildPhase.textContent = 'Fertig';
  build.classList.remove('is-building');
  build.classList.add('is-done');
  buildReplay.hidden = false;
}

async function runBuild() {
  resetBuild();
  const id = runId;
  const alive = () => id === runId;
  running = true;
  g = measure();
  drawCrane(); drawRig(); buildStrips();
  hammer.style.setProperty('--hs', Math.round(Math.min(Math.max(g.W * 0.065, 46), 92)) + 'px');
  const plan = buildPlan.querySelector(mobile.matches ? '.plan-mob' : '.plan-desk');

  try {
    // 1. Plan zeichnen, Kran fährt auf
    plan.querySelectorAll('.p-draw').forEach((el, i) => el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
      { duration: 650, delay: i * 18, easing: EASE_IN_OUT, fill: 'forwards' }));
    plan.querySelectorAll('.p-pop').forEach((el, i) => el.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: 360, delay: 280 + i * 16, easing: 'ease-out', fill: 'forwards' }));
    crane.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
      { duration: 700, delay: 250, easing: EASE_OUT, fill: 'forwards' });
    await wait(1150); if (!alive()) return;

    // 2. Etage für Etage, von unten nach oben
    build.classList.add('is-building');
    const total = stripEls.length;
    let hammering = Promise.resolve();
    for (let k = 0; k < total; k++) {
      const i = total - 1 - k;
      buildPhase.textContent = `Etage ${k + 1} von ${total}`;
      const pos = await lowerFloor(i); if (!alive()) return;
      // Absetzen: kurz nachfedern, Staub entlang der Kante
      stripEls[i].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }],
        { duration: 170, easing: 'ease-out' });
      shake(2.5);
      const edge = g.fy + g.floors[i + 1];
      burst(() => g.fx + Math.random() * g.fw, edge,
        { n: mobile.matches ? 14 : 22, colors: ['#d6d2c8', '#bdb8ad', '#cfcac0', '#121212'], spread: 50, rise: 26 });
      countTo(Math.round((k + 1) / total * 100));
      await hammering; if (!alive()) return;
      hammering = hammerSeam(g.fx + g.fw * (mobile.matches ? .16 : .1), edge - 1, k === 0)
        .catch(e => { if (e.name !== 'AbortError') throw e; });
      await raiseHook(pos); if (!alive()) return;
    }
    await hammering; if (!alive()) return;

    // 3. Baustelle räumen, fertige Seite steht
    buildPhase.textContent = 'Fertig';
    build.classList.remove('is-building');
    const out = { duration: 650, easing: 'ease-out', fill: 'forwards' };
    buildReal.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1, fill: 'forwards' });
    await Promise.all([
      buildPlan.animate([{ opacity: 1 }, { opacity: 0 }], out).finished,
      buildFx.animate([{ opacity: 1 }, { opacity: 0 }], out).finished,
      crane.animate([{ transform: 'none' }, { transform: 'translateY(14px)' }], out).finished,
    ]);
    if (!alive()) return;
    finishBuild();
  } catch (e) {
    // abgebrochene Animation, z. B. durch "Nochmal bauen" – der neue Lauf übernimmt
    if (e.name !== 'AbortError') throw e;
  }
}

if (reduceMotion || !('IntersectionObserver' in window)) {
  buildPct.textContent = '100';
  buildPhase.textContent = 'Fertig';
} else {
  build.classList.add('build--js');
  const bio = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    bio.disconnect();
    runBuild();
  }, { threshold: 0.4 });
  bio.observe(buildFrame);
  buildReplay.addEventListener('click', runBuild);
  // Grösse ändert sich während des Baus: direkt fertig zeigen statt schief weiterbauen
  let lastW = innerWidth;
  window.addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    if (running) finishBuild();
  }, { passive: true });
}

/* Porträt: wird beim Hineinscrollen vom Plan (s/w) zum Foto (Farbe) */
const portrait = document.getElementById('portrait');
if ('IntersectionObserver' in window && !reduceMotion) {
  const pio = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    portrait.classList.add('in');
    setTimeout(() => portrait.classList.add('done'), 1900);
    pio.disconnect();
  }, { threshold: 0.35 });
  pio.observe(portrait);
}

/* Kontaktformular — Web3Forms, sendet an sitearchitects.dn@gmail.com */
const WEB3FORMS_ACCESS_KEY = '9736c20e-ec9a-40d1-bb36-e501ce869348';

const contactForm = document.getElementById('contactForm');
const cfSuccess   = document.getElementById('cfSuccess');
const cfError     = document.getElementById('cfError');
const cfSubmit    = document.getElementById('cfSubmit');

contactForm.addEventListener('input', e => e.target.removeAttribute('aria-invalid'));

contactForm.addEventListener('submit', async e => {
  e.preventDefault();

  const name    = contactForm.elements.name.value.trim();
  const email   = contactForm.elements.email.value.trim();
  const project = contactForm.elements.project.value;
  const message = contactForm.elements.message.value.trim();

  const invalid = field => {
    const el = contactForm.elements[field];
    el.removeAttribute('aria-invalid');
    void el.offsetWidth; // Animation neu starten, auch beim zweiten Versuch
    el.setAttribute('aria-invalid', 'true');
    el.focus();
  };
  if (!name)    return invalid('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return invalid('email');
  if (!message) return invalid('message');

  cfSubmit.disabled = true;
  cfSubmit.querySelector('span').textContent = 'Wird gesendet…';
  cfError.classList.remove('show');

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Neue Anfrage von ${name} – Site Architects`,
        from_name: 'Site Architects Webformular',
        name,
        email,
        project: project || '(nicht angegeben)',
        message
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Fehler beim Senden');
    cfSuccess.classList.add('show');
    cfSubmit.hidden = true;
    contactForm.reset();
  } catch {
    cfSubmit.disabled = false;
    cfSubmit.querySelector('span').textContent = 'Nachricht senden';
    cfError.classList.add('show');
  }
});
