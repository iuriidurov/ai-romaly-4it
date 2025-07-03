function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Invalid token:", e);
        return null;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"'/]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        "'": '&#39;', '"': '&quot;', '/': '&#x2F;'
    }[tag] || tag));
}

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const collectionDetailContainer = document.getElementById('collection-detail-container');
    const audioPlayer = document.getElementById('audio-player');
    const cabinetLink = document.getElementById('cabinet-link');
    const usernameDisplay = document.getElementById('username-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // State
    const collectionId = new URLSearchParams(window.location.search).get('id');
    let currentPlayingButton = null;
    let currentTracklist = [];
    let currentPage = 1;
    const tracksPerPage = 20;

    if (!collectionId) {
        collectionDetailContainer.innerHTML = '<h2>Сборник не найден.</h2>';
        return;
    }

    // --- RENDER FUNCTIONS ---

    const renderTracksForPage = (page) => {
        const trackListContainer = collectionDetailContainer.querySelector('.track-list');
        if (!trackListContainer) return;

        currentPage = page;
        const start = (page - 1) * tracksPerPage;
        const end = start + tracksPerPage;
        const tracksToRender = currentTracklist.slice(start, end);

        const token = localStorage.getItem('token');
        const decodedToken = token ? parseJwt(token) : null;
        const currentUser = decodedToken ? decodedToken.user : null;

        const tracksHTML = tracksToRender.map(track => {
            const authorName = track.author ? track.author.name : 'Неизвестный автор';
            const canDelete = currentUser && track.author && (currentUser.id === track.author._id || currentUser.role === 'admin');
            const deleteButtonHTML = canDelete ? `<a href="#" title="Удалить" class="delete-btn" data-id="${track._id}"><i class="fa fa-trash"></i></a>` : '';

            return `
                <div class="track-item">
                    <div class="track-play">
                        <button class="play-btn" data-src="/${track.filePath}"><i class="fa fa-play"></i></button>
                    </div>
                    <div class="track-info">
                        <span class="track-title">${escapeHTML(track.title)}</span>
                        <span class="track-author">${escapeHTML(authorName)}</span>
                    </div>
                    <div class="track-actions">
                        <a href="#" title="Поделиться"><i class="fa fa-share-alt"></i></a>
                        ${deleteButtonHTML}
                        <a href="/${track.filePath}" title="Скачать" download><i class="fa fa-download"></i></a>
                    </div>
                </div>
            `;
        }).join('');

        trackListContainer.innerHTML = tracksHTML || '<p>В этом сборнике пока нет треков.</p>';
        renderPaginationControls();
    };

    const renderPaginationControls = () => {
        const paginationContainer = collectionDetailContainer.querySelector('.pagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(currentTracklist.length / tracksPerPage);
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        paginationContainer.innerHTML = paginationHTML;
    };

    // --- DATA LOADING ---

    const loadCollectionDetails = async () => {
        try {
            const response = await fetch(`/api/collections/${collectionId}`);
            if (!response.ok) throw new Error('Не удалось загрузить сборник');
            const collection = await response.json();
            
            currentTracklist = collection.tracks; 
            document.title = `${collection.name} - AI-Ромалы`;

            // Render the static part of the view first
            collectionDetailContainer.innerHTML = `
                <div class="breadcrumbs">
                    <a href="/">Главная</a> &rsaquo; <span>Сборники</span> &rsaquo; <span>${escapeHTML(collection.name)}</span>
                </div>
                <div class="collection-header">
                    <img src="/${collection.coverImagePath}" alt="Обложка сборника" class="collection-cover">
                    <div class="collection-info">
                        <p class="collection-tag">СБОРНИК</p>
                        <h2>${escapeHTML(collection.name)}</h2>
                        <p>${escapeHTML(collection.description)}</p>
                        <div class="collection-actions">
                            <button id="play-collection-btn" class="btn-primary"><i class="fa fa-play"></i> Слушать</button>
                            <button class="btn-secondary"><i class="fa fa-download"></i></button>
                            <button class="btn-secondary"><i class="fa fa-share-alt"></i></button>
                        </div>
                    </div>
                </div>
                <div class="track-list"></div>
                <div class="pagination"></div>
            `;

            // Now render the dynamic parts
            renderTracksForPage(1);

        } catch (error) {
            console.error('Ошибка загрузки сборника:', error);
            collectionDetailContainer.innerHTML = `<h2>${error.message}</h2>`;
        }
    };

    const loadCollectionsMenu = async () => {
        const collectionsList = document.getElementById('collections-list');
        if (!collectionsList) return;
        try {
            const response = await fetch('/api/collections');
            if (!response.ok) throw new Error('Не удалось загрузить список сборников');
            const collections = await response.json();
            collectionsList.innerHTML = '';
            collections.forEach(collection => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<a href="/collection.html?id=${collection._id}">${escapeHTML(collection.name)}</a>`;
                collectionsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Ошибка при загрузке меню сборников:', error);
            if(collectionsList) collectionsList.innerHTML = '<li>Ошибка загрузки</li>';
        }
    };

    const loadAuthorsLists = async () => {
        const topAuthorsList = document.getElementById('top-authors-list');
        const allAuthorsList = document.getElementById('all-authors-list');
        if (!topAuthorsList || !allAuthorsList) return;

        try {
            const response = await fetch('/api/users/authors');
            if (!response.ok) throw new Error('Не удалось загрузить список авторов');
            const authors = await response.json();

            topAuthorsList.innerHTML = '';
            allAuthorsList.innerHTML = '';

            if (authors.length === 0) {
                topAuthorsList.innerHTML = '<li>Авторов пока нет.</li>';
                allAuthorsList.innerHTML = '<li>Авторов пока нет.</li>';
                return;
            }

            authors.forEach(author => {
                const topListItem = document.createElement('li');
                topListItem.textContent = author.name;
                topAuthorsList.appendChild(topListItem);

                const allListItem = document.createElement('li');
                allListItem.textContent = author.name;
                allAuthorsList.appendChild(allListItem);
            });
        } catch (error) {
            console.error('Ошибка при загрузке списка авторов:', error);
            if(topAuthorsList) topAuthorsList.innerHTML = '<li>Ошибка загрузки</li>';
            if(allAuthorsList) allAuthorsList.innerHTML = '<li>Ошибка загрузки</li>';
        }
    };

    // --- UI AND PLAYER LOGIC ---

    const updateUIForAuthState = () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = parseJwt(token);
                if (decodedToken && decodedToken.user) {
                    const user = decodedToken.user;
                    usernameDisplay.textContent = user.name;
                    userRoleDisplay.textContent = user.role;
                    cabinetLink.style.display = 'inline';
                    logoutBtn.style.display = 'inline-block';
                    loginBtn.style.display = 'none';
                } else {
                    throw new Error('Invalid token structure');
                }
            } catch (error) {
                console.error('Failed to parse token or update UI:', error);
                localStorage.removeItem('token');
                cabinetLink.style.display = 'none';
                logoutBtn.style.display = 'none';
                loginBtn.style.display = 'inline-block';
            }
        } else {
            cabinetLink.style.display = 'none';
            logoutBtn.style.display = 'none';
            loginBtn.style.display = 'inline-block';
        }
    };
    
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    // Event delegation for all actions inside the main container
    collectionDetailContainer.addEventListener('click', async (e) => {
        const playBtn = e.target.closest('.play-btn');
        const playCollectionBtn = e.target.closest('#play-collection-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const pageBtn = e.target.closest('.page-btn');

        if (playBtn) {
            const isPlaying = playBtn.classList.contains('playing');
            document.querySelectorAll('.play-btn').forEach(btn => {
                btn.innerHTML = '<i class="fa fa-play"></i>';
                btn.classList.remove('playing');
            });
            if (isPlaying) {
                audioPlayer.pause();
                currentPlayingButton = null;
            } else {
                audioPlayer.src = playBtn.dataset.src;
                audioPlayer.play();
                playBtn.innerHTML = '<i class="fa fa-pause"></i>';
                playBtn.classList.add('playing');
                currentPlayingButton = playBtn;
            }
        }

        if (playCollectionBtn) {
            if (currentTracklist.length > 0) {
                const firstTrackElement = collectionDetailContainer.querySelector('.play-btn');
                if(firstTrackElement) firstTrackElement.click();
            }
        }

        if (deleteBtn) {
            e.preventDefault();
            const trackId = deleteBtn.dataset.id;
            if (confirm('Вы уверены, что хотите удалить этот трек из сборника?')) {
                alert('Функционал удаления трека из сборника в разработке.');
            }
        }

        if (pageBtn) {
            const page = parseInt(pageBtn.dataset.page, 10);
            renderTracksForPage(page);
        }
    });

    audioPlayer.addEventListener('ended', () => {
        if (currentPlayingButton) {
            const currentTrackItem = currentPlayingButton.closest('.track-item');
            
            // Logic to automatically play the next track in the list
            if (currentTrackItem && currentTrackItem.nextElementSibling) {
                const nextPlayBtn = currentTrackItem.nextElementSibling.querySelector('.play-btn');
                if (nextPlayBtn) {
                    // Simulate a click on the next track's play button
                    nextPlayBtn.click();
                    return; // The click handler will manage the state, so we exit here.
                }
            }

            // If it was the last track, just reset the button icon and state
            currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
            currentPlayingButton.classList.remove('playing');
            currentPlayingButton = null;
        }
    });

    // --- INITIAL LOAD ---
    updateUIForAuthState();
    loadCollectionDetails();
    loadCollectionsMenu();
    loadAuthorsLists();
});
