(function attachAdminDashboardPanels(global) {
    const state = {
        userCount: 0,
        gradeCount: 0,
        attendanceCount: 0
    };

    function init() {
        initializePanels();
        initializeReportShortcuts();
        global.adminDashboardState = state;
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
    }

    function updateSummary(partialState) {
        Object.assign(state, partialState);

        const userCountValue = document.getElementById('userCountValue');
        const gradeCountValue = document.getElementById('gradeCountValue');
        const attendanceCountValue = document.getElementById('attendanceCountValue');

        if (userCountValue) {
            userCountValue.textContent = String(state.userCount);
        }

        if (gradeCountValue) {
            gradeCountValue.textContent = String(state.gradeCount);
        }

        if (attendanceCountValue) {
            attendanceCountValue.textContent = String(state.attendanceCount);
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
