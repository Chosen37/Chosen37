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
  const ci = params.get('checkin'), co = params.get('checkout');
  const requestedGuests = params.get('guests');
  const guests = /^[1-6]$/.test(requestedGuests || '') ? requestedGuests : null;
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
  const description = document.createElement('p');
  const range = document.createElement('strong');
  range.textContent = `${short(ci)} – ${short(co)}`;
  description.append(range, ` · ${nights} night${nights === 1 ? '' : 's'}`);
  if (guests) description.append(` · ${guests} guest${guests === '1' ? '' : 's'}`);
  const clear = document.createElement('a');
  clear.href = 'stays.html';
  clear.textContent = 'Clear dates';
  intro.append(description, clear);
  const grid = document.querySelector('.property-grid-full');
  grid.parentElement.insertBefore(intro, grid);

  fetch('data/availability.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : { properties: {} }))
    .catch(() => ({ properties: {} }))
    .then(data => {
      const all = data.properties || {};
      cards.forEach(card => {
        const ranges = all[card.id];
        const badge = document.createElement('p');
        badge.className = 'date-badge';
        // Long-term rentals already carry their own label on the card.
        if (card.querySelector('.lt-tag')) return;
        if (!ranges) {
          badge.classList.add('is-ask');
          badge.textContent = 'Request these dates';
        } else if (ranges.some(([s, e]) => s < co && e > ci)) {
          badge.classList.add('is-booked');
          badge.textContent = 'Booked for these dates';
          card.classList.add('is-unavailable');
        } else {
          badge.classList.add('is-open');
          badge.textContent = 'No calendar block for these dates';
        }
        card.querySelector('.property-copy').prepend(badge);
      });
      const note = document.createElement('p');
      note.className = 'date-note';
      note.textContent = 'Your host confirms availability and the total price when you request dates.';
      intro.appendChild(note);
    });
})();
