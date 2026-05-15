/* ===== THEME TOGGLE ===== */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('.theme-toggle__icon');

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeIcon.textContent = '☾';
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeIcon.textContent = isDark ? '☾' : '☀';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

/* ===== BURGER MENU ===== */
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

burger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

/* ===== ACTIVE NAV LINKS ===== */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const active = document.querySelector(`.nav__links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -50% 0px' });

sections.forEach(s => sectionObserver.observe(s));

/* ===== ANIMATED COUNTERS ===== */
const counters = document.querySelectorAll('.stat-card__num[data-target]');

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const el = entry.target;
    const target = parseInt(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    let startTime = null;
    const duration = 1400;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.6 });

counters.forEach(c => counterObserver.observe(c));

/* ===== FAQ ACCORDION ===== */
document.querySelectorAll('.faq-item__q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

    if (!isOpen) item.classList.add('open');
  });
});

/* ===== CALCULATOR ===== */
let selectedType = null;
let basePrice = 0;
let baseWeeks = '';

document.querySelectorAll('.calc__option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.calc__option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedType = btn.dataset.type;
    basePrice = parseInt(btn.dataset.price);
    baseWeeks = btn.dataset.weeks;
    updateCalc();
  });
});

document.querySelectorAll('.calc__feature input').forEach(cb => {
  cb.addEventListener('change', updateCalc);
});

function updateCalc() {
  if (!selectedType) return;

  let total = basePrice;
  document.querySelectorAll('.calc__feature input:checked').forEach(cb => {
    total += parseInt(cb.dataset.price);
  });

  document.querySelector('.calc__result-placeholder').style.display = 'none';
  const content = document.querySelector('.calc__result-content');
  content.style.display = 'block';

  animatePrice(document.getElementById('calcPrice'), total);
  document.getElementById('calcWeeks').textContent = baseWeeks + ' нед.';
}

function animatePrice(el, target) {
  const current = parseInt(el.textContent.replace(/\D/g, '')) || 0;
  const diff = target - current;
  const steps = 20;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    const value = Math.round(current + diff * (step / steps));
    el.textContent = '$' + value.toLocaleString();
    if (step >= steps) clearInterval(interval);
  }, 16);
}

/* ===== SUPABASE CONFIG ===== */
const _sb = supabase.createClient(
  'https://egadgmckwldootwcuyav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWRnbWNrd2xkb290d2N1eWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjcwMzUsImV4cCI6MjA5NDQ0MzAzNX0.XVIuhcVEveqsLN-xZgOSDJfua5Mbqhv6LiM8M30Q0Co'
);

/* ===== CONTACT FORM ===== */
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const name = form.querySelector('[name="name"]').value.trim();
  const description = form.querySelector('[name="description"]').value.trim();

  if (!name || !description) {
    const emptyField = !name
      ? form.querySelector('[name="name"]')
      : form.querySelector('[name="description"]');
    emptyField.focus();
    emptyField.style.boxShadow = '4px 4px 0 #FF3131';
    setTimeout(() => { emptyField.style.boxShadow = ''; }, 1500);
    return;
  }

  const btn = form.querySelector('button[type=submit]');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '...';

  const payload = {
    name,
    company:      form.querySelector('[name="company"]').value.trim() || null,
    description,
    contact_pref: form.querySelector('[name="contact"]:checked')?.value || null,
    source:       'contact_form',
    status:       'lead',
  };

  const { error } = await _sb.from('contacts').insert(payload);
  if (error) console.warn('CRM insert:', error.message);

  btn.textContent = '✓ Заявка отправлена!';
  btn.style.background = '#22c55e';

  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
    btn.style.background = '';
    form.reset();
  }, 3500);
});

/* ===== STICKY CTA — hide near contact ===== */
const contactSection = document.getElementById('contact');
const stickyCta = document.getElementById('stickyCta');

const stickyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    stickyCta.style.display = entry.isIntersecting ? 'none' : '';
  });
}, { rootMargin: '0px 0px -20% 0px' });

stickyObserver.observe(contactSection);

/* ===== SCROLL REVEAL (light entrance animation) ===== */
const revealEls = document.querySelectorAll(
  '.stat-card, .problem-card, .principle-card, .service-card, .case-card, .pricing-card, .process-step'
);

const style = document.createElement('style');
style.textContent = `
  .reveal-ready { opacity: 0; transform: translateY(16px); transition: opacity 0.45s ease, transform 0.45s ease; }
  .reveal-visible { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(style);

revealEls.forEach((el, i) => {
  el.classList.add('reveal-ready');
  el.style.transitionDelay = `${(i % 4) * 60}ms`;
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('reveal-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

revealEls.forEach(el => revealObserver.observe(el));
