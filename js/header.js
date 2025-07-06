document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    const performSearch = () => {
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
        }
    };

    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});
