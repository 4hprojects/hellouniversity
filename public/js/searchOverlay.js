function createSearchOverlay() {
    const searchOverlayHTML = `
        <div 
          id="searchOverlay" 
          class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999] hidden"
        >
          <div class="bg-white rounded-md p-4 w-11/12 sm:w-3/5 lg:w-2/5 relative">
            <!-- Close Button -->
            <button class="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                    onclick="toggleSearchOverlay()"
                    aria-label="Close">
              <span class="material-icons">close</span>
            </button>

            <h2 class="text-lg font-semibold mb-4 text-gray-800">Search HelloUniversity</h2>
            <!-- Search Form -->
            <form onsubmit="return goToSearchPage()">
              <input 
                type="text" 
                id="overlaySearchInput"
                class="w-full mb-4 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="Type your search..."
              />
              <button 
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Search
              </button>
            </form>
          </div>
        </div>
    `;

    // Append to body
    const body = document.querySelector('body');
    body.insertAdjacentHTML('beforeend', searchOverlayHTML);
}

