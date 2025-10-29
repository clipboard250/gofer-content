// assets/js/reviews.js
(function () {
  // cache-bust with your existing session version
  const ver = sessionStorage.getItem('gofer_version') || Date.now();
  const dataURL = '/assets/data/reviews.json?v=' + encodeURIComponent(ver);

  function starRow(n){
    if(!n) return '';
    const filled = Math.max(0, Math.min(5, Number(n) || 0));
    const full = '★'.repeat(filled);
    const empty = '☆'.repeat(5 - filled);
    return `<div class="stars" aria-label="${filled} out of 5 stars">${full}${empty}</div>`;
  }

  function cardHTML(r){
    const rating = r.rating ? Number(r.rating) : null;
    const src = r.source ? `<span class="src">· ${r.source}</span>` : '';
    const dateEl = r.date ? `<time class="date" datetime="${r.date}">${r.date}</time>` : '';
    return `
      <article class="card review-card" itemscope itemtype="https://schema.org/Review" tabindex="-1">
        ${rating ? `<meta itemprop="reviewRating" content="${rating}">` : ''}
        <p class="quote" itemprop="reviewBody">“${r.quote}”</p>
        ${rating ? starRow(r.rating) : ''}
        <p class="meta">
          <span itemprop="author" itemscope itemtype="https://schema.org/Person">
            — <span itemprop="name">${r.author || 'Anonymous'}</span>
          </span> ${src} ${dateEl}
        </p>
      </article>
    `;
  }

  fetch(dataURL, {cache:'no-store'})
    .then(r => r.json())
    .then(list => {
      const root = document.getElementById('reviews');
      if(!root) return;
      // sort newest first by date (fallback keeps order)
      list.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
      root.innerHTML = list.map(cardHTML).join('');
    })
    .catch(()=>{/* silent */});
})();
