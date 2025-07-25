document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

;

    if (!token) {
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
    localStorage.setItem('user', JSON.stringify(currentUser));

    const trackList = document.getElementById('author-track-list');
    const authorsList = document.getElementById('authors-list');
    const paginationContainer = document.querySelector('.pagination');
    const audioPlayer = document.getElementById('audio-player');
    let currentPlayingButton = null;

    // --- Edit Track Modal Elements ---
    const editModal = document.getElementById('edit-track-modal');
    const editForm = document.getElementById('edit-track-form');
    const editTrackIdInput = document.getElementById('edit-track-id');
    const editTitleInput = document.getElementById('edit-title');
    const editCloseBtn = editModal.querySelector('.close-btn');
    const editStatusMessage = document.getElementById('edit-status-message');

    const updateHeaderUI = () => {
        document.getElementById('username-display').textContent = currentUser.name;
        document.getElementById('user-role-display').textContent = currentUser.role;
        document.getElementById('cabinet-link').style.display = 'inline';
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.style.display = 'inline-block';
        document.getElementById('login-btn').style.display = 'none';

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    };

    const loadAuthors = async () => {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) throw new Error('Failed to load authors');
            const users = await response.json();
            authorsList.innerHTML = '';
            users.forEach(user => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#">${escapeHTML(user.name)}</a>`;
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
            const response = await fetch(`/api/tracks/author/${currentUser.id}?page=${page}&limit=20`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Не удалось загрузить треки');

            const data = await response.json();
            const { tracks, totalPages, currentPage } = data;

            trackList.innerHTML = '';
            if (tracks.length === 0) {
                trackList.innerHTML = '<p>Вы еще не загрузили ни одного трека.</p>';
                paginationContainer.innerHTML = '';
                return;
            }

            tracks.forEach(track => {
                const trackItem = document.createElement('div');
                trackItem.className = 'track-item';
                const canEditOrDelete = currentUser && (currentUser.id === track.author._id || currentUser.role === 'admin');
                const editButtonHTML = canEditOrDelete ? `<a href="#" title="Редактировать" class="edit-btn" data-id="${track._id}" data-title="${escapeHTML(track.title)}"><i class="fa fa-pencil"></i></a>` : '';
                const deleteButtonHTML = canEditOrDelete ? `<a href="#" title="Удалить" class="delete-btn" data-id="${track._id}"><i class="fa fa-trash"></i></a>` : '';
                const statusLabel = getStatusLabel(track.status);

                trackItem.innerHTML = `
                    <div class="track-play">
                        <button class="play-btn" data-src="/${track.filePath}" ${track.status !== 'approved' ? 'disabled' : ''}><i class="fa fa-play"></i></button>
                    </div>
                    <div class="track-info">
                        <span class="track-title">${escapeHTML(track.title)}</span>
                        <span class="track-author">${escapeHTML(track.author.name)}</span>
                    </div>
                    <div class="track-status">
                        ${statusLabel}
                    </div>
                    <div class="track-actions">
                        ${editButtonHTML}
                        ${deleteButtonHTML}
                    </div>
                `;
                trackList.appendChild(trackItem);
            });

            renderPagination(totalPages, currentPage);

        } catch (error) {
            console.error('Error loading author tracks:', error);
            trackList.innerHTML = `<p>${error.message}</p>`;
        }
    };

    function getStatusLabel(status) {
        switch (status) {
            case 'pending':
                return '<span class="status-label status-pending">На модерации</span>';
            case 'approved':
                return '<span class="status-label status-approved">Одобрено</span>';
            case 'rejected':
                return '<span class="status-label status-rejected">Отклонено</span>';
            default:
                return '';
        }
    }

    const renderPagination = (totalPages, currentPage) => {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.textContent = i;
            if (i === currentPage) pageLink.className = 'active';
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadAuthorTracks(i);
            });
            paginationContainer.appendChild(pageLink);
        }
    };

    trackList.addEventListener('click', async (e) => {
        const playBtn = e.target.closest('.play-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const editBtn = e.target.closest('.edit-btn');

        if (playBtn) {
            e.preventDefault();
            if (playBtn.hasAttribute('disabled')) return;
            const audioSrc = playBtn.dataset.src;
            if (currentPlayingButton === playBtn) {
                audioPlayer.pause();
                playBtn.innerHTML = '<i class="fa fa-play"></i>';
                currentPlayingButton = null;
            } else {
                if (currentPlayingButton) currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
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
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Не удалось удалить трек');
                    loadAuthorTracks();
                } catch (error) {
                    console.error('Error deleting track:', error);
                    alert(error.message);
                }
            }
        } else if (editBtn) {
            e.preventDefault();
            const trackId = editBtn.dataset.id;
            const trackTitle = editBtn.dataset.title;
            showEditModal(trackId, trackTitle);
        }
    });

    audioPlayer.addEventListener('ended', () => {
        if (currentPlayingButton) {
            currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
            currentPlayingButton = null;
        }
    });

    const uploadModal = document.getElementById('upload-track-modal');
    const uploadForm = document.getElementById('upload-track-form');
    const closeBtn = uploadModal.querySelector('.close-btn');
    const titleInput = document.getElementById('upload-title');
    const fileInput = document.getElementById('track-file');
    const progressBarContainer = uploadModal.querySelector('.progress-container');
    const progressBarInner = uploadModal.querySelector('.progress-bar-inner');
    const statusMessage = document.getElementById('upload-status-message');
    const submitBtn = uploadForm.querySelector('.btn-submit');



    async function showUploadModal() {
        resetUploadForm();

        uploadModal.style.display = 'block';

        const token = localStorage.getItem('token');
        if (token) {
            const payload = parseJwt(token);
            if (payload && payload.user && payload.user.name) {
                document.getElementById('upload-author').value = payload.user.name;
                console.log('Author name set from token:', payload.user.name);
            } else {
                console.error('Could not set author name: user or name property missing in token payload.', payload);
            }
        } else {
            console.error('Could not set author name: token not found.');
        }
    }

    function hideUploadModal() {
        uploadModal.style.display = 'none';
    }

    // --- Edit Track Modal Functions ---
    function showEditModal(trackId, currentTitle) {
        editTrackIdInput.value = trackId;
        editTitleInput.value = currentTitle;
        editStatusMessage.textContent = '';
        editModal.style.display = 'block';
    }

    function hideEditModal() {
        editModal.style.display = 'none';
    }

    editCloseBtn.addEventListener('click', hideEditModal);
    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            hideEditModal();
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const trackId = editTrackIdInput.value;
        const newTitle = editTitleInput.value.trim();

        if (!newTitle) {
            showEditStatusMessage('Название не может быть пустым.', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/tracks/${trackId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: newTitle })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Не удалось обновить трек.');
            }

            showEditStatusMessage('Трек успешно обновлен!', 'success');
            loadAuthorTracks(); // Перезагружаем список треков
            setTimeout(hideEditModal, 1500);

        } catch (error) {
            console.error('Ошибка при обновлении трека:', error);
            showEditStatusMessage(error.message, 'error');
        }
    });

    function showEditStatusMessage(message, type) {
        editStatusMessage.textContent = message;
        editStatusMessage.className = `status-message ${type}`;
    }

    const adminControls = document.getElementById('admin-controls');
    const authorUploadBtn = document.getElementById('author-upload-btn');

    if (currentUser.role === 'admin') {
        adminControls.style.display = 'flex';
        adminControls.innerHTML = `
            <button class="btn" id="admin-moderation-btn">Треки на модерации</button>
            <button class="btn" id="admin-authors-list-btn">Перейти к списку авторов</button>
            <button class="btn" id="admin-upload-btn">Загрузить трек</button>
            <button class="btn" id="admin-create-collection-btn">Создать новый сборник</button>
        `;
        document.getElementById('admin-moderation-btn').addEventListener('click', () => window.location.href = '/admin-moderation.html');
        document.getElementById('admin-authors-list-btn').addEventListener('click', () => window.location.href = '/admin-authors.html');
        document.getElementById('admin-upload-btn').addEventListener('click', showUploadModal);
        document.getElementById('admin-create-collection-btn').addEventListener('click', () => window.location.href = '/admin-collections.html');
    } else if (currentUser.role === 'author') {
        authorUploadBtn.style.display = 'block';
        authorUploadBtn.addEventListener('click', showUploadModal);
    }

    closeBtn.addEventListener('click', hideUploadModal);
    window.addEventListener('click', (event) => {
        if (event.target === uploadModal) {
            hideUploadModal();
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            titleInput.value = fileName.replace(/\.(mp3|wav|ogg)$/i, "");
        }
    });

    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!token) {
            return showStatusMessage('Ошибка: вы не авторизованы.', 'error');
        }
        if (!fileInput.files[0]) {
            return showStatusMessage('Пожалуйста, выберите файл для загрузки.', 'error');
        }

        const formData = new FormData();
        formData.append('title', titleInput.value);

        formData.append('trackFile', fileInput.files[0]);

        progressBarContainer.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Загрузка...';
        showStatusMessage('', '');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/tracks/upload', true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                progressBarInner.style.width = percent + '%';
                progressBarInner.textContent = Math.round(percent) + '%';
            }
        };

        xhr.onload = () => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Загрузить трек';
            if (xhr.status === 201) {
                const response = JSON.parse(xhr.responseText);
                showStatusMessage(`Трек "${escapeHTML(response.title)}" отправлен на модерацию.`, 'success');
                loadAuthorTracks();
                setTimeout(hideUploadModal, 2500);
            } else {
                const errorMsg = (xhr.responseText ? JSON.parse(xhr.responseText).message : null) || 'Ошибка загрузки.';
                showStatusMessage(errorMsg, 'error');
                setTimeout(() => progressBarContainer.style.display = 'none', 2000);
            }
        };

        xhr.onerror = () => {
            showStatusMessage('Ошибка сети. Не удалось загрузить файл.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Загрузить трек';
            setTimeout(() => progressBarContainer.style.display = 'none', 2000);
        };

        xhr.send(formData);
    });

    function resetUploadForm() {
        // Manually reset all relevant fields to their initial state
        document.getElementById('upload-author').value = '';
        document.getElementById('upload-title').value = '';
        document.getElementById('track-file').value = '';


        progressBarContainer.style.display = 'none';
        progressBarInner.style.width = '0%';
        progressBarInner.textContent = '';
        statusMessage.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Загрузить трек';
    }

    function showStatusMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = message ? 'block' : 'none';
    }
    
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"'/]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            "'": '&#39;', '"': '&quot;', '/': '&#x2F;'
        }[tag] || tag));
    }

    async function loadCollectionsMenu() {
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
    }

    // Initial Load
    updateHeaderUI();
    loadAuthors();
    loadCollectionsMenu();
    loadAuthorTracks();
});
