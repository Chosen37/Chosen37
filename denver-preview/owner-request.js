// Owner proposal form: preselect the plan from ?plan=, return to this site after sending.
(() => {
  const form = document.querySelector('[data-owner-request]');
  if (!form) return;
  const next = form.querySelector('[data-next]');
  if (next) next.value = new URL('proposal-sent.html', location.href).href;
  const plan = new URLSearchParams(location.search).get('plan');
  if (plan) {
    const opt = form.querySelector(`option[data-plan="${CSS.escape(plan)}"]`);
    if (opt) opt.selected = true;
  }
  form.addEventListener('submit', () => {
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending…';
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Request my proposal'; }, 8000);
  });
})();
