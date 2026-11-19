// Property photos.
// 1. The stage: one large photo at a time with its room name, a counter, arrows,
//    keyboard and swipe. Each new photo wipes in over the last.
// 2. The photo tour: "All photos" opens a scrolling grid of every photo; selecting a
//    photo (or "Full screen") shows it enlarged with arrows, keyboard and swipe.
// Without JavaScript the stage shows the first photo, linking to the full-size image.
(() => {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links = [...gallery.querySelectorAll('[data-photo]')];
  const photos = links.map(a => ({
    src: a.getAttribute('href'), src640: a.dataset.src640, alt: a.dataset.alt || '',
    w: +a.dataset.w || 0, h: +a.dataset.h || 0
  }));
  const total = photos.length;
  const room = alt => (alt.includes(' — ') ? alt.split(' — ').slice(1).join(' — ') : '');
  const pad = n => String(n).padStart(2, '0');

  // ---------- Stage ----------
  const frame = gallery.querySelector('[data-stage-frame]');
  const title = gallery.querySelector('[data-stage-title]');
  const num = gallery.querySelector('[data-stage-num]');
  const bar = gallery.querySelector('[data-stage-bar]');
  const sizes = '(max-width: 900px) 100vw, min(1380px, 90vw)';
  let cur = 0;

  const slide = i => {
    const a = links[i];
    if (!a.classList.contains('stage-slide')) {
      const p = photos[i];
      const img = new Image();
      img.decoding = 'async';
      img.alt = p.alt;
      if (p.w && p.h) { img.width = p.w; img.height = p.h; }
      img.sizes = sizes;
      img.srcset = `${p.src640} 640w, ${p.src} ${p.w || 1440}w`;
      img.src = p.src;
      a.appendChild(img);
      a.classList.add('stage-slide');
      a.hidden = false;
      a.setAttribute('aria-label', `Open photo ${i + 1} of ${total} full screen`);
    }
    a.classList.toggle('is-portrait', photos[i].h > photos[i].w);
    return a;
  };
  links.forEach((a, i) => { if (a.classList.contains('stage-slide')) a.classList.toggle('is-portrait', photos[i].h > photos[i].w); });

  const label = i => { const r = room(photos[i].alt); return r || photos[i].alt; };
  const setBar = i => { if (bar) bar.style.setProperty('--p', ((i + 1) / total).toFixed(4)); };
  setBar(0);

  let busy = false;
  function go(i, dir) {
    i = (i + total) % total;
    if (i === cur || busy) return;
    const from = links[cur];
    const to = slide(i);
    const img = to.querySelector('img');
    busy = true;
    const swap = () => {
      links.forEach(l => l.classList.remove('is-leaving', 'wipe-r', 'wipe-l'));
      from.classList.remove('is-active');
      from.classList.add('is-leaving');
      to.classList.add('is-active');
      if (!reduce) { void to.offsetWidth; to.classList.add(dir < 0 ? 'wipe-l' : 'wipe-r'); }
      setTimeout(() => { from.classList.remove('is-leaving'); busy = false; }, reduce ? 0 : 950);
      cur = i;
      num.textContent = pad(i + 1);
      title.textContent = label(i);
      if (!reduce) { title.classList.remove('is-in'); void title.offsetWidth; title.classList.add('is-in'); }
      setBar(i);
      // Warm the neighbours so the arrows feel instant.
      [i + 1, i - 1].forEach(n => slide((n + total) % total));
    };
    const ready = img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode() : Promise.resolve());
    let done = false;
    const once = () => { if (!done) { done = true; swap(); } };
    ready.then(once, once);
    setTimeout(once, 700);
  }

  if (frame && total > 1) {
    gallery.querySelector('[data-stage-prev]').addEventListener('click', () => go(cur - 1, -1));
    gallery.querySelector('[data-stage-next]').addEventListener('click', () => go(cur + 1, 1));
    gallery.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, 1); }
    });
    // Swipe on touch screens.
    let sx = null, sy = null, swiped = false;
    frame.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; swiped = false; } });
    frame.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { swiped = true; go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
    });
    frame.addEventListener('pointercancel', () => { sx = sy = null; });
    frame.addEventListener('click', e => { if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; } }, true);
    // Load the next photo once the page has settled.
    addEventListener('load', () => setTimeout(() => slide(1), 600), { once: true });
  }

  // ---------- Photo tour (dialog) ----------
  const viewer = document.getElementById('photo-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const grid = viewer.querySelector('[data-pv-grid]');
  const single = viewer.querySelector('[data-pv-single]');
  const vimg = viewer.querySelector('[data-pv-img]');
  const cap = viewer.querySelector('[data-pv-cap]');
  const count = viewer.querySelector('[data-pv-count]');
  const back = viewer.querySelector('[data-pv-back]');
  const prev = viewer.querySelector('[data-pv-prev]');
  const next = viewer.querySelector('[data-pv-next]');
  let index = 0;
  let opener = null;

  function showPhoto(i) {
    index = (i + total) % total;
    const p = photos[index];
    vimg.classList.add('is-loading');
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      vimg.src = p.src;
      vimg.alt = p.alt;
      if (p.w && p.h) { vimg.width = p.w; vimg.height = p.h; }
      vimg.classList.remove('is-loading');
    };
    pre.src = p.src;
    const t = document.createElement('span'); t.className = 'pv-cap-title'; t.textContent = room(p.alt) || p.alt;
    const c = document.createElement('span'); c.className = 'pv-cap-count'; c.textContent = `${pad(index + 1)} / ${pad(total)}`;
    cap.replaceChildren(t, c);
    [index + 1, index - 1].forEach(n => { const q = photos[(n + total) % total]; if (q) new Image().src = q.src; });
  }
  function gridMode() { single.hidden = true; grid.hidden = false; back.hidden = true; count.textContent = `${total} photos`; }
  function singleMode(i) { grid.hidden = true; single.hidden = false; back.hidden = false; showPhoto(i); next.focus({ preventScroll: true }); }
  function open(from) {
    opener = from || null;
    if (!viewer.open) viewer.showModal();
    document.documentElement.style.overflow = 'hidden';
  }

  // Opening points: the stage photo, "Full screen" and "All photos".
  links.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); open(a); singleMode(i); }));
  const full = gallery.querySelector('[data-stage-full]');
  if (full) { full.hidden = false; full.addEventListener('click', () => { open(full); singleMode(cur); }); }
  const openAll = gallery.querySelector('[data-gallery-all]');
  if (openAll) {
    openAll.hidden = false;
    openAll.addEventListener('click', () => { open(openAll); gridMode(); grid.scrollTop = 0; viewer.querySelector('[data-viewer-close]').focus({ preventScroll: true }); });
  }
  grid.querySelectorAll('[data-pv-open]').forEach(b => b.addEventListener('click', () => singleMode(Number(b.dataset.pvOpen))));

  back.addEventListener('click', () => {
    gridMode();
    const target = grid.querySelector(`[data-pv-open="${index}"]`);
    if (target) { target.scrollIntoView({ block: 'center' }); target.focus({ preventScroll: true }); }
  });
  prev.addEventListener('click', () => showPhoto(index - 1));
  next.addEventListener('click', () => showPhoto(index + 1));
  viewer.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    gridMode();
    // Keep the stage in step with the last photo viewed full screen.
    if (!single.hidden || index !== cur) { if (index !== cur) go(index, index > cur ? 1 : -1); }
    if (opener) opener.focus({ preventScroll: true });
  });
  viewer.addEventListener('keydown', e => {
    if (single.hidden) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(index + 1); }
  });
  if (total < 2) { prev.hidden = true; next.hidden = true; }

  let startX = null, startY = null;
  single.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { startX = e.clientX; startY = e.clientY; } });
  single.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    startX = startY = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && total > 1) showPhoto(index + (dx < 0 ? 1 : -1));
  });
  single.addEventListener('pointercancel', () => { startX = startY = null; });
})();
