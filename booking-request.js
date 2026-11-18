// Booking request form: availability calendar synced from Airbnb, date checks,
// stay length, and an email fallback.
(() => {
  const EMAIL = 'vailbreezeproperties@gmail.com';
  const DAY = 86400000;
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const parse = s => new Date(s + 'T12:00:00');
  const addDays = (s, n) => iso(new Date(parse(s).getTime() + n * DAY));
  const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
  const pretty = s => parse(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const monthName = d => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  document.querySelectorAll('[data-request]').forEach(form => {
    const checkin = form.querySelector('[data-checkin]');
    const checkout = form.querySelector('[data-checkout]');
    const nightsOut = form.querySelector('[data-nights]');
    const nightsField = form.querySelector('[data-nights-field]');
    const error = form.querySelector('[data-request-error]');
    const today = iso(new Date());
    checkin.min = today;
    checkout.min = addDays(today, 1);

    // Return to the confirmation page on this same site after sending.
    const next = form.querySelector('[data-next]');
    if (next) next.value = new URL('request-sent.html', location.href).href;

    // ---- Booked nights from the Airbnb calendar sync ----
    let cal = null;            // the availability calendar, once loaded
    let booked = [];            // [[start, end), ...] ISO strings; end = checkout day
    const isBooked = s => booked.some(([a, b]) => s >= a && s < b);
    const rangeFree = (a, b) => !booked.some(([s, e]) => s < b && e > a);
    const firstBookedAfter = s => booked.map(r => r[0]).filter(d => d > s).sort()[0];

    function showError(msg) { error.textContent = msg; error.hidden = !msg; }

    function update() {
      if (checkin.value) {
        checkout.min = addDays(checkin.value, 1);
        if (checkout.value && checkout.value <= checkin.value) checkout.value = '';
      }
      if (checkin.value && checkout.value) {
        const n = nightsBetween(checkin.value, checkout.value);
        nightsOut.textContent = `${n} night${n === 1 ? '' : 's'}: ${pretty(checkin.value)} to ${pretty(checkout.value)}`;
        nightsField.value = String(n);
      } else {
        nightsOut.textContent = checkin.value ? 'Now choose your checkout date.' : 'Select dates to see your stay length.';
        nightsField.value = '';
      }
      if (cal) cal.render();
    }
    checkin.addEventListener('change', () => { showError(''); update(); if (checkin.value && !checkout.value) checkout.focus(); });
    checkout.addEventListener('change', () => { showError(''); update(); });

    // Dates carried over from a date search (stays page or homepage)
    const qs = new URLSearchParams(location.search);
    const qIn = qs.get('checkin'), qOut = qs.get('checkout'), qGuests = qs.get('guests');
    const okDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
    if (okDate(qIn) && okDate(qOut) && qIn >= today && qOut > qIn) {
      checkin.value = qIn; checkout.value = qOut;
      const g = form.querySelector('select[name="Guests"]');
      if (g && qGuests && [...g.options].some(o => o.value === qGuests)) g.value = qGuests;
      update();
    }

    function problem() {
      if (!checkin.value || !checkout.value) return 'Choose your check-in and checkout dates.';
      if (checkin.value < today) return 'Check-in can’t be in the past.';
      if (checkout.value <= checkin.value) return 'Checkout must be after check-in.';
      if (!rangeFree(checkin.value, checkout.value)) return 'Some of those nights are already booked. Please choose dates that are open on the calendar.';
      return '';
    }

    form.addEventListener('submit', e => {
      const msg = problem();
      if (msg) { e.preventDefault(); showError(msg); checkin.focus(); return; }
      showError('');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Sending…';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Send booking request'; }, 8000);
    });

    form.querySelector('[data-request-email]').addEventListener('click', () => {
      const msg = problem();
      if (msg) { showError(msg); return; }
      showError('');
      const v = name => (form.elements[name] && form.elements[name].value || '').trim();
      const lines = [
        `Booking request: ${form.dataset.property}`, '',
        `Check-in: ${pretty(checkin.value)}`, `Checkout: ${pretty(checkout.value)}`,
        `Nights: ${nightsField.value}`, `Guests: ${v('Guests')}`, '',
        `Name: ${v('Name')}`, `Email: ${v('email')}`, `Phone: ${v('Phone') || 'not provided'}`, '',
        `Message: ${v('Message') || 'none'}`, '',
        'I understand this is a request, not a confirmed reservation.'
      ];
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Booking request: ' + form.dataset.property)}&body=${encodeURIComponent(lines.join('\n'))}`;
    });

    // ---- Availability calendar (shown only for homes with a synced calendar) ----
    const box = document.querySelector(`[data-avail][data-property-id="${form.dataset.propertyId}"]`);
    if (!box) return;

    fetch('data/availability.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const ranges = data && data.properties && data.properties[form.dataset.propertyId];
        if (!ranges) return;
        booked = ranges;
        cal = calendar(box, data.updated);
        if (checkin.value && checkout.value && !rangeFree(checkin.value, checkout.value)) {
          showError('Some of your searched nights are already booked here. Pick open dates on the calendar.');
        }
        box.hidden = false;
        cal.render();
      })
      .catch(() => {});

    function calendar(root, updated) {
      const startFrom = checkin.value ? parse(checkin.value) : parse(today);
      let view = new Date(startFrom.getFullYear(), startFrom.getMonth(), 1);
      const maxMonth = new Date(view.getFullYear(), view.getMonth() + 12, 1);
      const when = updated ? new Date(updated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
      root.innerHTML =
        '<div class="avail-head"><button type="button" class="avail-nav" data-prev aria-label="Previous month">‹</button>' +
        '<p class="avail-month" aria-live="polite"></p>' +
        '<button type="button" class="avail-nav" data-next aria-label="Next month">›</button></div>' +
        '<div class="avail-grid" aria-label="Availability"></div>' +
        '<p class="avail-legend"><span class="sw sw-open"></span>Open <span class="sw sw-booked"></span>Booked <span class="sw sw-sel"></span>Your dates</p>' +
        `<p class="avail-sync">Synced with Airbnb${when ? ' · updated ' + when : ''}</p>`;
      const grid = root.querySelector('.avail-grid');
      const label = root.querySelector('.avail-month');
      root.querySelector('[data-prev]').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
      root.querySelector('[data-next]').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });

      function pick(s) {
        showError('');
        const a = checkin.value, b = checkout.value;
        if (!a || b || s <= a) {
          if (isBooked(s)) { showError('That night is booked. Please pick an open date.'); return; }
          checkin.value = s; checkout.value = '';
        } else if (rangeFree(a, s)) {
          checkout.value = s;
        } else {
          showError('Some nights in that range are booked. Choose an earlier checkout or new dates.');
          return;
        }
        update();
      }

      function render() {
        const nowMonth = new Date(parse(today).getFullYear(), parse(today).getMonth(), 1);
        root.querySelector('[data-prev]').disabled = view <= nowMonth;
        root.querySelector('[data-next]').disabled = view >= maxMonth;
        label.textContent = monthName(view);
        const a = checkin.value, b = checkout.value;
        const limit = a && !b ? firstBookedAfter(a) : null;   // the furthest possible checkout
        let html = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<span class="avail-dow">${d}</span>`).join('');
        const first = new Date(view.getFullYear(), view.getMonth(), 1);
        for (let i = 0; i < first.getDay(); i++) html += '<span></span>';
        const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= days; d++) {
          const s = iso(new Date(view.getFullYear(), view.getMonth(), d));
          const past = s < today;
          const busy = isBooked(s);
          const canCheckout = a && !b && s > a && (!limit || s <= limit);
          const disabled = past || (busy && !canCheckout) || (a && !b && limit && s > limit);
          const cls = ['avail-day'];
          if (busy) cls.push('is-booked');
          if (past) cls.push('is-past');
          if (s === a || s === b) cls.push('is-edge');
          if (a && b && s > a && s < b) cls.push('is-range');
          html += `<button type="button" class="${cls.join(' ')}" data-day="${s}"${disabled ? ' disabled' : ''} aria-label="${pretty(s)}${busy ? ', booked' : ''}">${d}</button>`;
        }
        grid.innerHTML = html;
        grid.querySelectorAll('[data-day]').forEach(btn => btn.addEventListener('click', () => pick(btn.dataset.day)));
      }
      return { render };
    }
  });
})();
