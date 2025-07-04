document.addEventListener('DOMContentLoaded', () => {
    const trackList = document.getElementById('track-list');
    const paginationContainer = document.querySelector('.pagination');
    const searchResultsTitle = document.getElementById('search-results-title');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const audioPlayer = document.getElementById('audio-player');
    let currentPlayingButton = null;

    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    const loadSearchResults = async (searchQuery, page = 1) => {
        if (!searchQuery) {
            trackList.innerHTML = '<p>Введите поисковый запрос, чтобы найти музыку.</p>';
            return;
        }

        searchResultsTitle.textContent = `Результаты поиска по запросу: "${escapeHTML(searchQuery)}"`;
        searchInput.value = searchQuery;
        trackList.innerHTML = '<p>Идет поиск...</p>';

        try {
            const response = await fetch(`/api/tracks/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`);
            if (!response.ok) {
                throw new Error('Ошибка при выполнении поиска.');
            }
            const data = await response.json();

            trackList.innerHTML = '';
            if (data.tracks.length === 0) {
                trackList.innerHTML = `<p>По запросу "${escapeHTML(searchQuery)}" ничего не найдено.</p>`;
                paginationContainer.innerHTML = '';
                return;
            }

            data.tracks.forEach(track => {
                const trackItem = document.createElement('div');
                trackItem.className = 'track-item';
                trackItem.innerHTML = `
                    <div class="track-info-container">
                        <button class="play-btn" data-src="/${track.filePath}"><i class="fa fa-play"></i></button>
                        <div class="track-details">
                            <span class="track-title">${escapeHTML(track.title)}</span>
                            <span class="track-author">${escapeHTML(track.author.name)}</span>
                        </div>
                    </div>
                `;
                trackList.appendChild(trackItem);
            });

            renderPagination(data.totalPages, data.currentPage, (newPage) => loadSearchResults(searchQuery, newPage));

        } catch (error) {
            console.error('Ошибка поиска:', error);
            trackList.innerHTML = `<p>${error.message}</p>`;
        }
    };

    const renderPagination = (totalPages, currentPage, loadFn) => {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = 'page-btn';
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => loadFn(i));
            paginationContainer.appendChild(pageButton);
        }
    };

    trackList.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.play-btn');
        if (playBtn) {
            e.preventDefault();
            const audioSrc = playBtn.dataset.src;
            if (audioPlayer.src.endsWith(audioSrc) && !audioPlayer.paused) {
                audioPlayer.pause();
                playBtn.innerHTML = '<i class="fa fa-play"></i>';
            } else {
                if (currentPlayingButton) {
                    currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
                }
                audioPlayer.src = audioSrc;
                audioPlayer.play();
                playBtn.innerHTML = '<i class="fa fa-pause"></i>';
                currentPlayingButton = playBtn;
            }
        }
    });

    const performSearch = () => {
        const newQuery = searchInput.value.trim();
        if (newQuery) {
            window.location.href = `/search.html?q=${encodeURIComponent(newQuery)}`;
        }
    };

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Initial load
    loadSearchResults(query);
});
