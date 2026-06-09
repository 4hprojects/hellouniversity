let captchaConfig = { enabled: false, siteKey: null, action: null };
let captchaScriptPromise = null;

async function loadCaptchaConfig() {
  try {
    const res = await fetch('/api/config/recaptcha');
    const cfg = await res.json().catch(() => ({}));
    captchaConfig = {
      enabled: !!(cfg && cfg.enabled && cfg.siteKey),
      siteKey: cfg?.siteKey || null,
      action: cfg?.action || 'activity_random',
    };

    if (captchaConfig.enabled) {
      await loadCaptchaScript(captchaConfig.siteKey);
    }
  } catch {
    captchaConfig = { enabled: false, siteKey: null, action: null };
  }
}

function loadCaptchaScript(siteKey) {
  if (window.grecaptcha && typeof window.grecaptcha.execute === 'function') {
    return Promise.resolve();
  }

  if (captchaScriptPromise) {
    return captchaScriptPromise;
  }

  captchaScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return captchaScriptPromise;
}

function getCaptchaToken() {
  if (!captchaConfig.enabled || !captchaConfig.siteKey) {
    return Promise.resolve('');
  }

  if (!window.grecaptcha || typeof window.grecaptcha.ready !== 'function') {
    return Promise.reject(new Error('Captcha is not ready.'));
  }

  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(captchaConfig.siteKey, { action: captchaConfig.action || 'activity_random' })
        .then(resolve)
        .catch(reject);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('activityRandomForm');
  const responseMessage = document.getElementById('responseMessage');
  const submitBtn = document.getElementById('submitBtn');
  if (!form || !responseMessage || !submitBtn) return;

  const captchaReady = loadCaptchaConfig();

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

    const confirmed = window.confirm(`Send a randomized activity link to ${email} for ${subject}?`);
    if (!confirmed) return;

    toggleSubmitting(true);
    try {
      await captchaReady;
      const payload = { email, idNumber, subject };
      if (!isTest && captchaConfig.enabled) {
        const captchaResponse = await getCaptchaToken();
        if (!captchaResponse) {
          return show('Captcha verification could not start. Please try again.', true);
        }
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
      } else {
        show((data && data.message) || 'Request failed.', true);
      }
    } catch (err) {
      console.error(err);
      show('An error occurred. Please try again.', true);
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
