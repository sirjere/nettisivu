(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('main-nav');

  // Header background on scroll
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const setMenu = (open) => {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Sulje valikko' : 'Avaa valikko');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(!header.classList.contains('nav-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.section-head, .room-card, .service, .g, .reviews blockquote, .about-text, .about-visual, .booking-form, .facts');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
  }

  // Booking form
  const form = document.getElementById('booking-form');
  const checkin = document.getElementById('checkin');
  const checkout = document.getElementById('checkout');
  const room = document.getElementById('room');
  const guests = document.getElementById('guests');
  const summary = document.getElementById('summary');
  const errorEl = document.getElementById('form-error');
  const success = document.getElementById('form-success');

  const toISO = (d) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  };
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  checkin.min = toISO(today);
  checkout.min = toISO(tomorrow);

  const nightsBetween = () => {
    if (!checkin.value || !checkout.value) return 0;
    const ms = new Date(checkout.value) - new Date(checkin.value);
    return Math.round(ms / 86400000);
  };
  const fmt = new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const updateSummary = () => {
    const nights = nightsBetween();
    if (nights <= 0) {
      summary.textContent = 'Valitse päivämäärät nähdäksesi hinnan.';
      return;
    }
    const price = Number(room.selectedOptions[0].dataset.price);
    const roomName = room.selectedOptions[0].textContent.split(' – ')[0];
    summary.innerHTML = `${roomName}, ${nights} ${nights === 1 ? 'yö' : 'yötä'}, ${guests.value} ${guests.value === '1' ? 'henkilö' : 'henkilöä'}<br>Yhteensä <strong>${fmt.format(price * nights)}</strong> (sis. aamiaisen)`;
  };

  checkin.addEventListener('change', () => {
    if (checkin.value) {
      const next = new Date(checkin.value); next.setDate(next.getDate() + 1);
      checkout.min = toISO(next);
      if (!checkout.value || checkout.value <= checkin.value) checkout.value = toISO(next);
    }
    updateSummary();
  });
  [checkout, room, guests].forEach((el) => el.addEventListener('change', updateSummary));

  // "Varaa" buttons on room cards preselect the room
  document.querySelectorAll('[data-room]').forEach((btn) => {
    btn.addEventListener('click', () => { room.value = btn.dataset.room; updateSummary(); });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));

    const problems = [];
    const mark = (el, msg) => { el.classList.add('invalid'); problems.push(msg); };

    if (!checkin.value) mark(checkin, 'saapumispäivä');
    if (!checkout.value || nightsBetween() <= 0) mark(checkout, 'lähtöpäivä saapumisen jälkeen');
    const name = form.elements.name;
    const email = form.elements.email;
    if (!name.value.trim()) mark(name, 'nimi');
    if (!email.validity.valid || !email.value) mark(email, 'kelvollinen sähköpostiosoite');

    if (problems.length) {
      errorEl.textContent = 'Tarkista seuraavat kentät: ' + problems.join(', ') + '.';
      form.querySelector('.invalid').focus();
      return;
    }

    // Demo: no backend – show confirmation
    success.hidden = false;
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
