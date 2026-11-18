// Homepage hero video: loads only after the page has finished loading,
// never plays for reduced-motion or data-saver visitors, and pauses when off screen.
(() => {
  const film = document.querySelector('[data-hero-film]');
  if (!film) return;
  const video = film.querySelector('video');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  if (reduce.matches || saveData) return; // keep the still frame
  let onScreen = true;
  let loaded = false;

  function load() {
    if (loaded) return;
    loaded = true;
    const small = window.matchMedia('(max-width: 700px)').matches;
    video.src = small ? video.dataset.srcSmall : video.dataset.src;
    video.preload = 'auto';
  }

  async function play() {
    if (!onScreen || document.hidden) return;
    load();
    try {
      await video.play();
      video.classList.add('is-active');
    } catch { /* autoplay refused: keep the still frame */ }
  }

  video.addEventListener('playing', () => video.classList.add('is-active'));

  new IntersectionObserver(entries => {
    onScreen = entries[0].isIntersecting;
    onScreen ? play() : (loaded && video.pause());
  }).observe(film);

  document.addEventListener('visibilitychange', () => { document.hidden ? (loaded && video.pause()) : play(); });

  // Wait for the page to finish loading, then for the browser to be idle.
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
  if (document.readyState === 'complete') idle(play);
  else window.addEventListener('load', () => idle(play), { once: true });
})();
