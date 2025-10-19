document.addEventListener('DOMContentLoaded', () => {
  const NEW_ACTION = 'https://formspree.io/f/xpwybgga';

  // Wire every Formspree form
  document.querySelectorAll('form[action*="formspree.io"]').forEach(form => {
    form.setAttribute('action', NEW_ACTION);
    form.setAttribute('method', 'POST');

    // Clear metadata → less spam
    setHidden(form, '_subject', subjectFromForm(form));
    setHidden(form, 'form_source', 'gofer-community-board');
    setHidden(form, '_redirect', '/community-bulletin-board/thanks.html');

    // Require a sender email + honeypot
    const email = form.querySelector('input[type="email"],input[name="email"],input[name="requester_email"]');
    if (email) {
      email.required = true;
      addHelpText(email, "Your email so I can confirm — use yours even if you're submitting for someone else. We’ll never share it.");
      relabel(email, "Your email (for confirmation)");
    }
    if (!form.querySelector('input[name="_gotcha"]')) {
      const hp = document.createElement('input');
      hp.type = 'text'; hp.name = '_gotcha';
      hp.style.display = 'none'; hp.tabIndex = -1; hp.autocomplete = 'off';
      form.appendChild(hp);
    }

    // Auto-fix bare domains so root URLs pass validation
    form.addEventListener('submit', () => normalizeUrls(form));
    form.querySelectorAll('input[type="url"],input[name="website"],input[name="instagram"],input[name="facebook"]').forEach(inp => {
      inp.addEventListener('blur', () => { inp.value = fixUrl(inp.value); });
    });
  });

  // debug flag
  window.__goferHotfix = 'formspree-loaded';

  // ---- helpers ----
  function setHidden(form, name, value){
    if (!value) return;
    let el = form.querySelector(`input[name="${name}"]`);
    if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = name; form.appendChild(el); }
    el.value = value;
  }
  function subjectFromForm(form){
    const type = (document.getElementById('listing_type') || document.getElementById('type'))?.value || 'Listing';
    const title = document.getElementById('name')?.value || document.querySelector('input[name="name"]')?.value || '';
    return `[${type}] ${title || 'New Community Listing'}`;
  }
  function fixUrl(v){
    if (!v) return v;
    const trimmed = v.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    // if it looks like a domain, add https://
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return 'https://' + trimmed;
    return trimmed;
  }
  function normalizeUrls(form){
    form.querySelectorAll('input[type="url"],input[name="website"],input[name="instagram"],input[name="facebook"]').forEach(inp => {
      inp.value = fixUrl(inp.value);
    });
  }
  function relabel(inputEl, newText){
    // try the previous label or the nearest label[for]
    const id = inputEl.id;
    let lbl = id ? document.querySelector(`label[for="${id}"]`) : null;
    if (!lbl) {
      // fallback: previous sibling label
      let prev = inputEl.previousElementSibling;
      if (prev && prev.tagName.toLowerCase() === 'label') lbl = prev;
    }
    if (lbl) lbl.textContent = newText;
  }
  function addHelpText(inputEl, text){
    if (!inputEl) return;
    // avoid duplicates
    if (inputEl.nextElementSibling && inputEl.nextElementSibling.classList?.contains('help-inline')) return;
    const small = document.createElement('small');
    small.className = 'help-inline';
    small.textContent = text;
    small.style.display = 'block';
    small.style.color = 'var(--muted, #9ca3af)';
    small.style.marginTop = '6px';
    inputEl.insertAdjacentElement('afterend', small);
  }
});
