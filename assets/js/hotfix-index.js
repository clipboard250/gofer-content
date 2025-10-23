/* hotfix-index.js — hide “Schedule” CTA (temporary) */
(() => {
  const labels = ['schedule', 'schedule a call', 'book', 'appointment'];
  const nodes = Array.from(document.querySelectorAll('a, button'));
  nodes.forEach(el => {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (labels.some(l => txt === l || txt.includes(l))) {
      // Hide element and remove from accessibility tree/tab order
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('tabindex', '-1');
      const li = el.closest('li');
      if (li) li.style.display = 'none'; // avoid empty nav gap
    }
  });
})();
