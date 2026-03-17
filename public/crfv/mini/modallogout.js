function showMessageModal(title, message, redirectUrl, delay = 3000) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').innerHTML = `
    ${message}<br>
    Redirecting to the main menu in <span id="modalTimer" style="color:#000; font-weight:bold;">${Math.floor(delay/1000)}</span> seconds...
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

// Update logout button logic:
document.getElementById('logoutBtn').onclick = async function() {
  try {
    await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
    showMessageModal(
      'Logged Out',
      'You have been logged out successfully.',
      '/crfv/index'
    );
  } catch (err) {
    showMessageModal(
      'Logout Error',
      'There was a problem logging out. Please try again or contact support.',
      '/crfv/index'
    );
  }
};

function showAuthModal() {
  showMessageModal(
    'No Account Logged In',
    'Please log in to access this page.',
    '/crfv/index.html',
    2000
  );
}
