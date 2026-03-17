(function attachAdminDashboardGrades(global) {
    const state = {
        gradeResults: [],
        currentPage: 1,
        rowsPerPage: 10,
        totalPages: 0,
        totalRows: 0,
        query: ''
    };

    function init() {
        const gradeSearchButton = document.getElementById('gradeSearchButton');
        const gradeSearchInput = document.getElementById('gradeSearchInput');
        const gradeSearchResetButton = document.getElementById('gradeSearchResetButton');
        const gradeUploadForm = document.getElementById('gradeUploadForm');

        if (gradeSearchButton) {
            gradeSearchButton.addEventListener('click', () => performGradeSearch(1));
        }

        if (gradeSearchInput) {
            gradeSearchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    performGradeSearch(1);
                }
            });
        }

        if (gradeSearchResetButton) {
            gradeSearchResetButton.addEventListener('click', resetGradeSearch);
        }

        if (gradeUploadForm) {
            gradeUploadForm.addEventListener('submit', handleGradeUpload);
        }
    }

    async function performGradeSearch(page) {
        const input = document.getElementById('gradeSearchInput');
        const query = input?.value?.trim() || '';

        if (!query) {
            resetGradeSearch();
            return;
        }

        state.query = query;
        state.currentPage = page;
        setMeta('Loading grade records...');

        try {
            const params = new URLSearchParams({
                query,
                page: String(state.currentPage),
                limit: String(state.rowsPerPage)
            });
            const response = await fetch(`/api/admin/grades?${params.toString()}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                renderEmptyState('gradeSearchResults', 7, data.message || 'No matching grade rows found.');
                state.gradeResults = [];
                state.totalRows = 0;
                state.totalPages = 0;
                renderGradePagination();
                updateOverviewCount();
                setMeta('No matching grade records found.');
                return;
            }

            state.gradeResults = Array.isArray(data.rows) ? data.rows : [];
            state.totalRows = data.pagination?.total || state.gradeResults.length;
            state.totalPages = data.pagination?.pages || 0;
            renderGradePage();
            renderGradePagination();
            updateOverviewCount();
            setMeta(`Showing ${state.gradeResults.length} of ${state.totalRows} grade record(s).`);
        } catch (error) {
            console.error('Grade search failed:', error);
            renderEmptyState('gradeSearchResults', 7, 'An error occurred while loading grade rows.');
            setMeta('Grade search failed.');
        }
    }

    function renderGradePage() {
        const tbody = document.getElementById('gradeSearchResults');
        if (!tbody) return;
        const pageRows = state.gradeResults;

        if (pageRows.length === 0) {
            renderEmptyState('gradeSearchResults', 7, 'No grade rows to display.');
            return;
        }

        tbody.innerHTML = pageRows.map((row) => `
            <tr>
                <td>${escapeHtml(row.studentIDNumber || 'N/A')}</td>
                <td>${escapeHtml(`${row.firstName || ''} ${row.lastName || ''}`.trim() || 'N/A')}</td>
                <td>${escapeHtml(row.courseID || 'N/A')}</td>
                <td>${escapeHtml(row.courseDescription || 'N/A')}</td>
                <td>${escapeHtml(row.midtermGrade || 'N/A')}</td>
                <td>${escapeHtml(row.finalGrade || 'N/A')}</td>
                <td>${escapeHtml(row.totalFinalGrade || 'N/A')}</td>
            </tr>
        `).join('');
    }

    function renderGradePagination() {
        const container = document.getElementById('gradePagination');
        if (!container) return;

        container.innerHTML = '';
        if (state.totalPages <= 1) return;

        const previousButton = createButton('Previous', state.currentPage === 1, () => {
            performGradeSearch(state.currentPage - 1);
        });

        const nextButton = createButton('Next', state.currentPage === state.totalPages, () => {
            performGradeSearch(state.currentPage + 1);
        });

        const status = document.createElement('span');
        status.className = 'pagination-status';
        status.textContent = `Page ${state.currentPage} of ${state.totalPages}`;

        container.append(previousButton, status, nextButton);
    }

    async function handleGradeUpload(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const status = document.getElementById('gradeUploadStatus');
        const formData = new FormData(form);

        if (status) {
            status.textContent = 'Uploading grades...';
        }

        try {
            const response = await fetch('/upload-grades', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Grade upload failed.');
            }

            form.reset();
            if (status) {
                status.textContent = data.message || 'Grades uploaded successfully.';
            }
            if (global.adminDashboardPanels) {
                global.adminDashboardPanels.showFlash('Grades uploaded successfully.', 'success');
            }
            if (state.query) {
                performGradeSearch(1);
            }
        } catch (error) {
            console.error('Grade upload failed:', error);
            if (status) {
                status.textContent = error.message;
            }
            if (global.adminDashboardPanels) {
                global.adminDashboardPanels.showFlash(error.message || 'Grade upload failed.', 'error');
            }
        }
    }

    function updateOverviewCount() {
        if (global.adminDashboardPanels) {
            global.adminDashboardPanels.updateSummary({ gradeCount: state.totalRows });
        }
    }

    function renderEmptyState(tbodyId, colspan, message) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="no-data">${escapeHtml(message)}</td></tr>`;
    }

    function createButton(label, disabled, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        return button;
    }

    function resetGradeSearch() {
        state.gradeResults = [];
        state.currentPage = 1;
        state.totalPages = 0;
        state.totalRows = 0;
        state.query = '';

        const input = document.getElementById('gradeSearchInput');
        if (input) {
            input.value = '';
        }

        renderEmptyState('gradeSearchResults', 7, 'Run a search to load grade rows.');
        renderGradePagination();
        updateOverviewCount();
        setMeta('Use search to load grade records.');
    }

    function setMeta(message) {
        const meta = document.getElementById('gradeSearchMeta');
        if (meta) {
            meta.textContent = message;
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    global.adminDashboardGrades = {
        init
    };
})(window);
