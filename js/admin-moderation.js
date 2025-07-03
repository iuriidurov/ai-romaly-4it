document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const moderationList = document.getElementById('moderation-list');

    // 1. Проверка токена и роли администратора
    let user;
    try {
        if (!token) throw new Error('Token not found');
        user = parseJwt(token).user;
        if (!user || user.role !== 'admin') {
            throw new Error('Access denied');
        }
    } catch (error) {
        console.error('Authentication error:', error.message);
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
    }

    // 2. Настройка UI
    updateHeader(user);

    // 3. Загрузка треков на модерации
    fetchPendingTracks();

    function parseJwt(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    function updateHeader(user) {
        const usernameDisplay = document.getElementById('username-display');
        const userRoleDisplay = document.getElementById('user-role-display');
        const cabinetLink = document.getElementById('cabinet-link');
        const logoutBtn = document.getElementById('logout-btn');
        const loginBtn = document.getElementById('login-btn');

        // Since this script only runs for logged-in admins, we can set the UI state directly.
        if (usernameDisplay) usernameDisplay.textContent = user.name;
        if (userRoleDisplay) userRoleDisplay.textContent = user.role;
        
        if (cabinetLink) cabinetLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (loginBtn) loginBtn.style.display = 'none';

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                window.location.href = '/';
            });
        }
    }

    async function fetchPendingTracks() {
        try {
            const response = await fetch('/api/tracks/pending', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Не удалось загрузить треки для модерации.');
            }

            const tracks = await response.json();
            renderTracks(tracks);

        } catch (error) {
            console.error('Ошибка:', error);
            moderationList.innerHTML = `<div class="moderation-track-item">${error.message}</div>`;
        }
    }

    function renderTracks(tracks) {
        moderationList.innerHTML = '';
        if (tracks.length === 0) {
            moderationList.innerHTML = '<div class="empty-list-message">Нет треков, ожидающих модерации.</div>';
            return;
        }

        tracks.forEach(track => {
            const trackItem = document.createElement('div');
            trackItem.className = 'moderation-track-item';
            trackItem.setAttribute('data-track-id', track._id);

            trackItem.innerHTML = `
                <div class="track-info">
                    <div class="track-title">${escapeHTML(track.title)}</div>
                </div>
                <div class="track-author">${track.author ? escapeHTML(track.author.name) : 'Неизвестный автор'}</div>
                <div class="track-actions">
                    <button class="btn btn-approve" data-id="${track._id}">Одобрить</button>
                    <button class="btn btn-reject" data-id="${track._id}">Отклонить</button>
                </div>
            `;
            moderationList.appendChild(trackItem);
        });

        addEventListenersToButtons();
    }

    function addEventListenersToButtons() {
        document.querySelectorAll('.btn-approve, .btn-reject').forEach(button => {
            button.addEventListener('click', handleModerate);
        });
    }

    async function handleModerate(event) {
        const trackId = event.target.dataset.id;
        const action = event.target.classList.contains('btn-approve') ? 'approve' : 'reject';

        try {
            const response = await fetch(`/api/tracks/${trackId}/${action}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Не удалось ${action === 'approve' ? 'одобрить' : 'отклонить'} трек.`);
            }

            const itemToRemove = document.querySelector(`.moderation-track-item[data-track-id="${trackId}"]`);
            if (itemToRemove) {
                itemToRemove.remove();
            }

            if (moderationList.children.length === 0) {
                moderationList.innerHTML = '<div class="empty-list-message">Нет треков, ожидающих модерации.</div>';
            }

        } catch (error) {
            console.error('Ошибка модерации:', error);
            alert('Произошла ошибка: ' + error.message);
        }
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"'/]/g, function (tag) {
            const chars = {
                '&': '&amp;', '<': '&lt;', '>': '&gt;',
                "'": '&#39;', '"': '&quot;', '/': '&#x2F;'
            };
            return chars[tag] || tag;
        });
    }
});
