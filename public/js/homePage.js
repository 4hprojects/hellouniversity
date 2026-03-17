(function attachHomePage(global) {
    const state = {
        sidebarPreference: null
    };

    const selectors = {
        layout: 'homeShell',
        sidebar: 'homeDashboardSidebar',
        sidebarToggle: 'homeDashboardSidebarToggle',
        sidebarToggleIcon: 'homeDashboardSidebarToggleIcon'
    };

    function init() {
        attachSidebarToggle();
        updateAdaptiveSidebarMode();
        global.addEventListener('resize', updateAdaptiveSidebarMode);
    }

    function attachSidebarToggle() {
        const sidebar = document.getElementById(selectors.sidebar);
        const toggle = document.getElementById(selectors.sidebarToggle);
        if (!sidebar || !toggle) return;

        toggle.addEventListener('click', () => {
            const willCollapse = !sidebar.classList.contains('home-dashboard-sidebar-collapsed');
            state.sidebarPreference = willCollapse ? 'collapsed' : 'expanded';
            applySidebarState(willCollapse);
        });
    }

    function updateAdaptiveSidebarMode() {
        const layout = document.getElementById(selectors.layout);
        const sidebar = document.getElementById(selectors.sidebar);
        if (!layout || !sidebar) return;

        const layoutWidth = layout.clientWidth || 0;
        const isCompactViewport = global.innerWidth <= 980;
        const shouldAutoCollapse = !isCompactViewport && layoutWidth > 0 && layoutWidth < 1120;

        sidebar.classList.toggle('home-dashboard-sidebar-auto', shouldAutoCollapse);

        if (isCompactViewport) {
            applySidebarState(false);
            return;
        }

        if (shouldAutoCollapse) {
            applySidebarState(true);
            return;
        }

        if (state.sidebarPreference === 'collapsed') {
            applySidebarState(true);
            return;
        }

        applySidebarState(false);
    }

    function applySidebarState(isCollapsed) {
        const sidebar = document.getElementById(selectors.sidebar);
        const toggle = document.getElementById(selectors.sidebarToggle);
        const icon = document.getElementById(selectors.sidebarToggleIcon);
        if (!sidebar || !toggle) return;

        sidebar.classList.toggle('home-dashboard-sidebar-collapsed', isCollapsed);
        toggle.setAttribute('aria-expanded', String(!isCollapsed));
        toggle.setAttribute('aria-label', isCollapsed ? 'Expand home menu' : 'Collapse home menu');
        toggle.setAttribute('title', isCollapsed ? 'Expand home menu' : 'Collapse home menu');

        if (icon) {
            icon.textContent = isCollapsed ? '\u2630' : '\u2190';
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})(window);
