// Define a global callback used by the reCAPTCHA API script
let CAPTCHA_ENABLED = false;
window.onRecaptchaApiLoad = async function () {
  try {
    const res = await fetch('/api/config/recaptcha');
    const cfg = await res.json().catch(() => ({}));
    CAPTCHA_ENABLED = !!(cfg && cfg.enabled && cfg.siteKey);
    const el = document.getElementById('recaptcha');
    if (CAPTCHA_ENABLED && window.grecaptcha && el) {
      grecaptcha.render(el, { sitekey: cfg.siteKey });
      el.style.display = '';
    } else if (el) {
      el.style.display = 'none';
    }
  } catch {
    CAPTCHA_ENABLED = false;
    const el = document.getElementById('recaptcha');
    if (el) el.style.display = 'none';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('activityRandomForm');
  const responseMessage = document.getElementById('responseMessage');
  const submitBtn = document.getElementById('submitBtn');
  if (!form || !responseMessage || !submitBtn) return;

  // Exemptions for testing
  const TEST_EMAILS = new Set(['henson.sagorsor@e.ubaguio.edu']);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('studentEmail').value.trim();
    const idNumber = document.getElementById('idNumber').value.trim();
    const subject = document.getElementById('subject').value;

    const isTest = TEST_EMAILS.has(email.toLowerCase());

    // Validate (skip strict checks for test email)
    const emailPattern = /^(\d+)@s\.ubaguio\.edu$/i;
    const match = email.match(emailPattern);

    if (!isTest) {
      if (!match) {
        return show('Please enter a valid email: idnumber@s.ubaguio.edu', true);
      }
      if (match[1] !== idNumber) {
        return show('ID number must match the email local-part.', true);
      }
    }

    if (!subject) {
      return show('Please select a subject.', true);
    }

    // Captcha (skip for test email or when disabled)
    const captchaResponse = (CAPTCHA_ENABLED && window.grecaptcha && grecaptcha.getResponse()) || '';
    if (CAPTCHA_ENABLED && !captchaResponse && !isTest) {
      return show('Please complete the captcha.', true);
    }

    const confirmed = window.confirm(`Send a randomized activity link to ${email} for ${subject}?`);
    if (!confirmed) return;

    toggleSubmitting(true);
    try {
      const payload = { email, idNumber, subject };
      if (!isTest && CAPTCHA_ENABLED) {
        payload['g-recaptcha-response'] = captchaResponse;
      }

      const res = await fetch('/api/activity/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Parse safely (404 may return HTML)
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = null; }

      if (!res.ok) {
        const msg = (data && data.message) || `Request failed (${res.status})`;
        return show(msg, true);
      }

      if (data && data.success) {
        show(`Activity assigned and emailed to <b>${email}</b>. Check your inbox.`, false);
        form.reset();
        if (!isTest && CAPTCHA_ENABLED && window.grecaptcha) grecaptcha.reset();
      } else {
        show((data && data.message) || 'Request failed.', true);
        if (!isTest && CAPTCHA_ENABLED && window.grecaptcha) grecaptcha.reset();
      }
    } catch (err) {
      console.error(err);
      show('An error occurred. Please try again.', true);
      if (!isTest && CAPTCHA_ENABLED && window.grecaptcha) grecaptcha.reset();
    } finally {
      toggleSubmitting(false);
    }
  });

  function show(msg, isError) {
    responseMessage.textContent = msg;
    responseMessage.style.color = isError ? '#b00020' : '#0b6b0b';
    responseMessage.style.background = isError ? '#ffeaea' : '#eaffea';
    responseMessage.style.border = isError ? '1px solid #b00020' : '1px solid #0b6b0b';
    responseMessage.style.padding = '12px';
    responseMessage.style.borderRadius = '6px';
  }

  function toggleSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Submitting...' : 'Submit';
  }
});
