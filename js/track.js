document.addEventListener('DOMContentLoaded', () => {
    // --- Элементы управления аутентификацией ---
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const cabinetLink = document.getElementById('cabinet-link');
    const usernameDisplay = document.getElementById('username-display');
    const userRoleDisplay = document.getElementById('user-role-display');

    // --- Элементы страницы трека ---
    const trackContainer = document.getElementById('track-container');
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('id');

    // --- Функции аутентификации ---
    function parseJwt(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    function checkAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = parseJwt(token);
            if (decoded && decoded.user) {
                usernameDisplay.textContent = decoded.user.name;
                userRoleDisplay.textContent = decoded.user.role;
                loginBtn.style.display = 'none';
                logoutBtn.style.display = 'inline-block';
                cabinetLink.style.display = 'inline-block';
            } else {
                logout(); // Невалидный токен
            }
        } else {
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            cabinetLink.style.display = 'none';
        }
    }

    function logout() {
        localStorage.removeItem('token');
        window.location.reload();
    }

    // --- Функции загрузки трека ---
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>\"'/]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            "'": '&#39;', '"': '&quot;', '/': '&#x2F;'
        }[tag] || tag));
    }

    const loadTrack = async () => {
        if (!trackId) {
            trackContainer.innerHTML = '<p>Ошибка: ID трека не указан.</p>';
            return;
        }

        try {
            const response = await fetch(`/api/tracks/${trackId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Не удалось загрузить трек.');
            }
            const track = await response.json();

            const authorName = track.author ? track.author.name : 'Неизвестный автор';

            trackContainer.innerHTML = `
                <h1 class="track-title-large">${escapeHTML(track.title)}</h1>
                <p class="track-author-large">Автор: ${escapeHTML(authorName)}</p>
                <audio controls src="/${track.filePath}" class="track-audio-player">
                    Ваш браузер не поддерживает аудио элемент.
                </audio>
                <div class="track-actions-large">
                    <a href="/${track.filePath}" download class="btn-download">Скачать MP3</a>
                </div>
            `;

        } catch (error) {
            console.error('Ошибка при загрузке трека:', error);
            trackContainer.innerHTML = `<p>Произошла ошибка: ${error.message}</p>`;
        }
    };

    // --- Обработчики событий и инициализация ---
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/login.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    loadTrack();
    checkAuth();
});
