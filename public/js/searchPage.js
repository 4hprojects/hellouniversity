document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('siteSearchForm');
    const input = document.getElementById('siteSearchInput');
    const summary = document.getElementById('searchPageSummary');
    const emptyState = document.getElementById('searchPageEmptyState');
    const resultsSection = document.getElementById('searchResultsSection');
    const params = new URLSearchParams(window.location.search);
    const initialQuery = (params.get('q') || '').trim();

    function setVisibility(query) {
        const hasQuery = Boolean(query);
        if (emptyState) {
            emptyState.classList.toggle('search-page-hidden', hasQuery);
        }
        if (resultsSection) {
            resultsSection.classList.toggle('search-page-hidden', !hasQuery);
        }
        if (summary) {
            const emptyMessage = summary.getAttribute('data-empty-message') || 'Enter a search term to begin.';
            const queryLabel = summary.getAttribute('data-query-label') || 'Showing results for';
            summary.textContent = hasQuery ? `${queryLabel} "${query}".` : emptyMessage;
        }
    }

    function executeQueryWhenReady(query) {
        let attempts = 0;
        const maxAttempts = 40;

        const timer = window.setInterval(function () {
            const element = window.google?.search?.cse?.element?.getElement('huSearchResults');
            attempts += 1;

            if (element) {
                window.clearInterval(timer);
                element.execute(query);
                return;
            }

            if (attempts >= maxAttempts) {
                window.clearInterval(timer);
                if (summary) {
                    summary.textContent = 'Search is taking longer to load. Please try your query again.';
                }
            }
        }, 250);
    }

    if (form && input) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            const query = input.value.trim();

            if (!query) {
                window.location.assign('/search');
                return;
            }

            window.location.assign(`/search?q=${encodeURIComponent(query)}`);
        });
    }

    setVisibility(initialQuery);
    if (initialQuery) {
        executeQueryWhenReady(initialQuery);
    }
});
