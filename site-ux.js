// Site-wide polish: gentle reveal on scroll, second photo on card hover,
// and the mobile "Request to book" bar. Everything is visible without this script.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Reveal sections as they scroll into view ----
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 200));
  if (!reduce && 'IntersectionObserver' in window) idle(() => {
    const targets = [...document.querySelectorAll(
      'main .section-heading, main .property-card, main .plan-card, main .review-layout, main .plan-note,' +
      ' main .trust-grid > *, main .date-search, main .page-intro, main .steps > li, main .accordion,' +
      ' main .property-body > section, main .stack .card, main .legal-content > section, main .owner-checklist, main .closing'
    )].filter(el => !el.closest('.hero, dialog'));
    const vh = innerHeight;
    // Anything already on screen stays put; only content below the fold animates in.
    const below = targets.filter(el => el.getBoundingClientRect().top > vh * 0.92);
    if (below.length) {
      document.documentElement.classList.add('rv-ready');
      below.forEach(el => el.classList.add('rv'));
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const el = e.target;
          // stagger siblings in the same row (cards, plans)
          const sibs = [...el.parentElement.children].filter(c => c.classList.contains('rv') && !c.classList.contains('in'));
          el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 4) * 70}ms`;
          el.classList.add('in');
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      below.forEach(el => io.observe(el));
    }
  });

  // ---- Listing cards: show the home's second photo on hover (mouse only) ----
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.property-photo[data-alt-src]').forEach(link => {
      const src = link.dataset.altSrc;
      if (!src) return;
      let alt = null;
      link.addEventListener('mouseenter', () => {
        if (alt) return;
        alt = new Image();
        alt.className = 'card-alt';
        alt.alt = '';
        alt.decoding = 'async';
        alt.onload = () => link.classList.add('has-alt');
        alt.src = src;
        link.appendChild(alt);
      }, { once: false });
    });
  }

  // ---- Mobile "Request to book" bar on property pages ----
  const bar = document.querySelector('[data-book-bar]');
  const panel = document.getElementById('book');
  if (bar && panel && 'IntersectionObserver' in window) {
    const gallery = document.querySelector('[data-gallery]');
    let pastGallery = false, panelVisible = false;
    const sync = () => bar.classList.toggle('is-on', pastGallery && !panelVisible);
    new IntersectionObserver(([e]) => { panelVisible = e.isIntersecting; sync(); }).observe(panel);
    if (gallery) new IntersectionObserver(([e]) => { pastGallery = !e.isIntersecting && e.boundingClientRect.top < 0; sync(); }).observe(gallery);
    bar.querySelector('a').addEventListener('click', e => {
      e.preventDefault();
      panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      const first = panel.querySelector('[data-avail]:not([hidden]) .avail-day:not([disabled]), [data-checkin]');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), reduce ? 0 : 500);
    });
  }
})();
