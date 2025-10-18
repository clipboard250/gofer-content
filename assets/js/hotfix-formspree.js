document.addEventListener('DOMContentLoaded', () => {
  // Your new Formspree ID
  const NEW_ID = 'xpwybgga'; // https://formspree.io/f/xpwybgga
  const NEW_ACTION = `https://formspree.io/f/${NEW_ID}`;

  // Find any form that posts to Formspree and point it to the new ID
  document.querySelectorAll('form[action*="formspree.io"]').forEach(form => {
    form.setAttribute('action', NEW_ACTION);
    form.setAttribute('method', 'POST');

    // Keep your redirect working if a page forgot it
    if (!form.querySelector('input[name="_redirect"]')) {
      const redirect = document.createElement('input');
      redirect.type = 'hidden';
      redirect.name = '_redirect';
      redirect.value = '/community-bulletin-board/thanks.html';
      form.appendChild(redirect);
    }

    // Optional: clearer subject line so your inbox is tidy
    if (!form.querySelector('input[name="_subject"]')) {
      const subj = document.createElement('input');
      subj.type = 'hidden';
      subj.name = '_subject';
      subj.value = 'Gofer Community submission';
      form.appendChild(subj);
    }
  });
});
