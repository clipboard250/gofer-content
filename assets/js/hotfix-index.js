document.addEventListener('DOMContentLoaded', () => {
  // 1) Make the menu item go to the live board (not #bulletin)
  document.querySelectorAll('#mobileMenu a.m-link').forEach(a => {
    const txt = (a.textContent || '').trim().toLowerCase();
    if (txt.includes('community bulletin')) {
      a.href = '/community-bulletin-board/';
      a.removeAttribute('target');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        location.href = '/community-bulletin-board/';
      });
    }
  });

  // Also fix any hero/CTA that points to the board
  document.querySelectorAll('a[href*="community-bulletin"]').forEach(a => {
    a.href = '/community-bulletin-board/';
    a.removeAttribute('target');
  });

  // 2) Update the pill text + tone down the styling
  const pill = document.querySelector('.logo .pill');
  if (pill) {
    pill.textContent = 'Based in Old Northeast, St. Petersburg, Florida';
    pill.classList.add('pill--plain');
  }

  // 3) Inject minimal CSS to de-badge the pill (no border/bubble look)
  const css = `
    .pill.pill--plain{
      border: 0 !important;
      background: transparent !important;
      color: var(--muted);
      padding: 0 !important;
      font-size: .95rem;
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
});
