// assets/js/reviews.js
(function () {
  // cache-bust with your existing session version
  const ver = sessionStorage.getItem('gofer_version') || Date.now();
  const dataURL = '/assets/data/reviews.json?v=' + encodeURIComponent(ver);

  function starRow(n){
    if(!n) return '';
    const val = Math.max(0, Math.min(5, Number(n) || 0));
    return `<div class="stars" aria-label="${val} out of 5 stars">${'★'.repeat(val)}${'☆'.repeat(5-val)}</div>`;
  }

  function cardHTML(r){
    const rating = r.rating ? Number(r.rating) : null;
    const src = r.source ? ` · ${r.source}` : '';
    // date hidden by CSS; still add semantic <time> for screen readers
    const dateEl = r.date ? `<time class="date" datetime="${r.date}">${r.date}</time>` : '';
    return `
      <article class="card review-card">
        <p class="quote">“${r.quote}”</p>
        ${rating ? starRow(r.rating) : ''}
        <p class="meta">— ${r.author || 'Anonymous'}${src}${dateEl}</p>
      </article>
    `;
  }

  fetch(dataURL, {cache:'no-store'})
    .then(r => r.json())
    .then(list => {
      const root = document.getElementById('reviews');
      if(!root) return;
      list.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
      root.innerHTML = list.map(cardHTML).join('');
    })
    .catch(()=>{/* silent */});
})();
