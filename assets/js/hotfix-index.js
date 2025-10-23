/* hotfix-index.js — hide “Schedule” CTA (temporary) */
(() => {
  function hideEl(el){
    if (!el) return;
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('tabindex', '-1');
    const li = el.closest('li');
    if (li) li.style.display = 'none';
  }

  function run(){
    const labels = ['schedule', 'schedule a call', 'book', 'appointment'];
    // 1) Match by text
    document.querySelectorAll('a, button').forEach(el => {
      const txt = (el.textContent || '').trim().toLowerCase();
      if (labels.some(l => txt === l || txt.includes(l))) hideEl(el);
    });
    // 2) Match by URL (your current scheduler)
    document.querySelectorAll('a[href*="zohobookings.com"]').forEach(hideEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
