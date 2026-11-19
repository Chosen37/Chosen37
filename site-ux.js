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
      ' main .stat, main .how-steps > li, main .hood, main .cc-copy, main .collection-more, main .dest, main .os-col, main .os-benefits > div, main .hero-path, main .how-photo'
    )].filter(el => !el.closest('.hero, dialog'))
      // Sideways rows on smaller screens scroll horizontally, so their items don't animate in.
      .filter(el => !(el.matches('.property-card') && el.closest('.page-home') && innerWidth <= 700) && !(el.matches('.hood') && innerWidth <= 1100) && !(el.matches('.dest') && innerWidth <= 700));
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
      }, { rootMargin: '0px 0px 12% 0px', threshold: 0.01 });
      below.forEach(el => io.observe(el));
    }
  });

  // ---- Homepage hero: looping film over a still first frame ----
  // The still (the film's first frame) is the page's main image and loads with it.
  // The film loads only after the page has finished and the visitor interacts
  // (or after 4 seconds), then fades in once it is actually playing.
  const heroBox = document.querySelector('[data-hero-video]');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (heroBox && !reduce && !saveData) {
    const evs = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown', 'wheel'];
    let loaded = false, started = false;
    const start = () => {
      if (started || !loaded) return;
      started = true;
      evs.forEach(ev => removeEventListener(ev, start, true));
      const v = document.createElement('video');
      v.className = 'hero-film';
      v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.preload = 'auto';
      v.src = innerWidth * (devicePixelRatio || 1) > 1100 && innerWidth > 900 ? 'assets/hero-1280.mp4' : 'assets/hero-768.mp4';
      v.addEventListener('playing', () => heroBox.classList.add('film-on'), { once: true });
      heroBox.appendChild(v);
      let onScreen = true;
      const sync = () => { if (onScreen && !document.hidden) v.play().catch(() => {}); else v.pause(); };
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(heroBox);
      document.addEventListener('visibilitychange', sync);
      sync();
    };
    const later = () => { loaded = true; idle(start, { timeout: 1500 }); };
    evs.forEach(ev => addEventListener(ev, () => { if (loaded) start(); }, { capture: true, passive: true, once: true }));
    const arm = () => setTimeout(later, 4000);
    if (document.readyState === 'complete') arm(); else addEventListener('load', () => {
      arm();
      evs.forEach(ev => addEventListener(ev, later, { capture: true, passive: true, once: true }));
    }, { once: true });
  }

  // Wrap every word of an element in spans, keeping <em>/<br> and spacing intact.
  const splitWords = (el, make) => {
    const out = [];
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = make(part); out.push(s); frag.appendChild(s.outer || s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    return out;
  };

  // ---- Section headlines: words rise out of a mask as the heading scrolls in ----
  if (!reduce && 'IntersectionObserver' in window) idle(() => {
    const heads = [...document.querySelectorAll('.page-home main h2')]
      .filter(h => !h.closest('dialog, .hero, footer') && h.getBoundingClientRect().top > innerHeight * 0.95);
    if (!heads.length) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const h = e.target;
      h.classList.add('in');
      io.unobserve(h);
      // Once every word has landed, drop the masks so nothing can be clipped.
      setTimeout(() => h.classList.add('landed'), 1400 + h.querySelectorAll('.wi').length * 55);
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    heads.forEach(h => {
      let i = 0;
      splitWords(h, word => {
        const w = document.createElement('span'); w.className = 'w';
        const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = word;
        wi.style.setProperty('--d', `${Math.min(i++, 14) * 55}ms`);
        w.appendChild(wi);
        return w;
      });
      h.classList.add('tx-split');
      io.observe(h);
    });
  });

  // ---- Statement: words sharpen and light up one by one as the line scrolls through ----
  const statement = document.querySelector('[data-statement]');
  if (statement && !reduce) idle(() => {
    const section = statement.closest('.statement');
    const spans = splitWords(statement, word => {
      const s = document.createElement('span'); s.className = 'sw'; s.textContent = word;
      return s;
    });
    statement.classList.add('is-split');
    // The kicker line draws in and its letters tighten when the section arrives.
    if (section && section.getBoundingClientRect().top > innerHeight * 0.9 && 'IntersectionObserver' in window) {
      section.classList.add('kick-wait');
      const kio = new IntersectionObserver(([e]) => { if (e.isIntersecting) { section.classList.remove('kick-wait'); kio.disconnect(); } }, { threshold: 0.25 });
      kio.observe(section);
    }
    let lit = -1, ticking = false;
    const paint = () => {
      ticking = false;
      const r = statement.getBoundingClientRect();
      const vh = innerHeight;
      // 0 when the block's top reaches 85% of the screen; fully lit by the time its bottom reaches about 70%.
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.15)));
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

  // ---- Hero headline: drop the line masks once the opening animation has played ----
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) setTimeout(() => heroTitle.classList.add('landed'), reduce ? 0 : 1700);

  // ---- Slow parallax on the full-bleed photo bands ----
  const bands = [...document.querySelectorAll('.statement-bg, .owner-bg')];
  if (bands.length && !reduce && matchMedia('(min-width: 901px)').matches) {
    let ticking = false;
    const move = () => {
      ticking = false;
      const vh = innerHeight;
      bands.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / (vh + r.height);   // about -0.5 .. 0.5
        el.style.transform = `translate3d(0,${(p * -14).toFixed(2)}%,0)${el.classList.contains('owner-bg') ? ' scale(1.14)' : ''}`;
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
    addEventListener('resize', move);
    move();
  }

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
