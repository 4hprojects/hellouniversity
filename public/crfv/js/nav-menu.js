(() => {
  const MENU_ROOT_SELECTOR = '[data-crfv-nav-menu]';
  const BUTTON_ID = 'crfvNavMenuButton';
  const PANEL_ID = 'crfvNavMenuPanel';
  const CHECK_AUTH_URL = '/api/check-auth';

  function normalizePath(path) {
    if (path === '/crfv/' || path === '/crfv/index') {
      return '/crfv';
    }
    return path || '/crfv';
  }

  function setExpanded(button, panel, isExpanded) {
    button.setAttribute('aria-expanded', String(isExpanded));
    panel.hidden = !isExpanded;
    button.setAttribute(
      'aria-label',
      isExpanded ? 'Close CRFV navigation menu' : 'Open CRFV navigation menu',
    );
  }

  function closeMenu(button, panel) {
    setExpanded(button, panel, false);
  }

  function syncActiveLink(panel) {
    const currentPath = normalizePath(window.location.pathname);
    panel.querySelectorAll('[data-crfv-nav-link]').forEach((link) => {
      let linkPath = '/crfv';
      try {
        linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
      } catch (_error) {
        linkPath = normalizePath(link.getAttribute('href') || '');
      }

      const isCurrent = linkPath === currentPath;
      link.classList.toggle('is-current', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  async function loadAuthState() {
    try {
      const response = await fetch(CHECK_AUTH_URL, { credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      return {
        authenticated: Boolean(payload?.authenticated),
        role: String(payload?.user?.role || '').toLowerCase(),
      };
    } catch (_error) {
      return { authenticated: false, role: '' };
    }
  }

  function applyLinkVisibility(panel, authState) {
    panel.querySelectorAll('[data-crfv-nav-link]').forEach((link) => {
      const authRequired = link.getAttribute('data-auth-required') === 'true';
      const requiredRoles = String(link.getAttribute('data-required-roles') || '')
        .split(/\s+/)
        .filter(Boolean);
      const isAllowed =
        (!authRequired || authState.authenticated) &&
        (requiredRoles.length === 0 || requiredRoles.includes(authState.role));
      const listItem = link.closest('li');

      if (listItem) {
        listItem.hidden = !isAllowed;
      }
    });

    panel.querySelectorAll('.crfv-nav-menu__group').forEach((group) => {
      const hasVisibleLinks = Boolean(group.querySelector('li:not([hidden])'));
      group.hidden = !hasVisibleLinks;
    });
  }

  function bindMenu(root) {
    const button = root.querySelector(`#${BUTTON_ID}`);
    const panel = root.querySelector(`#${PANEL_ID}`);
    if (!button || !panel) {
      return;
    }

    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      setExpanded(button, panel, !isExpanded);
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) {
        closeMenu(button, panel);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu(button, panel);
        button.focus();
      }
    });

    panel.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        closeMenu(button, panel);
      }
    });

    syncActiveLink(panel);
    loadAuthState().then((authState) => {
      applyLinkVisibility(panel, authState);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(MENU_ROOT_SELECTOR).forEach(bindMenu);
  });
})();
