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
      ' main .property-body > section, main .stack .card, main .legal-content > section, main .owner-checklist, main .closing,' +
      ' main .stat, main .how-steps > li, main .hood, main .cc-copy, main .collection-more'
    )].filter(el => !el.closest('.hero, dialog'))
      // Sideways rows on smaller screens scroll horizontally, so their items don't animate in.
      .filter(el => !(el.matches('.property-card') && el.closest('.page-home') && innerWidth <= 700) && !(el.matches('.hood') && innerWidth <= 1100));
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

  // ---- Homepage hero: crossfade through more photos after the page has loaded ----
  const heroBox = document.querySelector('[data-hero-slides]');
  if (heroBox && !reduce) {
    // Note the visitor's first interaction from the start, so rotation can begin right away.
    const evs = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown', 'wheel'];
    let interacted = false, onInteract = null;
    const mark = () => { interacted = true; evs.forEach(ev => removeEventListener(ev, mark, true)); if (onInteract) onInteract(); };
    evs.forEach(ev => addEventListener(ev, mark, { capture: true, passive: true }));
    const sizes = '(max-width: 900px) 100vw, 70vw';
    // After the first photo (Curtis Park Gem): the lobby, then the Mountain View living room.
    const sets = [
      [640, 768, 960, 1440].map(w => `assets/hero-lobby-${w}.webp ${w}w`),
      [640, 1440].map(w => `assets/hero-slide-2-${w}.webp ${w}w`)
    ];
    const extra = sets.map(set => {
      const im = new Image();
      im.className = 'hero-slide';
      im.alt = ''; im.setAttribute('aria-hidden', 'true');
      im.decoding = 'async'; im.width = 1440; im.height = 957;
      im.dataset.srcset = set.join(', ');
      return im;
    });
    const slides = [heroBox.querySelector('img'), ...extra];
    const ready = new Set([0]);
    let i = 0, timer = null, onScreen = true;
    const show = next => {
      const cur = slides[i], nxt = slides[next];
      slides.forEach(s => s.classList.remove('is-prev'));
      cur.classList.remove('is-active'); cur.classList.add('is-prev');
      nxt.classList.remove('is-zoom'); void nxt.offsetWidth; nxt.classList.add('is-zoom', 'is-active');
      setTimeout(() => { cur.classList.remove('is-prev', 'is-zoom'); }, 1900);
      i = next;
    };
    const tick = () => {
      let next = (i + 1) % slides.length;
      while (!ready.has(next) && next !== i) next = (next + 1) % slides.length;
      if (next !== i) show(next);
    };
    const run = () => {
      clearInterval(timer);
      const on = onScreen && !document.hidden;
      timer = on ? setInterval(tick, 6000) : null;
    };
    const start = () => {
      heroBox.setAttribute('data-hero-ready', '');
      // Load the photos one after another so they never compete with each other.
      const loadNext = k => {
        const im = extra[k];
        if (!im) return;
        im.onload = im.onerror = () => { if (im.naturalWidth) ready.add(k + 1); loadNext(k + 1); };
        im.sizes = sizes; im.srcset = im.dataset.srcset;
        heroBox.appendChild(im);
      };
      loadNext(0);
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(heroBox);
      document.addEventListener('visibilitychange', run);
      run();
    };
    // The other photos load and rotate only once the page has loaded and the visitor has
    // interacted (or after 12 seconds), so they never slow the first view or count as it.
    let loaded = false, go = false;
    const begin = () => { if (go || !loaded) return; go = true; idle(start, { timeout: 1500 }); };
    const later = () => {
      loaded = true;
      if (interacted) begin(); else { onInteract = begin; setTimeout(begin, 12000); }
    };
    if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
  }

  // ---- Statement: words brighten one by one as the line scrolls through the screen ----
  const statement = document.querySelector('[data-statement]');
  if (statement && !reduce) idle(() => {
    const words = statement.textContent.trim().split(/\s+/);
    const full = statement.textContent.trim();
    statement.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = full;
    statement.appendChild(sr);
    const spans = words.map((w, i) => {
      const s = document.createElement('span');
      s.textContent = w + (i < words.length - 1 ? ' ' : '');
      s.setAttribute('aria-hidden', 'true');
      statement.appendChild(s);
      return s;
    });
    statement.classList.add('is-split');
    let lit = -1, ticking = false;
    const paint = () => {
      ticking = false;
      const r = statement.getBoundingClientRect();
      const vh = innerHeight;
      // 0 when the block's top reaches 85% of the screen, 1 when its bottom reaches 45%.
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.4)));
      const n = Math.round(p * spans.length);
      if (n === lit) return;
      spans.forEach((s, i) => s.classList.toggle('on', i < n));
      lit = n;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    paint();
  });

  // ---- Numbers band: count up once when it scrolls into view ----
  const counters = [...document.querySelectorAll('[data-count]')];
  if (counters.length && !reduce && 'IntersectionObserver' in window) {
    const band = counters[0].closest('section');
    if (band && band.getBoundingClientRect().top > innerHeight * 0.85) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        counters.forEach(el => {
          const end = parseFloat(el.textContent);
          const dec = (el.textContent.split('.')[1] || '').length;
          if (!isFinite(end)) return;
          const t0 = performance.now(), dur = 1400;
          const step = now => {
            const k = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
            el.textContent = (end * ease).toFixed(dec);
            if (k < 1) requestAnimationFrame(step); else el.textContent = end.toFixed(dec);
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.4 });
      io.observe(band);
    }
  }

  // ---- Guest reviews: arrows and a progress line for the sideways row ----
  const track = document.querySelector('[data-reviews]');
  if (track) {
    const section = track.closest('section');
    const controls = section.querySelector('.gr-controls');
    const prev = section.querySelector('[data-gr-prev]');
    const next = section.querySelector('[data-gr-next]');
    const bar = section.querySelector('.gr-progress i');
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? track.scrollLeft / max : 1;
      if (bar) bar.style.setProperty('--p', (track.clientWidth / track.scrollWidth + p * (1 - track.clientWidth / track.scrollWidth)).toFixed(3));
      if (prev) prev.disabled = track.scrollLeft < 8;
      if (next) next.disabled = track.scrollLeft > max - 8;
    };
    const stepBy = dir => {
      const card = track.querySelector('.gr-card:not(.gr-feature)') || track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
      track.scrollBy({ left: dir * (card.getBoundingClientRect().width + gap), behavior: reduce ? 'auto' : 'smooth' });
    };
    if (controls) controls.hidden = false;
    if (prev) prev.addEventListener('click', () => stepBy(-1));
    if (next) next.addEventListener('click', () => stepBy(1));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    addEventListener('resize', update);
    update();
  }

  // ---- Listing cards: show the home's second photo on hover (mouse only) ----
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.property-photo[data-alt-src]').forEach(link => {
      const src = link.dataset.altSrc;
      if (!src) return;
      let alt = null;
      (link.closest('.property-card') || link).addEventListener('mouseenter', () => {
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
