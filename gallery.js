// Property photo gallery: thumbnails, full-screen viewer, keyboard and swipe.
// Works as plain links to each photo when JavaScript is off.
(() => {
  const gallery = document.querySelector('[data-gallery]');
  const viewer = document.getElementById('photo-viewer');
  if (!gallery || !viewer || typeof viewer.showModal !== 'function') return;

  const links = [...gallery.querySelectorAll('[data-photo]')];
  const photos = links.map(a => ({ src: a.getAttribute('href'), alt: a.dataset.alt || '', w: a.dataset.w, h: a.dataset.h }));
  const img = viewer.querySelector('[data-viewer-img]');
  const counter = viewer.querySelector('[data-viewer-count]');
  const prev = viewer.querySelector('[data-viewer-prev]');
  const next = viewer.querySelector('[data-viewer-next]');
  const thumbs = [...viewer.querySelectorAll('[data-viewer-thumb]')];
  let index = 0;
  let opener = null;

  function show(i) {
    index = (i + photos.length) % photos.length;
    const p = photos[index];
    img.src = p.src;
    img.alt = p.alt;
    if (p.w && p.h) { img.width = p.w; img.height = p.h; }
    counter.textContent = `${index + 1} / ${photos.length}`;
    thumbs.forEach((t, n) => t.setAttribute('aria-current', n === index ? 'true' : 'false'));
    const active = thumbs[index];
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    // Warm the cache for the neighbours so arrows feel instant.
    [index + 1, index - 1].forEach(n => { const q = photos[(n + photos.length) % photos.length]; if (q) new Image().src = q.src; });
  }

  function open(i, from) {
    opener = from || null;
    thumbs.forEach(t => { const im = t.querySelector('img[data-src]'); if (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); } });
    show(i);
    viewer.showModal();
    viewer.querySelector('[data-viewer-close]').focus();
  }

  links.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); open(i, a); }));
  const openAll = gallery.querySelector('[data-gallery-all]');
  if (openAll) { openAll.hidden = false; openAll.addEventListener('click', () => open(0, openAll)); }

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  thumbs.forEach((t, n) => t.addEventListener('click', () => show(n)));
  viewer.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => { if (opener) opener.focus(); });
  viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });

  if (photos.length < 2) { prev.hidden = true; next.hidden = true; }

  // Swipe on touch screens.
  let startX = null, startY = null;
  const stage = viewer.querySelector('[data-viewer-stage]');
  stage.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { startX = e.clientX; startY = e.clientY; } });
  stage.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    startX = startY = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && photos.length > 1) show(index + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { startX = startY = null; });
})();
