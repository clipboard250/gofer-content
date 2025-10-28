// assets/js/reviews.js
(function () {
  // use your existing cache-buster value if present
  const ver = sessionStorage.getItem('gofer_version') || Date.now();
  const dataURL = `/assets/data/reviews.json?v=${encodeURIComponent(ver)}`;

  function starRow(n) {
    if (!n) return '';
    const filled = Math.max(0, Math.min(5, n | 0));
    const full = '★'.repeat(filled);
    const empty = '☆'.repeat(5 - filled);
    return `<div class="stars" aria-label="${filled} out of 5 stars">${full}${empty}</div>`;
  }

  function cardHTML(r) {
    const src = r.source ? `<span class="src">${r.source}</span>` : '';
    const dateAttr = r.date ? ` datetime="${r.date}"` : '';
    const dateEl = r.date ? `<time${dateAttr} class="date">${r.date}</time>` : '';
    const rating = r.rating ? Number(r.rating) : null;

    return `
      <article class="card review-card" itemscope itemtype="https://schema.org/Review">
        <p class="quote" itemprop="reviewBody">“${r.quote}”</p>
        ${rating ? starRow(rating) : ''}
        <p class="by">— 
          <span itemprop="author" itemscope itemtype="https://schema.org/Person">
            <span itemprop="name">${r.author}</span>
          </span> ${src}
        </p>
        ${dateEl}
        <meta itemprop="datePublished" content="${r.date || ''}">
      </article>
    `;
  }

  function render(list) {
    const host = document.getElementById('reviews');
    if (!host) return;
    // newest first if dates exist
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    host.innerHTML = list.map(cardHTML).join('');
  }

  fetch(dataURL, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => Array.isArray(list) ? list : [])
    .then(render)
    .catch(() => {
      // fail silent: keep section empty if JSON missing
    });
})();
