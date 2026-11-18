// Homepage hero video: loads only after the page has finished loading,
// never on reduced-motion or data-saver, pauses when off screen, and has a pause button.
(() => {
  const film = document.querySelector('[data-hero-film]');
  if (!film) return;
  const video = film.querySelector('video');
  const toggle = document.querySelector('[data-film-toggle]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  let userPaused = reduce.matches || saveData;
  let onScreen = true;
  let loaded = false;

  const ICON_PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 2 10 6-10 6Z" fill="currentColor"/></svg>';

  function label() {
    const playing = !video.paused;
    toggle.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    toggle.setAttribute('aria-label', playing ? 'Pause the Union Station video' : 'Play the Union Station video');
    toggle.setAttribute('aria-pressed', String(playing));
  }

  function load() {
    if (loaded) return;
    loaded = true;
    const small = window.matchMedia('(max-width: 700px)').matches;
    video.src = small ? video.dataset.srcSmall : video.dataset.src;
    video.preload = 'auto';
  }

  async function play() {
    if (userPaused || !onScreen || document.hidden) return;
    load();
    try {
      await video.play();
      video.classList.add('is-active');
    } catch { /* autoplay refused: keep the still frame */ }
    label();
  }

  function pause() { video.pause(); label(); }

  video.addEventListener('playing', () => { video.classList.add('is-active'); label(); });

  toggle.addEventListener('click', () => {
    if (video.paused) { userPaused = false; play(); }
    else { userPaused = true; pause(); }
  });

  new IntersectionObserver(entries => {
    onScreen = entries[0].isIntersecting;
    onScreen ? play() : (loaded && video.pause());
  }).observe(film);

  document.addEventListener('visibilitychange', () => { document.hidden ? (loaded && video.pause()) : play(); });

  function start() {
    toggle.hidden = false;
    label();
    play();
  }
  // Wait for the page to finish loading, then for the browser to be idle.
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
  if (document.readyState === 'complete') idle(start);
  else window.addEventListener('load', () => idle(start), { once: true });
})();
