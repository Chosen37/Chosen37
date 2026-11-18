// Property photo tour: "View all photos" opens a scrolling grid of every photo;
// selecting a photo shows it enlarged with arrows, keyboard and swipe.
// Without JavaScript, each gallery photo is a plain link to the full image.
(() => {
  const gallery = document.querySelector('[data-gallery]');
  const viewer = document.getElementById('photo-viewer');
  if (!gallery || !viewer || typeof viewer.showModal !== 'function') return;

  const links = [...gallery.querySelectorAll('[data-photo]')];
  const photos = links.map(a => ({ src: a.getAttribute('href'), alt: a.dataset.alt || '', w: a.dataset.w, h: a.dataset.h }));
  const grid = viewer.querySelector('[data-pv-grid]');
  const single = viewer.querySelector('[data-pv-single]');
  const img = viewer.querySelector('[data-pv-img]');
  const cap = viewer.querySelector('[data-pv-cap]');
  const count = viewer.querySelector('[data-pv-count]');
  const back = viewer.querySelector('[data-pv-back]');
  const prev = viewer.querySelector('[data-pv-prev]');
  const next = viewer.querySelector('[data-pv-next]');
  const total = photos.length;
  let index = 0;
  let opener = null;

  const room = alt => (alt.includes(' — ') ? alt.split(' — ').slice(1).join(' — ') : '');

  function showPhoto(i) {
    index = (i + total) % total;
    const p = photos[index];
    img.classList.add('is-loading');
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      img.src = p.src;
      img.alt = p.alt;
      if (p.w && p.h) { img.width = p.w; img.height = p.h; }
      img.classList.remove('is-loading');
    };
    pre.src = p.src;
    cap.textContent = `${room(p.alt)}${room(p.alt) ? ' · ' : ''}${index + 1} of ${total}`;
    // Warm the neighbours so the arrows feel instant.
    [index + 1, index - 1].forEach(n => { const q = photos[(n + total) % total]; if (q) new Image().src = q.src; });
  }

  function gridMode() {
    single.hidden = true;
    grid.hidden = false;
    back.hidden = true;
    count.textContent = `${total} photos`;
  }

  function singleMode(i) {
    grid.hidden = true;
    single.hidden = false;
    back.hidden = false;
    showPhoto(i);
    next.focus({ preventScroll: true });
  }

  function open(from) {
    opener = from || null;
    if (!viewer.open) viewer.showModal();
    document.documentElement.style.overflow = 'hidden';
  }

  // Opening points
  links.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); open(a); singleMode(i); }));
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
    if (opener) opener.focus({ preventScroll: true });
  });

  viewer.addEventListener('keydown', e => {
    if (single.hidden) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(index + 1); }
  });

  if (total < 2) { prev.hidden = true; next.hidden = true; }

  // Swipe on touch screens.
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
