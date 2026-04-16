(function() {
  const TITLE_BY_TONE = {
    info: 'Notice',
    success: 'Success',
    error: 'Error'
  };

  let dialogRoot = null;
  let activeRequest = null;
  const requestQueue = [];

  function ensureDialogRoot() {
    if (dialogRoot) {
      return dialogRoot;
    }

    const overlay = document.createElement('div');
    overlay.className = 'crfv-dialog-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="crfv-dialog-backdrop" data-crfv-dialog-close="backdrop"></div>
      <section class="crfv-dialog-card" role="dialog" aria-modal="true" aria-labelledby="crfvDialogTitle" aria-describedby="crfvDialogMessage" tabindex="-1">
        <div class="crfv-dialog-header">
          <div class="crfv-dialog-copy">
            <p class="crfv-dialog-eyebrow" id="crfvDialogEyebrow">Notice</p>
            <h2 class="crfv-dialog-title" id="crfvDialogTitle">Notice</h2>
          </div>
          <button type="button" class="crfv-dialog-close" aria-label="Close dialog" data-crfv-dialog-close="close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <p class="crfv-dialog-message" id="crfvDialogMessage"></p>
        <div class="crfv-dialog-actions">
          <button type="button" class="crfv-dialog-btn crfv-dialog-btn-secondary" data-crfv-dialog-action="cancel">Cancel</button>
          <button type="button" class="crfv-dialog-btn crfv-dialog-btn-primary" data-crfv-dialog-action="confirm">OK</button>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);

    const card = overlay.querySelector('.crfv-dialog-card');
    overlay.addEventListener('click', event => {
      if (!activeRequest) {
        return;
      }
      const closeTrigger = event.target.closest('[data-crfv-dialog-close]');
      if (closeTrigger || event.target.classList.contains('crfv-dialog-backdrop')) {
        resolveActiveRequest(activeRequest.kind === 'confirm' ? false : undefined);
      }
    });

    card.addEventListener('keydown', event => {
      if (!activeRequest) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        resolveActiveRequest(activeRequest.kind === 'confirm' ? false : undefined);
        return;
      }
      if (event.key === 'Tab') {
        trapFocus(event, card);
      }
    });

    overlay.querySelector('[data-crfv-dialog-action="confirm"]').addEventListener('click', () => {
      if (!activeRequest) {
        return;
      }
      resolveActiveRequest(activeRequest.kind === 'confirm' ? true : undefined);
    });

    overlay.querySelector('[data-crfv-dialog-action="cancel"]').addEventListener('click', () => {
      if (!activeRequest) {
        return;
      }
      resolveActiveRequest(false);
    });

    dialogRoot = overlay;
    return overlay;
  }

  function trapFocus(event, card) {
    const focusableElements = getFocusableElements(card);
    if (focusableElements.length === 0) {
      event.preventDefault();
      card.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function getFocusableElements(container) {
    return Array.from(
      container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element => element.offsetParent !== null || element === document.activeElement);
  }

  function getTitle(kind, tone, explicitTitle) {
    if (explicitTitle) {
      return explicitTitle;
    }
    if (kind === 'confirm') {
      return 'Confirm action';
    }
    return TITLE_BY_TONE[tone] || TITLE_BY_TONE.info;
  }

  function showNextRequest() {
    if (activeRequest || requestQueue.length === 0) {
      return;
    }

    const nextRequest = requestQueue.shift();
    const overlay = ensureDialogRoot();
    const card = overlay.querySelector('.crfv-dialog-card');
    const title = overlay.querySelector('#crfvDialogTitle');
    const eyebrow = overlay.querySelector('#crfvDialogEyebrow');
    const message = overlay.querySelector('#crfvDialogMessage');
    const confirmButton = overlay.querySelector('[data-crfv-dialog-action="confirm"]');
    const cancelButton = overlay.querySelector('[data-crfv-dialog-action="cancel"]');

    const tone = nextRequest.options.tone || 'info';
    const dialogTitle = getTitle(nextRequest.kind, tone, nextRequest.options.title);
    const confirmLabel = nextRequest.options.confirmLabel || (nextRequest.kind === 'confirm' ? 'Confirm' : 'OK');
    const cancelLabel = nextRequest.options.cancelLabel || 'Cancel';
    const destructive = Boolean(nextRequest.options.destructive);

    overlay.className = `crfv-dialog-overlay crfv-dialog-tone-${tone}`;
    overlay.hidden = false;
    document.body.classList.add('crfv-dialog-open');

    title.textContent = dialogTitle;
    eyebrow.textContent = dialogTitle;
    message.textContent = String(nextRequest.message || '');

    confirmButton.textContent = confirmLabel;
    confirmButton.classList.toggle('crfv-dialog-btn-danger', destructive);
    confirmButton.classList.toggle('crfv-dialog-btn-primary', !destructive);

    cancelButton.textContent = cancelLabel;
    cancelButton.hidden = nextRequest.kind !== 'confirm';

    activeRequest = {
      ...nextRequest,
      overlay,
      restoreFocusTo: document.activeElement instanceof HTMLElement ? document.activeElement : null
    };

    requestAnimationFrame(() => {
      (nextRequest.kind === 'confirm' ? cancelButton : confirmButton).focus();
    });
  }

  function resolveActiveRequest(result) {
    if (!activeRequest) {
      return;
    }

    const { overlay, resolve, restoreFocusTo } = activeRequest;
    activeRequest = null;

    overlay.hidden = true;
    overlay.className = 'crfv-dialog-overlay';
    document.body.classList.remove('crfv-dialog-open');

    if (restoreFocusTo && typeof restoreFocusTo.focus === 'function') {
      restoreFocusTo.focus();
    }

    resolve(result);
    showNextRequest();
  }

  function enqueueRequest(kind, message, options = {}) {
    return new Promise(resolve => {
      requestQueue.push({
        kind,
        message,
        options,
        resolve
      });
      showNextRequest();
    });
  }

  window.crfvDialog = {
    alert(message, options = {}) {
      return enqueueRequest('alert', message, options);
    },
    confirm(message, options = {}) {
      return enqueueRequest('confirm', message, options);
    }
  };
})();
