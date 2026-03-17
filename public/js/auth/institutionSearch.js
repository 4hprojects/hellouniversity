(function () {
    function byId(id) {
        return document.getElementById(id);
    }

    function setValue(id, value) {
        const element = byId(id);
        if (element) {
            element.value = value;
        }
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function createInstitutionSearchController() {
        const elements = {
            type: byId('institutionType'),
            input: byId('institutionSearch'),
            label: byId('institutionSearchLabel'),
            results: byId('institutionResults'),
            status: byId('institutionSearchStatus'),
            directoryToggle: byId('institutionDirectoryToggle'),
            manualToggle: byId('institutionManualToggle')
        };

        let currentItems = [];
        let manualMode = false;
        let debounceTimer = null;

        function syncFloatingLabel() {
            elements.input?.closest('.auth-field-floating')?.dispatchEvent(new CustomEvent('auth:sync-floating-label'));
        }

        function setStatus(message) {
            if (elements.status) {
                elements.status.textContent = message;
            }
        }

        function getSelectedType() {
            return String(elements.type?.value || '').trim();
        }

        function hasInstitutionType() {
            return Boolean(getSelectedType());
        }

        function getFieldLabel() {
            return manualMode ? 'Enter school name manually' : 'Search school in directory';
        }

        function getIdleStatus() {
            if (!hasInstitutionType()) {
                return 'Choose an institution type first, then add your school.';
            }

            if (manualMode) {
                return 'Enter your school name manually while keeping the institution type selected.';
            }

            return 'Search the school directory after choosing an institution type.';
        }

        function syncInputState() {
            const typeSelected = hasInstitutionType();

            if (elements.label) {
                elements.label.textContent = getFieldLabel();
            }

            if (elements.input) {
                elements.input.disabled = !typeSelected;
                elements.input.setAttribute('aria-disabled', typeSelected ? 'false' : 'true');
            }
        }

        function syncModeUI() {
            const states = [
                [elements.directoryToggle, !manualMode],
                [elements.manualToggle, manualMode]
            ];

            states.forEach(([button, active]) => {
                if (!button) {
                    return;
                }

                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }

        function clearSelection() {
            setValue('institutionId', '');
            setValue('institutionName', '');
            setValue('institutionSource', '');
            setValue('institutionNotListed', 'false');
        }

        function clearResults() {
            currentItems = [];
            if (elements.results) {
                elements.results.innerHTML = '';
                elements.results.style.display = 'none';
            }
        }

        function renderResults(items) {
            currentItems = items || [];

            if (!elements.results) {
                return;
            }

            if (!currentItems.length) {
                elements.results.innerHTML = '';
                elements.results.style.display = 'none';
                return;
            }

            elements.results.innerHTML = currentItems.map((item, index) => `
                <button type="button" class="auth-search-result" data-result-index="${index}">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${escapeHtml(item.city || '')}${item.city && item.region ? ', ' : ''}${escapeHtml(item.region || '')}</span>
                </button>
            `).join('');
            elements.results.style.display = 'grid';
        }

        async function search() {
            if (!elements.type || !elements.input) {
                return;
            }

            if (!hasInstitutionType()) {
                clearSelection();
                clearResults();
                setStatus(getIdleStatus());
                return;
            }

            if (manualMode) {
                const manualName = String(elements.input.value || '').trim();
                setValue('institutionName', manualName);
                setValue('institutionSource', manualName ? 'manual' : '');
                setValue('institutionNotListed', manualName ? 'true' : 'false');
                clearResults();
                setStatus(getIdleStatus());
                return;
            }

            clearSelection();
            clearResults();

            const type = getSelectedType();
            const query = String(elements.input.value || '').trim();

            if (query.length < 2) {
                setStatus('Type at least 2 characters to search your school.');
                return;
            }

            setStatus('Searching institutions...');

            try {
                const response = await fetch(`/api/institutions/search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(query)}`);
                const data = await response.json();
                const items = data.success ? (data.items || []) : [];
                renderResults(items);

                if (items.length) {
                    setStatus('Select your school from the results below, or switch to manual entry.');
                } else {
                    setStatus('No matching school found. Switch to manual entry if your school is not listed.');
                }
            } catch (error) {
                clearResults();
                setStatus('Unable to search schools right now. You can still switch to manual entry.');
            }
        }

        function selectResult(index) {
            const item = currentItems[index];
            if (!item || !elements.input) {
                return;
            }

            elements.input.value = item.name;
            setValue('institutionId', item.id);
            setValue('institutionName', item.name);
            setValue('institutionSource', 'directory');
            setValue('institutionNotListed', 'false');
            clearResults();
            syncFloatingLabel();
            setStatus(`Selected ${item.name}.`);
        }

        function setManualMode(nextValue) {
            manualMode = Boolean(nextValue);
            clearSelection();
            clearResults();

            if (elements.input) {
                elements.input.value = '';
                elements.input.placeholder = '';
            }

            syncModeUI();
            syncInputState();
            syncFloatingLabel();

            if (manualMode && hasInstitutionType()) {
                setValue('institutionSource', 'manual');
                setValue('institutionNotListed', 'true');
            }

            setStatus(getIdleStatus());
        }

        function attach() {
          if (!elements.type || !elements.input) {
              return;
          }

          elements.type.addEventListener('change', () => {
              clearSelection();
              clearResults();

              if (elements.input) {
                  elements.input.value = '';
              }

              syncInputState();
              syncFloatingLabel();
              setStatus(getIdleStatus());
          });

          elements.input.addEventListener('input', () => {
              if (debounceTimer) {
                  window.clearTimeout(debounceTimer);
              }

              debounceTimer = window.setTimeout(search, 220);
          });

          elements.directoryToggle?.addEventListener('click', () => {
              setManualMode(false);
          });

          elements.manualToggle?.addEventListener('click', () => {
              setManualMode(true);
          });

          elements.results?.addEventListener('click', (event) => {
              const button = event.target.closest('[data-result-index]');
              if (!button) {
                  return;
              }

              const index = Number(button.getAttribute('data-result-index'));
              selectResult(index);
          });

          syncModeUI();
          syncInputState();
          setStatus(getIdleStatus());
          syncFloatingLabel();
        }

        return {
            attach,
            getState() {
                return { manualMode };
            }
        };
    }

    window.createInstitutionSearchController = createInstitutionSearchController;
}());
