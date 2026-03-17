document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('booksCatalogSearch');
  const clearButton = document.getElementById('booksClearFilters');
  const resultsLabel = document.getElementById('booksResultsLabel');
  const emptyState = document.getElementById('booksEmptyState');
  const entryResults = document.getElementById('booksEntryResults');
  const filterButtons = Array.from(document.querySelectorAll('[data-books-filter]'));
  const seriesCards = Array.from(document.querySelectorAll('[data-book-series]'));
  const entryCards = Array.from(document.querySelectorAll('[data-book-entry]'));

  if (!seriesCards.length) {
    return;
  }

  let activeFilter = 'all';

  function getVisibleSeriesCount() {
    return seriesCards.reduce((count, card) => count + (!card.hidden ? 1 : 0), 0);
  }

  function getVisibleEntryCount() {
    return entryCards.reduce((count, card) => count + (!card.hidden ? 1 : 0), 0);
  }

  function updateResultsLabel() {
    if (!resultsLabel) {
      return;
    }

    const visibleSeriesCount = getVisibleSeriesCount();
    const visibleEntryCount = getVisibleEntryCount();
    const trimmedQuery = searchInput ? searchInput.value.trim() : '';

    if (!visibleSeriesCount && !visibleEntryCount) {
      resultsLabel.textContent = 'No reading entries or series match the current filters';
      return;
    }

    if (activeFilter === 'all' && !trimmedQuery) {
      resultsLabel.textContent = `Showing all ${visibleSeriesCount} reading series`;
      return;
    }

    const filterText =
      activeFilter === 'all'
        ? 'all categories'
        : filterButtons.find((button) => button.dataset.booksFilter === activeFilter)?.textContent?.trim() || activeFilter;

    if (trimmedQuery) {
      const entryLabel = `${visibleEntryCount} direct ${visibleEntryCount === 1 ? 'match' : 'matches'}`;
      const seriesLabel = `${visibleSeriesCount} ${visibleSeriesCount === 1 ? 'series' : 'series'}`;
      resultsLabel.textContent = `Showing ${entryLabel} and ${seriesLabel} for ${filterText}`;
      return;
    }

    resultsLabel.textContent = `Showing ${visibleSeriesCount} reading series for ${filterText}`;
  }

  function applyFilters() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    seriesCards.forEach((card) => {
      const domain = card.dataset.domain || 'all';
      const searchText = card.dataset.search || '';
      const matchesFilter = activeFilter === 'all' || domain === activeFilter;
      const matchesQuery = !query || searchText.includes(query);

      card.hidden = !(matchesFilter && matchesQuery);
    });

    entryCards.forEach((card) => {
      const domain = card.dataset.domain || 'all';
      const searchText = card.dataset.search || '';
      const matchesFilter = activeFilter === 'all' || domain === activeFilter;
      const matchesQuery = Boolean(query) && searchText.includes(query);

      card.hidden = !(matchesFilter && matchesQuery);
    });

    updateResultsLabel();

    if (entryResults) {
      entryResults.hidden = !query || getVisibleEntryCount() === 0;
    }

    if (emptyState) {
      emptyState.hidden = getVisibleSeriesCount() !== 0 || getVisibleEntryCount() !== 0;
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.booksFilter || 'all';

      filterButtons.forEach((otherButton) => {
        const isActive = otherButton === button;
        otherButton.classList.toggle('books-filter-chip-active', isActive);
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
        const isActive = button.dataset.booksFilter === 'all';
        button.classList.toggle('books-filter-chip-active', isActive);
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
