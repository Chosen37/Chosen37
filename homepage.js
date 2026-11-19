(() => {
  const places = document.querySelector('[data-places]');
  const archive = document.querySelector('[data-place-archive]');
  const more = document.querySelector('[data-more-places]');
  const featured = new Set(['explore-union-station', 'explore-larimer-square', 'explore-red-rocks']);

  // All places remain readable when JavaScript is unavailable.
  if (places && archive && more) {
    for (const place of Array.from(places.children)) {
      if (!featured.has(place.id)) archive.append(place);
    }
    more.hidden = !archive.childElementCount;
  }

  const film = document.querySelector('#home-film');
  const opener = document.querySelector('[data-film-open]');
  if (!film || !opener || !film.showModal) return;
  const video = film.querySelector('video');
  opener.addEventListener('click', event => {
    event.preventDefault();
    film.showModal();
    film.querySelector('[data-close]').focus();
    video.play().catch(() => { /* The native play control remains available. */ });
  });
  film.addEventListener('close', () => {
    video.pause();
    opener.focus();
  });
})();
