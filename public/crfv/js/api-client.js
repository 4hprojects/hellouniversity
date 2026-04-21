(function initializeCrfvApi(globalScope) {
  const state = {
    csrfToken: '',
    csrfRequest: null,
  };

  async function loadCsrfToken(forceRefresh = false) {
    if (!forceRefresh && state.csrfToken) {
      return state.csrfToken;
    }

    if (!state.csrfRequest || forceRefresh) {
      state.csrfRequest = fetch('/api/csrf-token', {
        credentials: 'same-origin',
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.success || !payload?.csrfToken) {
            throw new Error(payload?.message || 'Unable to load CSRF token.');
          }

          state.csrfToken = payload.csrfToken;
          return state.csrfToken;
        })
        .finally(() => {
          state.csrfRequest = null;
        });
    }

    return state.csrfRequest;
  }

  async function request(url, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = { ...(options.headers || {}) };
    const isJsonBody = options.body && !(options.body instanceof FormData);

    if (isJsonBody && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      headers['X-CSRF-Token'] = await loadCsrfToken();
    }

    let response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: options.credentials || 'same-origin',
    });

    if (
      response.status === 403 &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    ) {
      const payload = await response
        .clone()
        .json()
        .catch(() => ({}));
      if (
        String(payload?.message || '')
          .toLowerCase()
          .includes('csrf')
      ) {
        headers['X-CSRF-Token'] = await loadCsrfToken(true);
        response = await fetch(url, {
          ...options,
          method,
          headers,
          credentials: options.credentials || 'same-origin',
        });
      }
    }

    return response;
  }

  async function requestJson(url, options = {}) {
    const response = await request(url, options);
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  globalScope.CRFVApi = {
    loadCsrfToken,
    request,
    requestJson,
  };
})(typeof window !== 'undefined' ? window : globalThis);
