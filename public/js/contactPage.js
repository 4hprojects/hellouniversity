document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  const responseBox = document.querySelector('[data-contact-response]');
  const submitButton = document.querySelector('[data-contact-submit]');

  if (!form || !responseBox || !submitButton) {
    return;
  }

  const originalButtonMarkup = submitButton.innerHTML;

  function showResponse(message, type) {
    responseBox.textContent = message;
    responseBox.hidden = false;
    responseBox.classList.remove('is-success', 'is-error');
    if (type === 'success' || type === 'error') {
      responseBox.classList.add(`is-${type}`);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="material-icons" aria-hidden="true">hourglass_top</span><span>Sending...</span>';
    responseBox.hidden = true;
    responseBox.classList.remove('is-success', 'is-error');

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch(form.action || '/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
      });

      const rawBody = await res.text();
      let data = {};

      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch (parseError) {
          data = { message: rawBody };
        }
      }

      if (!res.ok) {
        throw new Error(data.message || 'We could not send your message right now.');
      }

      form.reset();
      showResponse(
        data.message || 'Your message has been sent. Thank you for contacting HelloUniversity.',
        'success'
      );
    } catch (error) {
      showResponse(
        error.message || 'We could not send your message right now. Please try again later.',
        'error'
      );
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonMarkup;
    }
  });
});
