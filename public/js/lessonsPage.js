document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('lessonsCatalogSearch');
  const clearButton = document.getElementById('lessonsClearFilters');
  const resultsLabel = document.getElementById('lessonsResultsLabel');
  const emptyState = document.getElementById('lessonsEmptyState');
  const filterButtons = Array.from(document.querySelectorAll('[data-lessons-filter]'));
  const trackCards = Array.from(document.querySelectorAll('[data-track-card]'));
  const sections = Array.from(document.querySelectorAll('[data-track-section]'));

  if (!trackCards.length) {
    return;
  }

  let activeFilter = 'all';

  function getVisibleTrackCount() {
    return trackCards.reduce((count, card) => count + (!card.hidden ? 1 : 0), 0);
  }

  function updateSectionVisibility() {
    sections.forEach((section) => {
      const visibleTracks = section.querySelectorAll('[data-track-card]:not([hidden])').length;
      section.hidden = visibleTracks === 0;

      const countLabel = section.querySelector('[data-section-count]');
      if (countLabel) {
        countLabel.textContent = `${visibleTracks} track${visibleTracks === 1 ? '' : 's'}`;
      }
    });
  }

  function updateResultsLabel() {
    if (!resultsLabel) {
      return;
    }

    const visibleTrackCount = getVisibleTrackCount();
    const trimmedQuery = searchInput ? searchInput.value.trim() : '';

    if (!visibleTrackCount) {
      resultsLabel.textContent = 'No tracks match the current filters';
      return;
    }

    if (activeFilter === 'all' && !trimmedQuery) {
      resultsLabel.textContent = `Showing all ${visibleTrackCount} tracks`;
      return;
    }

    const filterText =
      activeFilter === 'all'
        ? 'all categories'
        : filterButtons.find((button) => button.dataset.lessonsFilter === activeFilter)?.textContent?.trim() || activeFilter;

    resultsLabel.textContent = `Showing ${visibleTrackCount} track${visibleTrackCount === 1 ? '' : 's'} for ${filterText}`;
  }

  function applyFilters() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    trackCards.forEach((card) => {
      const domain = card.dataset.domain || 'all';
      const searchText = card.dataset.search || '';
      const matchesFilter = activeFilter === 'all' || domain === activeFilter;
      const matchesQuery = !query || searchText.includes(query);

      card.hidden = !(matchesFilter && matchesQuery);
    });

    updateSectionVisibility();
    updateResultsLabel();

    if (emptyState) {
      emptyState.hidden = getVisibleTrackCount() !== 0;
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.lessonsFilter || 'all';

      filterButtons.forEach((otherButton) => {
        const isActive = otherButton === button;
        otherButton.classList.toggle('lessons-filter-chip-active', isActive);
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
        const isActive = button.dataset.lessonsFilter === 'all';
        button.classList.toggle('lessons-filter-chip-active', isActive);
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
