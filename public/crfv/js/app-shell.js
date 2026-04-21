(() => {
  const CLOCK_ID = 'crfvAppNavClock';
  const LOGOUT_BUTTON_ID = 'logoutBtn';
  const DEFAULT_REDIRECT_URL = '/crfv';
  const CHECK_AUTH_URL = '/api/check-auth';
  let isAuthenticated = false;

  function updateAuthButton() {
    const logoutButton = document.getElementById(LOGOUT_BUTTON_ID);
    if (!logoutButton) {
      return;
    }

    const icon = logoutButton.querySelector('.material-icons');
    const label = logoutButton.querySelector('.crfv-app-nav__utility-label');
    const authLabel = isAuthenticated ? 'Log Out' : 'Log In';
    logoutButton.classList.toggle('is-logged-in', isAuthenticated);
    logoutButton.classList.toggle('is-logged-out', !isAuthenticated);
    logoutButton.setAttribute('aria-label', authLabel);

    if (icon) {
      icon.textContent = isAuthenticated ? 'logout' : 'login';
    }

    if (label) {
      label.textContent = authLabel;
    }
  }

  function getClockLabel() {
    const now = new Date();
    const dateLabel = now.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeLabel = now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `${dateLabel} | ${timeLabel}`;
  }

  function startClock() {
    const clock = document.getElementById(CLOCK_ID);
    if (!clock) {
      return;
    }

    const updateClock = () => {
      clock.textContent = getClockLabel();
    };

    updateClock();
    window.setInterval(updateClock, 1000);
  }

  async function confirmLogout() {
    if (window.crfvDialog?.confirm) {
      return window.crfvDialog.confirm('Are you sure you want to log out?', {
        title: 'Confirm action',
        confirmLabel: 'Log Out',
        destructive: true,
      });
    }

    return window.confirm('Are you sure you want to log out?');
  }

  async function loadAuthState() {
    try {
      const response = await fetch(CHECK_AUTH_URL, {
        credentials: 'same-origin',
      });
      const payload = await response.json().catch(() => ({}));
      isAuthenticated = Boolean(payload?.authenticated);
    } catch (_error) {
      isAuthenticated = false;
    }

    updateAuthButton();
  }

  function getCurrentReturnToPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  async function runBeforeLogoutHook() {
    const hook =
      window.crfvAppShell &&
      typeof window.crfvAppShell.beforeLogout === 'function'
        ? window.crfvAppShell.beforeLogout
        : null;

    if (!hook) {
      return {};
    }

    const result = await hook();
    if (result === false) {
      return { cancelled: true };
    }

    return result && typeof result === 'object' ? result : {};
  }

  function focusLoginEntryPoint() {
    const loginTargets = ['crfvStudentID', 'username', 'miniUsername'];
    const firstTarget = loginTargets
      .map((id) => document.getElementById(id))
      .find((node) => node);

    if (firstTarget) {
      firstTarget.focus();
    }

    const sidePanel = document.getElementById('sidePanel') || firstTarget;
    sidePanel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleLoginNavigation() {
    if (
      window.location.pathname === '/crfv' ||
      window.location.pathname === '/crfv/' ||
      window.location.pathname === '/crfv/index'
    ) {
      focusLoginEntryPoint();
      return;
    }

    window.location.href = DEFAULT_REDIRECT_URL;
  }

  async function handleLogout() {
    const confirmed = await confirmLogout();
    if (!confirmed) {
      return;
    }

    const hookResult = await runBeforeLogoutHook();
    if (hookResult.cancelled) {
      return;
    }

    const logoutUrl = hookResult.logoutUrl || '/logout';
    const redirectUrl = hookResult.redirectUrl || DEFAULT_REDIRECT_URL;

    const response = await fetch(logoutUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnTo: getCurrentReturnToPath() }),
    });
    const payload = await response.json().catch(() => ({}));
    window.location.href =
      hookResult.redirectUrl || payload.redirectPath || redirectUrl;
  }

  function bindAuthButton() {
    const logoutButton = document.getElementById(LOGOUT_BUTTON_ID);
    if (!logoutButton) {
      return;
    }

    logoutButton.addEventListener('click', async () => {
      if (!isAuthenticated) {
        handleLoginNavigation();
        return;
      }

      await handleLogout();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    startClock();
    bindAuthButton();
    await loadAuthState();
  });
})();
