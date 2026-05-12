/* ═══════════════════════════════════════════════════════
   Site Architects — script.js
═══════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────────────
   PRELOADER
───────────────────────────────────────────────────── */
const preloader = document.getElementById('preloader');
const preCount  = document.getElementById('preCount');
const preRing   = document.getElementById('preRing');
const CIRC      = 2 * Math.PI * 46; // circumference of r=46 circle

let progress = 0;
const totalDuration = 1800; // ms
const interval = 18;
const steps = totalDuration / interval;
const increment = 100 / steps;

const preTimer = setInterval(() => {
  progress = Math.min(progress + increment + Math.random() * 0.8, 100);
  const pct = Math.floor(progress);
  preCount.textContent = pct + '%';
  // ring offset: from CIRC (empty) to 0 (full)
  preRing.style.strokeDashoffset = CIRC - (CIRC * pct / 100);

  if (progress >= 100) {
    clearInterval(preTimer);
    setTimeout(() => {
      preloader.classList.add('done');
      document.body.classList.remove('loading');
      revealHero();
    }, 300);
  }
}, interval);

document.body.classList.add('loading');

/* ─────────────────────────────────────────────────────
   HERO REVEAL (after preloader)
───────────────────────────────────────────────────── */
function revealHero() {
  // Staggered word reveals
  document.querySelectorAll('[data-reveal]').forEach(el => {
    const delay = parseInt(el.dataset.revealDelay || 0);
    setTimeout(() => el.classList.add('revealed'), delay + 100);
  });
}

/* ─────────────────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const delay = parseInt(e.target.dataset.revealDelay || 0);
      setTimeout(() => e.target.classList.add('revealed'), delay);
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

// Observe non-hero [data-reveal] elements
document.querySelectorAll('[data-reveal]').forEach(el => {
  if (!el.closest('.hero')) revealObserver.observe(el);
});

/* ─────────────────────────────────────────────────────
   CUSTOM CURSOR
───────────────────────────────────────────────────── */
const cursor     = document.getElementById('cursor');
const cursorDot  = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
const cursorLabel= document.getElementById('cursorLabel');

let mx = -100, my = -100;
let rx = -100, ry = -100;

// Dot follows immediately
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursorDot.style.left  = mx + 'px';
  cursorDot.style.top   = my + 'px';
});

// Ring lags behind (lerp)
function lerpCursor() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  cursorRing.style.left = rx + 'px';
  cursorRing.style.top  = ry + 'px';
  cursorLabel.style.left = rx + 'px';
  cursorLabel.style.top  = ry + 'px';
  requestAnimationFrame(lerpCursor);
}
lerpCursor();

// Interactive elements
document.addEventListener('mouseover', e => {
  const tgt = e.target.closest('[data-cursor], .mag-btn, a, button, .srv__item-top');
  if (!tgt) { cursor.classList.remove('expanded','has-label'); cursorLabel.textContent=''; return; }
  cursor.classList.add('expanded');
  const label = tgt.dataset.cursor;
  if (label) { cursorLabel.textContent = label; cursor.classList.add('has-label'); }
  else { cursorLabel.textContent=''; cursor.classList.remove('has-label'); }
});

document.addEventListener('mouseleave', () => cursor.classList.add('hidden'));
document.addEventListener('mouseenter', () => cursor.classList.remove('hidden'));

/* Magnetic buttons */
document.querySelectorAll('.mag-btn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const r  = btn.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    const dx = (e.clientX - cx) * 0.28;
    const dy = (e.clientY - cy) * 0.28;
    btn.style.transform = `translate(${dx}px,${dy}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

/* ─────────────────────────────────────────────────────
   NAV — scroll behaviour
───────────────────────────────────────────────────── */
const nav = document.getElementById('nav');
const menuBtn = document.getElementById('menuBtn');
const overlayMenu = document.getElementById('overlayMenu');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

/* ─────────────────────────────────────────────────────
   FULLSCREEN MENU
───────────────────────────────────────────────────── */
menuBtn.addEventListener('click', () => {
  const open = overlayMenu.classList.toggle('open');
  menuBtn.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

document.querySelectorAll('[data-menu-link]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const href = link.getAttribute('href');
    overlayMenu.classList.remove('open');
    menuBtn.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  });
});

/* ─────────────────────────────────────────────────────
   BLUEPRINT CANVAS (architectural grid)
───────────────────────────────────────────────────── */
const canvas = document.getElementById('blueprint');
const ctx    = canvas.getContext('2d');

function drawBlueprint() {
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  const w = canvas.width, h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background tint
  ctx.fillStyle = 'rgba(10,20,35,0.6)';
  ctx.fillRect(0, 0, w, h);

  const gridStep = 48;

  // Minor grid
  ctx.strokeStyle = 'rgba(43,196,180,0.04)';
  ctx.lineWidth = .5;
  for (let x = 0; x <= w; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Major grid (every 5)
  ctx.strokeStyle = 'rgba(43,196,180,0.07)';
  ctx.lineWidth = .8;
  for (let x = 0; x <= w; x += gridStep * 5) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += gridStep * 5) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Cross markers
  ctx.strokeStyle = 'rgba(43,196,180,0.14)';
  ctx.lineWidth = 1;
  const crossSize = 6;
  for (let x = gridStep * 5; x < w; x += gridStep * 5) {
    for (let y = gridStep * 5; y < h; y += gridStep * 5) {
      ctx.beginPath();
      ctx.moveTo(x - crossSize, y); ctx.lineTo(x + crossSize, y);
      ctx.moveTo(x, y - crossSize); ctx.lineTo(x, y + crossSize);
      ctx.stroke();
    }
  }

  // Diagonal accent line (blueprint style)
  ctx.strokeStyle = 'rgba(43,196,180,0.05)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 12]);
  ctx.beginPath();
  ctx.moveTo(w * 0.55, 0); ctx.lineTo(w, h * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.45, 0); ctx.lineTo(0, h * 0.6);
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner annotations
  ctx.font = '10px "DM Mono", monospace';
  ctx.fillStyle = 'rgba(43,196,180,0.22)';
  const annotations = [
    [gridStep, gridStep * 3, 'A-01'],
    [w - gridStep * 4, gridStep * 3, 'B-01'],
    [gridStep, h - gridStep * 3, 'A-02'],
    [w - gridStep * 4, h - gridStep * 3, 'B-02'],
  ];
  annotations.forEach(([x, y, label]) => {
    // Small rectangle
    ctx.strokeStyle = 'rgba(43,196,180,0.1)';
    ctx.lineWidth = .8;
    ctx.strokeRect(x - 4, y - 14, 36, 18);
    ctx.fillText(label, x, y);
  });
}

drawBlueprint();
window.addEventListener('resize', drawBlueprint, { passive: true });

/* ─────────────────────────────────────────────────────
   SERVICES ACCORDION
───────────────────────────────────────────────────── */
document.querySelectorAll('.srv__item').forEach(item => {
  item.querySelector('.srv__item-top').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.srv__item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ─────────────────────────────────────────────────────
   CONTACT FORM — Web3Forms
   Formular sendet E-Mails an: sitearchitects.dn@gmail.com
   
   SETUP (einmalig, kostenlos):
   1. Gehe zu https://web3forms.com
   2. Gib "hello@sitearchitects.ch" ein → "Create Access Key"
   3. Du erhältst einen Access Key per E-Mail
   4. Ersetze WEB3FORMS_ACCESS_KEY unten mit deinem Key
───────────────────────────────────────────────────── */
const WEB3FORMS_ACCESS_KEY = '9736c20e-ec9a-40d1-bb36-e501ce869348';

const contactForm = document.getElementById('contactForm');
const cfSuccess   = document.getElementById('cfSuccess');
const cfError     = document.getElementById('cfError');
const cfSubmit    = document.getElementById('cfSubmit');

contactForm.addEventListener('submit', async e => {
  e.preventDefault();

  const name    = contactForm.querySelector('[name=name]').value.trim();
  const email   = contactForm.querySelector('[name=email]').value.trim();
  const project = contactForm.querySelector('[name=project]').value;
  const message = contactForm.querySelector('[name=message]').value.trim();

  if (!name || !email || !message) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    contactForm.querySelector('[name=email]').focus(); return;
  }

  cfSubmit.disabled = true;
  cfSubmit.querySelector('span').textContent = 'Wird gesendet…';
  if (cfError) cfError.classList.remove('show');

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Neue Anfrage von ${name} — Site Architects`,
        from_name: 'Site Architects Webformular',
        name,
        email,
        project: project || '(nicht angegeben)',
        message
      })
    });
    const data = await res.json();
    if (data.success) {
      cfSuccess.classList.add('show');
      cfSubmit.style.display = 'none';
      contactForm.reset();
    } else {
      throw new Error(data.message || 'Fehler beim Senden');
    }
  } catch {
    cfSubmit.disabled = false;
    cfSubmit.querySelector('span').textContent = 'Anfrage senden';
    if (cfError) cfError.classList.add('show');
  }
});

/* ─────────────────────────────────────────────────────
   PARALLAX (subtle hero glow offset on scroll)
───────────────────────────────────────────────────── */
let scrollTick = false;
window.addEventListener('scroll', () => {
  if (!scrollTick) {
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const logo = document.querySelector('.hero__logo-embed img');
      if (logo) logo.style.transform = `translateY(${y * 0.08}px)`;
      scrollTick = false;
    });
    scrollTick = true;
  }
}, { passive: true });

/* ─────────────────────────────────────────────────────
   NAV LOGO — smooth scroll to top
───────────────────────────────────────────────────── */
document.querySelector('.nav__logo').addEventListener('click', e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─────────────────────────────────────────────────────
   HERO CTA smooth scroll
───────────────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});
