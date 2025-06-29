document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    // Helper to parse JWT
    const parseJwt = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    };

    if (!token) {
        // If no token, redirect to homepage
        window.location.href = '/';
        return;
    }

    const decodedToken = parseJwt(token);
    if (!decodedToken || !decodedToken.user) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
    }

    const currentUser = decodedToken.user;

    // UI Elements
    const usernameDisplay = document.getElementById('username-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    const cabinetLink = document.getElementById('cabinet-link');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const trackList = document.getElementById('author-track-list');
    const authorsList = document.getElementById('authors-list');
    const paginationContainer = document.querySelector('.pagination');
    const audioPlayer = document.getElementById('audio-player');
    let currentPlayingButton = null;

    // --- UI Update Functions ---
    const updateHeaderUI = () => {
        usernameDisplay.textContent = currentUser.username;
        userRoleDisplay.textContent = currentUser.role;
        cabinetLink.style.display = 'inline';
        logoutBtn.style.display = 'inline-block';
        loginBtn.style.display = 'none';

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/';
        });
    };

    // --- Data Loading Functions ---
    const loadAuthors = async () => {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) throw new Error('Failed to load authors');
            const users = await response.json();
            authorsList.innerHTML = '';
            users.forEach(user => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#">${user.username}</a>`; // Link can be implemented later
                authorsList.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading authors:', error);
            authorsList.innerHTML = '<li>Не удалось загрузить авторов.</li>';
        }
    };

    const loadAuthorTracks = async (page = 1) => {
        try {
            trackList.innerHTML = '<p>Загрузка ваших треков...</p>';
            const response = await fetch(`/api/tracks/author/${currentUser.id}?page=${page}&limit=20`);
            if (!response.ok) throw new Error('Failed to load tracks');

            const data = await response.json();
            const { tracks, totalPages, currentPage } = data;

            trackList.innerHTML = '';
            if (tracks.length === 0) {
                trackList.innerHTML = '<p>Вы еще не загрузили ни одного трека.</p>';
                return;
            }

            tracks.forEach(track => {
                const trackItem = document.createElement('div');
                trackItem.className = 'track-item';
                const canDelete = currentUser && (currentUser.id === track.author._id || currentUser.role === 'admin');
                const deleteButtonHTML = canDelete ? `<a href="#" title="Удалить" class="delete-btn" data-id="${track._id}"><i class="fa fa-trash"></i></a>` : '';

                trackItem.innerHTML = `
                    <div class="track-play">
                        <button class="play-btn" data-src="/${track.filePath}"><i class="fa fa-play"></i></button>
                    </div>
                    <div class="track-info">
                        <p class="track-title">${track.title}</p>
                        <p class="track-author">${track.author.username} / ${track.collectionName || 'Без сборника'}</p>
                    </div>
                    <div class="track-actions">
                        <a href="#" title="Поделиться"><i class="fa fa-share-alt"></i></a>
                        ${deleteButtonHTML}
                        <a href="/${track.filePath}" title="Скачать" download><i class="fa fa-download"></i></a>
                    </div>
                `;
                trackList.appendChild(trackItem);
            });

            renderPagination(totalPages, currentPage);

        } catch (error) {
            console.error('Error loading author tracks:', error);
            trackList.innerHTML = '<p>Не удалось загрузить ваши треки.</p>';
        }
    };

    const renderPagination = (totalPages, currentPage) => {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.textContent = i;
            if (i === currentPage) {
                pageLink.classList.add('active');
            }
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadAuthorTracks(i);
            });
            paginationContainer.appendChild(pageLink);
        }
    };

    // --- Event Listeners ---
    trackList.addEventListener('click', async (e) => {
        const target = e.target;
        const playBtn = target.closest('.play-btn');
        const deleteBtn = target.closest('.delete-btn');

        if (playBtn) {
            const audioSrc = playBtn.dataset.src;
            if (audioPlayer.src.endsWith(audioSrc) && !audioPlayer.paused) {
                audioPlayer.pause();
                playBtn.innerHTML = '<i class="fa fa-play"></i>';
                currentPlayingButton = null;
            } else {
                if (currentPlayingButton) {
                    currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
                }
                audioPlayer.src = audioSrc;
                audioPlayer.play();
                playBtn.innerHTML = '<i class="fa fa-pause"></i>';
                currentPlayingButton = playBtn;
            }
        } else if (deleteBtn) {
            e.preventDefault();
            const trackId = deleteBtn.dataset.id;
            if (confirm('Вы уверены, что хотите удалить этот трек?')) {
                try {
                    const response = await fetch(`/api/tracks/${trackId}`, {
                        method: 'DELETE',
                        headers: { 'x-auth-token': token }
                    });
                    if (!response.ok) throw new Error('Failed to delete track');
                    // Reload tracks on the current page
                    loadAuthorTracks(); 
                } catch (error) {
                    console.error('Error deleting track:', error);
                    alert('Не удалось удалить трек.');
                }
            }
        }
    });

    audioPlayer.addEventListener('ended', () => {
        if (currentPlayingButton) {
            currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
            currentPlayingButton = null;
        }
    });

    // --- Initial Load ---
    updateHeaderUI();
    loadAuthors();
    loadAuthorTracks();
});
