const CRFV_HOME_URL = '/crfv';

function getCurrentReturnToPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function showMessageModal(title, message, redirectUrl, delay = 3000) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').innerHTML = `
    ${message}<br>
    Redirecting to the main menu in <span id="modalTimer" style="color:#000; font-weight:bold;">${Math.floor(delay / 1000)}</span> seconds...
  `;
  const link = document.getElementById('modalRedirectLink');
  link.href = redirectUrl;
  link.style.display = 'inline-block';
  document.getElementById('messageModal').style.display = 'flex';

  let seconds = Math.floor(delay / 1000);
  const timerSpan = document.getElementById('modalTimer');
  const timer = setInterval(() => {
    seconds--;
    if (timerSpan) timerSpan.textContent = seconds;
    if (seconds <= 0) clearInterval(timer);
  }, 1000);

  setTimeout(() => {
    window.location.href = redirectUrl;
  }, delay);
}

const logoutButton = document.getElementById('logoutBtn');
if (logoutButton) {
  logoutButton.onclick = async function () {
    let redirectUrl = CRFV_HOME_URL;

    try {
      const response = await fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo: getCurrentReturnToPath() }),
      });
      const payload = await response.json().catch(() => ({}));
      redirectUrl = payload.redirectPath || CRFV_HOME_URL;

      showMessageModal(
        'Logged Out',
        'You have been logged out successfully.',
        redirectUrl,
      );
    } catch (err) {
      showMessageModal(
        'Logout Error',
        'There was a problem logging out. Please try again or contact support.',
        redirectUrl,
      );
    }
  };
}

function showAuthModal() {
  showMessageModal(
    'No Account Logged In',
    'Please log in to access this page.',
    CRFV_HOME_URL,
    2000,
  );
}
