// Date search: the homepage form sends dates to the stays page, which marks each
// home as open or booked using the synced Airbnb calendars.
(() => {
  const DAY = 86400000;
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const parse = s => new Date(s + 'T12:00:00');
  const addDays = (s, n) => iso(new Date(parse(s).getTime() + n * DAY));
  const short = s => parse(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const today = iso(new Date());

  // ---- Homepage search form ----
  const form = document.querySelector('[data-date-search]');
  if (form) {
    const a = form.elements.checkin, b = form.elements.checkout;
    a.min = today; b.min = addDays(today, 1);
    a.addEventListener('change', () => {
      if (a.value) { b.min = addDays(a.value, 1); if (b.value && b.value <= a.value) b.value = ''; if (!b.value) b.focus(); }
    });
    form.addEventListener('submit', e => {
      if (!a.value || !b.value || b.value <= a.value || a.value < today) {
        e.preventDefault();
        (a.value && a.value >= today ? b : a).focus();
        (a.value && a.value >= today ? b : a).reportValidity();
      }
    });
  }

  // ---- Stays page: show which homes are open for the chosen dates ----
  const params = new URLSearchParams(location.search);
  const ci = params.get('checkin'), co = params.get('checkout'), guests = params.get('guests');
  const cards = [...document.querySelectorAll('.property-grid-full .property-card')];
  if (!cards.length || !valid(ci) || !valid(co) || co <= ci) return;

  const nights = Math.round((parse(co) - parse(ci)) / DAY);
  const carry = new URLSearchParams({ checkin: ci, checkout: co, ...(guests ? { guests } : {}) }).toString();

  // Carry the dates into each home's page so its booking form is pre-filled.
  cards.forEach(card => card.querySelectorAll('a[href^="stay-"]').forEach(link => {
    const [path] = link.getAttribute('href').split('?');
    link.setAttribute('href', `${path}?${carry}`);
  }));

  const intro = document.createElement('div');
  intro.className = 'date-results';
  intro.setAttribute('role', 'status');
  intro.innerHTML = `<p><strong>${short(ci)} – ${short(co)}</strong> · ${nights} night${nights === 1 ? '' : 's'}${guests ? ` · ${guests} guest${guests === '1' ? '' : 's'}` : ''}</p><a href="stays.html">Clear dates</a>`;
  const grid = document.querySelector('.property-grid-full');
  grid.parentElement.insertBefore(intro, grid);

  fetch('data/availability.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : { properties: {} }))
    .catch(() => ({ properties: {} }))
    .then(data => {
      const all = data.properties || {};
      let open = 0;
      cards.forEach(card => {
        const ranges = all[card.id];
        const badge = document.createElement('p');
        badge.className = 'date-badge';
        if (!ranges) {
          badge.classList.add('is-ask');
          badge.textContent = 'Request these dates';
        } else if (ranges.some(([s, e]) => s < co && e > ci)) {
          badge.classList.add('is-booked');
          badge.textContent = 'Booked for these dates';
          card.classList.add('is-unavailable');
        } else {
          badge.classList.add('is-open');
          badge.textContent = 'Open for your dates';
          open++;
        }
        card.querySelector('.property-copy').prepend(badge);
      });
      const note = document.createElement('p');
      note.className = 'date-note';
      note.textContent = open
        ? `${open} home${open === 1 ? ' is' : 's are'} confirmed open. Others can be requested and we will check them for you.`
        : 'Send a request for any home and we will confirm availability for these dates.';
      intro.appendChild(note);
    });
})();
