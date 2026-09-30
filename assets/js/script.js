/* ═══════════════════════════════════════════════════════
   Site Architects — script.js
═══════════════════════════════════════════════════════ */
'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Navigation: Linie beim Scrollen */
const nav = document.getElementById('nav');

/* Plan → Bau: Die Planzeichnung wird beim Scrollen von links nach rechts
   durch die echte Website ersetzt. */
const build      = document.getElementById('build');
const buildPlan  = document.getElementById('buildPlan');
const buildScan  = document.getElementById('buildScan');
const buildPhase = document.getElementById('buildPhase');
const buildPct   = document.getElementById('buildPct');

function updateBuild() {
  const rect = build.getBoundingClientRect();
  const travel = rect.height - window.innerHeight;
  const raw = travel > 0 ? -rect.top / travel : 0;
  // kurze Ruhezonen am Anfang und Ende, damit Plan und Ergebnis kurz stehen bleiben
  const p = Math.min(Math.max((raw - 0.12) / 0.72, 0), 1);
  const pct = Math.round(p * 100);

  buildPlan.style.setProperty('--p', pct + '%');
  buildScan.style.setProperty('--p', pct + '%');
  buildPct.textContent = pct;
  buildPhase.textContent = pct === 0 ? 'Plan' : pct < 100 ? 'Im Bau' : 'Fertig';
  build.classList.toggle('done', pct >= 100);
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
    if (!reduceMotion) updateBuild();
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
  document.querySelectorAll('.section__head, .phase, .row, .faq, .contact > *, .contact__big')
    .forEach(el => { el.classList.add('reveal'); io.observe(el); });
}

/* Kontaktformular — Web3Forms, sendet an sitearchitects.dn@gmail.com */
const WEB3FORMS_ACCESS_KEY = '9736c20e-ec9a-40d1-bb36-e501ce869348';

const contactForm = document.getElementById('contactForm');
const cfSuccess   = document.getElementById('cfSuccess');
const cfError     = document.getElementById('cfError');
const cfSubmit    = document.getElementById('cfSubmit');

contactForm.addEventListener('submit', async e => {
  e.preventDefault();

  const name    = contactForm.elements.name.value.trim();
  const email   = contactForm.elements.email.value.trim();
  const project = contactForm.elements.project.value;
  const message = contactForm.elements.message.value.trim();

  if (!name)    { contactForm.elements.name.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { contactForm.elements.email.focus(); return; }
  if (!message) { contactForm.elements.message.focus(); return; }

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
