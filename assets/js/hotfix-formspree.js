document.addEventListener('DOMContentLoaded', () => {
  // Send all forms to your new Formspree ID
  const NEW_ACTION = 'https://formspree.io/f/xpwybgga';

  document.querySelectorAll('form[action*="formspree.io"]').forEach(form => {
    form.setAttribute('action', NEW_ACTION);
    form.setAttribute('method', 'POST');

    // Clearer metadata → less spam
    setHidden(form, '_subject', subjectFromForm(form));
    setHidden(form, 'form_source', 'gofer-community-board');
    setHidden(form, '_redirect', '/community-bulletin-board/thanks.html');

    // Anti-spam: require email + honeypot
    const email = form.querySelector('input[type="email"],input[name="email"],input[name="requester_email"]');
    if (email) email.required = true;
    if (!form.querySelector('input[name="_gotcha"]')) {
      const hp = document.createElement('input');
      hp.type = 'text'; hp.name = '_gotcha';
      hp.style.display = 'none'; hp.tabIndex = -1; hp.autocomplete = 'off';
      form.appendChild(hp);
    }
  });

  // debug flag so we can confirm the hotfix is loaded
  window.__goferHotfix = 'formspree-loaded';

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
});
