document.addEventListener('DOMContentLoaded', () => {
  const state = {
    sidebarPreference: null
  };

  const searchInput = document.getElementById('blogCatalogSearch');
  const clearButton = document.getElementById('blogClearFilters');
  const resultsLabel = document.getElementById('blogResultsLabel');
  const emptyState = document.getElementById('blogEmptyState');
  const filterButtons = Array.from(document.querySelectorAll('[data-blog-filter]'));
  const blogCards = Array.from(document.querySelectorAll('[data-blog-entry]'));
  const layout = document.getElementById('blogHubShell');
  const sidebar = document.getElementById('blogHubSidebar');
  const sidebarToggle = document.getElementById('blogHubSidebarToggle');
  const sidebarToggleIcon = document.getElementById('blogHubSidebarToggleIcon');

  let activeFilter = 'all';

  function applySidebarState(isCollapsed) {
    if (!sidebar || !sidebarToggle) {
      return;
    }

    sidebar.classList.toggle('blog-hub-sidebar-collapsed', isCollapsed);
    sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
    sidebarToggle.setAttribute('aria-label', isCollapsed ? 'Expand blogs menu' : 'Collapse blogs menu');
    sidebarToggle.setAttribute('title', isCollapsed ? 'Expand blogs menu' : 'Collapse blogs menu');

    if (sidebarToggleIcon) {
      sidebarToggleIcon.textContent = isCollapsed ? 'menu' : 'close';
    }
  }

  function updateAdaptiveSidebarMode() {
    if (!layout || !sidebar) {
      return;
    }

    const layoutWidth = layout.clientWidth || 0;
    const isCompactViewport = window.innerWidth <= 900;
    const shouldAutoCollapse = !isCompactViewport && layoutWidth > 0 && layoutWidth < 1120;

    sidebar.classList.toggle('blog-hub-sidebar-auto', shouldAutoCollapse);

    if (state.sidebarPreference === 'collapsed') {
      applySidebarState(true);
      return;
    }

    if (state.sidebarPreference === 'expanded') {
      applySidebarState(false);
      return;
    }

    applySidebarState(shouldAutoCollapse);
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const willCollapse = !sidebar?.classList.contains('blog-hub-sidebar-collapsed');
      state.sidebarPreference = willCollapse ? 'collapsed' : 'expanded';
      applySidebarState(willCollapse);
    });
  }

  updateAdaptiveSidebarMode();
  window.addEventListener('resize', updateAdaptiveSidebarMode);

  if (!blogCards.length) {
    return;
  }

  function getVisibleCount() {
    return blogCards.reduce((count, card) => count + (!card.hidden ? 1 : 0), 0);
  }

  function updateResultsLabel() {
    if (!resultsLabel) {
      return;
    }

    const visibleCount = getVisibleCount();
    const trimmedQuery = searchInput ? searchInput.value.trim() : '';

    if (!visibleCount) {
      resultsLabel.textContent = 'No blog posts match the current filters';
      return;
    }

    if (activeFilter === 'all' && !trimmedQuery) {
      resultsLabel.textContent = `Showing all ${visibleCount} blog posts`;
      return;
    }

    const filterText =
      activeFilter === 'all'
        ? 'all categories'
        : filterButtons.find((button) => button.dataset.blogFilter === activeFilter)?.textContent?.trim() || activeFilter;

    resultsLabel.textContent = `Showing ${visibleCount} blog posts for ${filterText}`;
  }

  function applyFilters() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    blogCards.forEach((card) => {
      const category = card.dataset.category || 'all';
      const searchText = card.dataset.search || '';
      const matchesFilter = activeFilter === 'all' || category === activeFilter;
      const matchesQuery = !query || searchText.includes(query);

      card.hidden = !(matchesFilter && matchesQuery);
    });

    updateResultsLabel();

    if (emptyState) {
      emptyState.hidden = getVisibleCount() !== 0;
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.blogFilter || 'all';

      filterButtons.forEach((otherButton) => {
        const isActive = otherButton === button;
        otherButton.classList.toggle('blog-hub-filter-chip-active', isActive);
        otherButton.setAttribute('aria-pressed', String(isActive));
      });

      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      activeFilter = 'all';

      if (searchInput) {
        searchInput.value = '';
      }

      filterButtons.forEach((button) => {
        const isActive = button.dataset.blogFilter === 'all';
        button.classList.toggle('blog-hub-filter-chip-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

      applyFilters();

      if (searchInput) {
        searchInput.focus();
      }
    });
  }

  applyFilters();
});
