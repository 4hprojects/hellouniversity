(function attachAdminDashboardPanels(global) {
    const state = {
        userCount: 0,
        gradeCount: 0,
        attendanceCount: 0
    };

    function init() {
        initializePanels();
        initializeReportShortcuts();
        loadUserCountSummary();
        global.adminDashboardState = state;
    }

    async function loadUserCountSummary() {
        try {
            const response = await fetch('/api/admin/users?limit=1', { credentials: 'include' });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load user count.');
            }

            updateSummary({ userCount: data.pagination?.total ?? 0 });
        } catch (error) {
            console.error('Admin overview user count load failed:', error);
            const userCountValue = document.getElementById('userCountValue');
            if (userCountValue) {
                userCountValue.textContent = 'Open Users to see this';
            }
        }
    }

    function initializePanels() {
        const panelLinks = document.querySelectorAll('[data-panel]');
        panelLinks.forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                showPanel(link.dataset.panel);
            });
        });
    }

    function initializeReportShortcuts() {
        document.querySelectorAll('[data-panel-target]').forEach((button) => {
            button.addEventListener('click', () => showPanel(button.dataset.panelTarget));
        });
    }

    function showPanel(panelId) {
        document.querySelectorAll('.content-panel').forEach((panel) => {
            panel.classList.toggle('hidden', panel.id !== panelId);
        });

        document.querySelectorAll('[data-panel]').forEach((link) => {
            link.classList.toggle('active', link.dataset.panel === panelId);
        });

        // Close mobile sidebar drawer after navigating to a panel
        document.body.classList.remove('sidebar-open');
    }

    function updateSummary(partialState) {
        Object.assign(state, partialState);

        const userCountValue = document.getElementById('userCountValue');
        const gradeCountValue = document.getElementById('gradeCountValue');
        const attendanceCountValue = document.getElementById('attendanceCountValue');

        if (userCountValue) {
            userCountValue.textContent = String(state.userCount);
            userCountValue.classList.remove('stat-placeholder');
        }

        if (gradeCountValue) {
            gradeCountValue.textContent = String(state.gradeCount);
            gradeCountValue.classList.remove('stat-placeholder');
        }

        if (attendanceCountValue) {
            attendanceCountValue.textContent = String(state.attendanceCount);
            attendanceCountValue.classList.remove('stat-placeholder');
        }
    }

    function showFlash(message, type) {
        const flash = document.getElementById('flashMessage');
        if (!flash) return;

        flash.textContent = message;
        flash.className = `flash-message flash-${type || 'info'}`;
        flash.classList.remove('hidden');

        window.clearTimeout(showFlash.timeoutId);
        showFlash.timeoutId = window.setTimeout(() => {
            flash.classList.add('hidden');
        }, 4000);
    }

    global.adminDashboardPanels = {
        init,
        showPanel,
        updateSummary,
        showFlash
    };
})(window);
