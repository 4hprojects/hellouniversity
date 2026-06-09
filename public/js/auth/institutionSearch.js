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

    function formatInstitutionType(value) {
        switch (value) {
            case 'senior_high_school':
                return 'Senior High School';
            case 'college':
                return 'College';
            case 'university':
                return 'University';
            default:
                return 'School';
        }
    }

    function formatLocation(item) {
        return [
            item.city,
            item.province,
            item.region
        ].filter(Boolean).join(', ');
    }

    function createInstitutionSearchController() {
        const elements = {
            type: byId('institutionType'),
            input: byId('institutionSearch'),
            label: byId('institutionSearchLabel'),
            results: byId('institutionResults'),
            status: byId('institutionSearchStatus'),
            selected: byId('institutionSelected'),
            directoryToggle: byId('institutionDirectoryToggle'),
            manualToggle: byId('institutionManualToggle')
        };

        let currentItems = [];
        let manualMode = false;
        let debounceTimer = null;
        let activeIndex = -1;
        let selectedInstitution = null;

        function syncFloatingLabel() {
            elements.input?.closest('.auth-field-floating')?.dispatchEvent(new CustomEvent('auth:sync-floating-label'));
        }

        function setStatus(message, state) {
            if (!elements.status) {
                return;
            }

            elements.status.textContent = message;
            elements.status.dataset.state = state || 'idle';
        }

        function getSelectedType() {
            return String(elements.type?.value || '').trim();
        }

        function hasInstitutionType() {
            return Boolean(getSelectedType());
        }

        function setExpanded(isExpanded) {
            if (elements.input) {
                elements.input.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            }
        }

        function setActiveIndex(nextIndex) {
            activeIndex = nextIndex;

            if (elements.input) {
                if (activeIndex >= 0) {
                    elements.input.setAttribute('aria-activedescendant', `institutionResult-${activeIndex}`);
                } else {
                    elements.input.removeAttribute('aria-activedescendant');
                }
            }

            elements.results?.querySelectorAll('[role="option"]').forEach((option, index) => {
                const active = index === activeIndex;
                option.classList.toggle('is-active', active);
                option.setAttribute('aria-selected', active ? 'true' : 'false');
                if (active) {
                    option.scrollIntoView({ block: 'nearest' });
                }
            });
        }

        function getIdleStatus() {
            if (!hasInstitutionType()) {
                return 'Choose an institution type first, then search the directory.';
            }

            if (manualMode) {
                return 'Manual entry is active. Type your full school name.';
            }

            return 'Search by school, city, or province.';
        }

        function syncInputState() {
            const typeSelected = hasInstitutionType();

            if (elements.label) {
                elements.label.textContent = manualMode ? 'School name' : 'Search school in directory';
            }

            if (elements.input) {
                elements.input.disabled = !typeSelected;
                elements.input.placeholder = typeSelected
                    ? (manualMode ? 'Type your full school name' : 'Search by school, city, or province')
                    : '';
                elements.input.setAttribute('aria-disabled', typeSelected ? 'false' : 'true');
                elements.input.setAttribute('role', 'combobox');
                elements.input.setAttribute('aria-autocomplete', 'list');
                elements.input.setAttribute('aria-controls', 'institutionResults');
                elements.input.setAttribute('aria-haspopup', 'listbox');
                setExpanded(false);
            }

            if (elements.results) {
                elements.results.setAttribute('role', 'listbox');
                elements.results.setAttribute('aria-label', 'Institution search results');
            }
        }

        function syncModeUI() {
            if (elements.manualToggle) {
                elements.manualToggle.hidden = manualMode || !hasInstitutionType();
            }

            if (elements.directoryToggle) {
                elements.directoryToggle.hidden = !manualMode;
            }

            elements.input?.closest('.auth-form-section')?.classList.toggle('is-manual-school-entry', manualMode);
        }

        function clearSelection() {
            selectedInstitution = null;
            setValue('institutionId', '');
            setValue('institutionName', '');
            setValue('institutionSource', '');
            setValue('institutionNotListed', 'false');
            renderSelected();
        }

        function clearResults() {
            currentItems = [];
            activeIndex = -1;
            if (elements.results) {
                elements.results.innerHTML = '';
                elements.results.style.display = 'none';
            }
            setExpanded(false);
            elements.input?.removeAttribute('aria-activedescendant');
        }

        function renderSelected() {
            if (!elements.selected) {
                return;
            }

            if (!selectedInstitution) {
                elements.selected.hidden = true;
                elements.selected.innerHTML = '';
                return;
            }

            const location = formatLocation(selectedInstitution) || 'Philippines';
            elements.selected.hidden = false;
            elements.selected.innerHTML = `
                <div class="auth-selected-school-copy">
                    <span class="auth-search-badge">${escapeHtml(formatInstitutionType(selectedInstitution.type))}</span>
                    <strong>${escapeHtml(selectedInstitution.name)}</strong>
                    <small>${escapeHtml(location)}</small>
                </div>
                <button type="button" class="auth-text-action auth-selected-school-change" data-institution-change>Change</button>
            `;
        }

        function renderResults(items) {
            currentItems = items || [];
            activeIndex = -1;

            if (!elements.results) {
                return;
            }

            if (!currentItems.length) {
                elements.results.innerHTML = `
                    <div class="auth-search-empty">
                        <strong>No matching school found.</strong>
                        <span>Try a city, province, or a shorter school name.</span>
                        <button type="button" class="auth-text-action" data-institution-manual-empty>Enter school manually</button>
                    </div>
                `;
                elements.results.style.display = 'grid';
                setExpanded(true);
                return;
            }

            elements.results.innerHTML = currentItems.map((item, index) => {
                const location = formatLocation(item) || 'Philippines';
                const type = formatInstitutionType(item.type);
                return `
                    <button
                        type="button"
                        id="institutionResult-${index}"
                        class="auth-search-result"
                        role="option"
                        aria-selected="false"
                        data-result-index="${index}"
                    >
                        <span class="auth-search-result-main">
                            <strong>${escapeHtml(item.name)}</strong>
                            <small>${escapeHtml(location)}</small>
                        </span>
                        <span class="auth-search-badge">${escapeHtml(type)}</span>
                    </button>
                `;
            }).join('');
            elements.results.style.display = 'grid';
            setExpanded(true);
        }

        async function search() {
            if (!elements.type || !elements.input) {
                return;
            }

            if (!hasInstitutionType()) {
                clearSelection();
                clearResults();
                syncModeUI();
                setStatus(getIdleStatus(), 'idle');
                return;
            }

            if (manualMode) {
                const manualName = String(elements.input.value || '').trim();
                selectedInstitution = null;
                setValue('institutionId', '');
                setValue('institutionName', manualName);
                setValue('institutionSource', manualName ? 'manual' : '');
                setValue('institutionNotListed', manualName ? 'true' : 'false');
                renderSelected();
                clearResults();
                setStatus(getIdleStatus(), 'manual');
                return;
            }

            const type = getSelectedType();
            const query = String(elements.input.value || '').trim();

            if (selectedInstitution && query !== selectedInstitution.name) {
                clearSelection();
            }

            if (query.length < 2) {
                clearResults();
                if (!selectedInstitution) {
                    setValue('institutionSource', '');
                    setValue('institutionNotListed', 'false');
                }
                setStatus('Type at least 2 characters to search your school.', 'idle');
                return;
            }

            setStatus('Searching schools...', 'loading');

            try {
                const response = await fetch(`/api/institutions/search?type=${encodeURIComponent(type)}&q=${encodeURIComponent(query)}`);
                const data = await response.json();
                const items = data.success ? (data.items || []) : [];
                renderResults(items);

                if (items.length) {
                    setStatus(`${items.length} matching schools found. Select the correct school below.`, 'results');
                } else {
                    setStatus('No matching school found.', 'empty');
                }
            } catch (error) {
                clearResults();
                setStatus('Unable to search schools right now. You can still enter your school manually.', 'error');
            }
        }

        function selectResult(index) {
            const item = currentItems[index];
            if (!item || !elements.input) {
                return;
            }

            selectedInstitution = item;
            elements.input.value = item.name;
            setValue('institutionId', item.id);
            setValue('institutionName', item.name);
            setValue('institutionSource', 'directory');
            setValue('institutionNotListed', 'false');
            clearResults();
            renderSelected();
            syncFloatingLabel();
            elements.input.dispatchEvent(new Event('change', { bubbles: true }));
            setStatus(`Selected ${item.name}.`, 'selected');
        }

        function setManualMode(nextValue) {
            manualMode = Boolean(nextValue);
            clearSelection();
            clearResults();

            if (elements.input) {
                elements.input.value = '';
            }

            syncModeUI();
            syncInputState();
            syncFloatingLabel();

            if (manualMode && hasInstitutionType()) {
                setValue('institutionSource', 'manual');
                setValue('institutionNotListed', 'true');
            }

            setStatus(getIdleStatus(), manualMode ? 'manual' : 'idle');
            if (manualMode && elements.input && hasInstitutionType()) {
                elements.input.focus();
            }
        }

        function scheduleSearch() {
            if (debounceTimer) {
                window.clearTimeout(debounceTimer);
            }

            debounceTimer = window.setTimeout(search, 220);
        }

        function handleInputKeydown(event) {
            if (manualMode) {
                return;
            }

            if (event.key === 'Escape') {
                clearResults();
                return;
            }

            if (!currentItems.length) {
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(activeIndex < currentItems.length - 1 ? activeIndex + 1 : 0);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(activeIndex > 0 ? activeIndex - 1 : currentItems.length - 1);
            } else if (event.key === 'Enter' && activeIndex >= 0) {
                event.preventDefault();
                selectResult(activeIndex);
            }
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
              syncModeUI();
              syncFloatingLabel();
              setStatus(getIdleStatus(), 'idle');

              if (hasInstitutionType()) {
                  elements.input.focus();
              }
          });

          elements.input.addEventListener('input', () => {
              if (selectedInstitution && elements.input.value !== selectedInstitution.name) {
                  clearSelection();
              }
              scheduleSearch();
          });

          elements.input.addEventListener('keydown', handleInputKeydown);

          elements.directoryToggle?.addEventListener('click', () => {
              setManualMode(false);
          });

          elements.manualToggle?.addEventListener('click', () => {
              setManualMode(true);
          });

          elements.results?.addEventListener('click', (event) => {
              const manualEmpty = event.target.closest('[data-institution-manual-empty]');
              if (manualEmpty) {
                  setManualMode(true);
                  return;
              }

              const button = event.target.closest('[data-result-index]');
              if (!button) {
                  return;
              }

              const index = Number(button.getAttribute('data-result-index'));
              selectResult(index);
          });

          elements.selected?.addEventListener('click', (event) => {
              const changeButton = event.target.closest('[data-institution-change]');
              if (!changeButton || !elements.input) {
                  return;
              }

              clearSelection();
              elements.input.value = '';
              syncFloatingLabel();
              setStatus(getIdleStatus(), 'idle');
              elements.input.focus();
          });

          syncModeUI();
          syncInputState();
          setStatus(getIdleStatus(), 'idle');
          syncFloatingLabel();
        }

        return {
            attach,
            getState() {
                return { manualMode, selectedInstitution };
            }
        };
    }

    window.createInstitutionSearchController = createInstitutionSearchController;
}());
