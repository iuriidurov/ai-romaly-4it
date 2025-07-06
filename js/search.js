document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const trackList = document.getElementById('track-list');
    const paginationContainer = document.querySelector('.pagination');
    const searchResultsTitle = document.getElementById('search-results-title');
    const searchInput = document.getElementById('search-input');
    const audioPlayer = document.getElementById('audio-player');

    // Add to Collection Modal Elements
    const addToCollectionModal = document.getElementById('add-to-collection-modal');
    const addToCollectionForm = document.getElementById('add-to-collection-form');
    const trackIdInput = document.getElementById('track-id-to-add');
    const collectionSelect = document.getElementById('collection-select');
    const addToCollectionCloseBtn = addToCollectionModal.querySelector('.close-btn');
    const statusMessage = addToCollectionForm.querySelector('.status-message');

    // --- State ---
    let currentPlayingButton = null;
    let currentUser = null;

    // --- Get Search Query ---
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    // --- DATA LOADING ---
    const loadSearchResults = async (q, page = 1) => {
        if (!q) {
            searchResultsTitle.textContent = 'Пожалуйста, введите поисковый запрос.';
            return;
        }

        searchResultsTitle.innerHTML = `Результаты поиска по запросу: "${escapeHTML(q)}"`;
        if (searchInput) {
             searchInput.value = q;
        }

        try {
            const response = await fetch(`/api/tracks/search?q=${encodeURIComponent(q)}&page=${page}`);
            if (!response.ok) {
                throw new Error('Ошибка при выполнении поиска.');
            }
            const data = await response.json();
            
            trackList.innerHTML = '';
            if (data.tracks.length === 0) {
                trackList.innerHTML = '<p>Ничего не найдено.</p>';
            } else {
                const isAdmin = currentUser && currentUser.role === 'admin';
                data.tracks.forEach(track => {
                    const trackItem = document.createElement('div');
                    trackItem.className = 'track-item';
                    const authorName = track.author ? track.author.name : 'Неизвестный автор';
                    const canDelete = currentUser && track.author && (currentUser.id === track.author._id || isAdmin);
                    
                    const deleteButtonHTML = canDelete ? `<a href="#" title="Удалить" class="delete-btn" data-id="${track._id}"><i class="fa fa-trash"></i></a>` : '';
                    const addToCollectionBtnHTML = isAdmin ? `<a href="#" title="Добавить в сборник" class="add-to-collection-btn" data-id="${track._id}"><i class="fa fa-plus"></i></a>` : '';

                    trackItem.innerHTML = `
                        <div class="track-play">
                            <button class="play-btn" data-src="/${track.filePath}"><i class="fa fa-play"></i></button>
                        </div>
                        <div class="track-info">
                            <span class="track-title">${escapeHTML(track.title)}</span>
                            <span class="track-author">${escapeHTML(authorName)}</span>
                        </div>
                        <div class="track-actions">
                            ${addToCollectionBtnHTML}
                            <a href="#" title="Поделиться" class="share-btn" data-id="${track._id}"><i class="fa fa-share-alt"></i></a>
                            <a href="/download/${track._id}" title="Скачать" class="download-btn" download><i class="fa fa-download"></i></a>
                            ${deleteButtonHTML}
                        </div>
                    `;
                    trackList.appendChild(trackItem);
                });
            }

            setupPagination(data.totalPages, data.currentPage, q);

        } catch (error) {
            console.error('Ошибка поиска:', error);
            trackList.innerHTML = `<p>${error.message}</p>`;
        }
    };

    const setupPagination = (totalPages, currentPage, q) => {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        if (currentPage > 1) {
            const prevLi = document.createElement('li');
            prevLi.innerHTML = `<a href="#" data-page="${currentPage - 1}">&laquo;</a>`;
            paginationContainer.appendChild(prevLi);
        }

        for (let i = 1; i <= totalPages; i++) {
            const pageLi = document.createElement('li');
            if (i === currentPage) pageLi.className = 'active';
            pageLi.innerHTML = `<a href="#" data-page="${i}">${i}</a>`;
            paginationContainer.appendChild(pageLi);
        }

        if (currentPage < totalPages) {
            const nextLi = document.createElement('li');
            nextLi.innerHTML = `<a href="#" data-page="${currentPage + 1}">&raquo;</a>`;
            paginationContainer.appendChild(nextLi);
        }
    };

    // --- EVENT LISTENERS ---

    paginationContainer.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.tagName === 'A') {
            const page = e.target.dataset.page;
            if (page) {
                loadSearchResults(query, parseInt(page));
            }
        }
    });

    trackList.addEventListener('click', async (e) => {
        const playBtn = e.target.closest('.play-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const addToCollectionBtn = e.target.closest('.add-to-collection-btn');
        const shareBtn = e.target.closest('.share-btn');

        if (playBtn) {
            e.preventDefault();
            const src = playBtn.dataset.src;
            if (currentPlayingButton === playBtn) {
                audioPlayer.pause();
                playBtn.innerHTML = '<i class="fa fa-play"></i>';
                playBtn.classList.remove('playing');
                currentPlayingButton = null;
            } else {
                if (currentPlayingButton) {
                    currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
                    currentPlayingButton.classList.remove('playing');
                }
                audioPlayer.src = src;
                audioPlayer.play();
                playBtn.innerHTML = '<i class="fa fa-pause"></i>';
                playBtn.classList.add('playing');
                currentPlayingButton = playBtn;
            }
        }

        if (deleteBtn) {
            e.preventDefault();
            const trackId = deleteBtn.dataset.id;
            if (confirm('Вы уверены, что хотите удалить этот трек?')) {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`/api/tracks/${trackId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Не удалось удалить трек.');
                    loadSearchResults(query, 1); // Reload results
                } catch (error) {
                    console.error('Ошибка при удалении трека:', error);
                    alert(error.message);
                }
            }
        }

        if (addToCollectionBtn) {
            e.preventDefault();
            const trackId = addToCollectionBtn.dataset.id;
            openAddToCollectionModal(trackId);
        }

        if (shareBtn) {
            e.preventDefault();
            const trackId = shareBtn.dataset.id;
            const trackUrl = `${window.location.origin}/track.html?id=${trackId}`;
            navigator.clipboard.writeText(trackUrl).then(() => {
                alert('Ссылка на трек скопирована в буфер обмена!');
            }).catch(err => {
                console.error('Не удалось скопировать ссылку: ', err);
                alert('Не удалось скопировать ссылку.');
            });
        }
    });

    audioPlayer.addEventListener('ended', () => {
        if (currentPlayingButton) {
            currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
            currentPlayingButton.classList.remove('playing');
            currentPlayingButton = null;
        }
    });

    // --- MODAL: Add to Collection ---

    const openAddToCollectionModal = async (trackId) => {
        trackIdInput.value = trackId;
        statusMessage.textContent = '';
        statusMessage.style.display = 'none';
        try {
            const response = await fetch('/api/collections');
            if (!response.ok) throw new Error('Не удалось загрузить сборники');
            const collections = await response.json();
            collectionSelect.innerHTML = '<option value="">Выберите сборник...</option>';
            if (collections.length > 0) {
                collections.forEach(collection => {
                    const option = document.createElement('option');
                    option.value = collection._id;
                    option.textContent = escapeHTML(collection.name);
                    collectionSelect.appendChild(option);
                });
            } else {
                collectionSelect.innerHTML = '<option value="">Сборники не найдены</option>';
            }
            addToCollectionModal.style.display = 'block';
        } catch (error) {
            console.error('Ошибка при загрузке сборников:', error);
            alert('Не удалось загрузить список сборников.');
        }
    };

    const closeAddToCollectionModal = () => {
        addToCollectionModal.style.display = 'none';
    };

    addToCollectionCloseBtn.addEventListener('click', closeAddToCollectionModal);

    addToCollectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const trackId = trackIdInput.value;
        const collectionId = collectionSelect.value;
        const token = localStorage.getItem('token');
        if (!collectionId) {
            alert('Пожалуйста, выберите сборник.');
            return;
        }
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
        statusMessage.style.display = 'none';
        try {
            const response = await fetch(`/api/collections/${collectionId}/add-track`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ trackId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Не удалось добавить трек.');
            
            statusMessage.textContent = `Трек успешно добавлен в сборник!`;
            statusMessage.className = 'status-message success';
            statusMessage.style.display = 'block';

            setTimeout(() => {
                closeAddToCollectionModal();
            }, 2000);

        } catch (error) {
            statusMessage.textContent = error.message;
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target == addToCollectionModal) {
            addToCollectionModal.style.display = 'none';
        }
    });

    // --- Initial Load ---
    window.authReady.then(user => {
        currentUser = user;
        loadSearchResults(query);
    });
});
