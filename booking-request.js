// Booking request form: date checks, stay length, and an email fallback.
(() => {
  const EMAIL = 'vailbreezeproperties@gmail.com';
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const nightsBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const pretty = s => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

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
        nightsOut.textContent = 'Select dates to see your stay length.';
        nightsField.value = '';
      }
    }
    checkin.addEventListener('change', () => { update(); if (checkin.value && !checkout.value) checkout.focus(); });
    checkout.addEventListener('change', update);

    function problem() {
      if (!checkin.value || !checkout.value) return 'Choose your check-in and checkout dates.';
      if (checkin.value < today) return 'Check-in can’t be in the past.';
      if (checkout.value <= checkin.value) return 'Checkout must be after check-in.';
      return '';
    }

    form.addEventListener('submit', e => {
      const msg = problem();
      if (msg) { e.preventDefault(); error.textContent = msg; error.hidden = false; checkin.focus(); return; }
      error.hidden = true;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Sending…';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Send booking request'; }, 8000);
    });

    form.querySelector('[data-request-email]').addEventListener('click', () => {
      const msg = problem();
      if (msg) { error.textContent = msg; error.hidden = false; return; }
      error.hidden = true;
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
  });
})();
