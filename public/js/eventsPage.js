document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('eventsCatalogSearch');
  const clearButton = document.getElementById('eventsClearFilters');
  const resultsLabel = document.getElementById('eventsResultsLabel');
  const emptyState = document.getElementById('eventsEmptyState');
  const filterButtons = Array.from(document.querySelectorAll('[data-events-filter]'));
  const eventCards = Array.from(document.querySelectorAll('[data-event-card]'));

  if (!eventCards.length) {
    return;
  }

  let activeFilter = 'all';

  function getVisibleCardCount() {
    return eventCards.reduce((count, card) => count + (!card.hidden ? 1 : 0), 0);
  }

  function updateResultsLabel() {
    if (!resultsLabel) {
      return;
    }

    const visibleCardCount = getVisibleCardCount();
    const trimmedQuery = searchInput ? searchInput.value.trim() : '';

    if (!visibleCardCount) {
      resultsLabel.textContent = 'No event pages match the current filters';
      return;
    }

    if (activeFilter === 'all' && !trimmedQuery) {
      resultsLabel.textContent = `Showing all ${visibleCardCount} event pages`;
      return;
    }

    const filterText =
      activeFilter === 'all'
        ? 'all page types'
        : filterButtons.find((button) => button.dataset.eventsFilter === activeFilter)?.textContent?.trim() || activeFilter;

    resultsLabel.textContent = `Showing ${visibleCardCount} page${visibleCardCount === 1 ? '' : 's'} for ${filterText}`;
  }

  function applyFilters() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    eventCards.forEach((card) => {
      const type = card.dataset.type || 'all';
      const searchText = card.dataset.search || '';
      const matchesFilter = activeFilter === 'all' || type === activeFilter;
      const matchesQuery = !query || searchText.includes(query);

      card.hidden = !(matchesFilter && matchesQuery);
    });

    updateResultsLabel();

    if (emptyState) {
      emptyState.hidden = getVisibleCardCount() !== 0;
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.eventsFilter || 'all';

      filterButtons.forEach((otherButton) => {
        const isActive = otherButton === button;
        otherButton.classList.toggle('events-filter-chip-active', isActive);
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
        const isActive = button.dataset.eventsFilter === 'all';
        button.classList.toggle('events-filter-chip-active', isActive);
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
