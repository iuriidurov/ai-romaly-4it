// Helper function to parse JWT
function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const trackList = document.querySelector('.track-list');

    // Function to fetch and display tracks
    const loadTracks = async () => {
        try {
            const response = await fetch('/api/tracks');
            if (!response.ok) throw new Error('Network response was not ok');
            const tracks = await response.json();
            trackList.innerHTML = ''; // Clear current tracks

            if (tracks.length === 0) {
                trackList.innerHTML = '<p>Треков пока нет.</p>';
                return;
            }

            const token = localStorage.getItem('token');
            const decodedToken = token ? parseJwt(token) : null;
            const currentUser = decodedToken ? decodedToken.user : null;

            tracks.forEach(track => {
                const trackItem = document.createElement('div');
                trackItem.className = 'track-item';

                // Defensive checks for author
                const authorName = track.author ? track.author.username : 'Неизвестный автор';
                const canDelete = currentUser && track.author && (currentUser.id === track.author._id || currentUser.role === 'admin');
                const deleteButtonHTML = canDelete ? `<a href="#" title="Удалить" class="delete-btn" data-id="${track._id}"><i class="fa fa-trash"></i></a>` : '';

                trackItem.innerHTML = `
                    <div class="track-play">
                        <button class="play-btn" data-src="/${track.filePath}"><i class="fa fa-play"></i></button>
                    </div>
                    <div class="track-info">
                        <p class="track-title">${track.title}</p>
                        <p class="track-author">${authorName} / ${track.collectionName || 'Без сборника'}</p>
                    </div>
                    <div class="track-actions">
                        <a href="#" title="Поделиться"><i class="fa fa-share-alt"></i></a>
                        ${deleteButtonHTML}
                        <a href="/${track.filePath}" title="Скачать" download><i class="fa fa-download"></i></a>
                    </div>
                `;
                trackList.appendChild(trackItem);
            });

        } catch (error) {
            console.error('Error loading tracks:', error);
            trackList.innerHTML = '<p>Не удалось загрузить треки. Попробуйте позже.</p>';
        }
    };

    // Audio Player Logic
    const audioPlayer = document.getElementById('audio-player');
    let currentPlayingButton = null;

    trackList.addEventListener('click', async (e) => {
        // Play/Pause Logic
        const playBtn = e.target.closest('.play-btn');
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

        // Delete Logic
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.preventDefault();
            const trackId = deleteBtn.dataset.id;
            if (confirm('Вы уверены, что хотите удалить этот трек?')) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/tracks/${trackId}`, {
                        method: 'DELETE',
                        headers: { 'x-auth-token': token }
                    });
                    if (!res.ok) {
                        const result = await res.json();
                        throw new Error(result.msg || 'Не удалось удалить трек.');
                    }
                    deleteBtn.closest('.track-item').remove();
                    alert('Трек успешно удален.');
                } catch (err) {
                    alert(err.message);
                }
            }
        }
    });

    // Reset button when track ends
    audioPlayer.addEventListener('ended', () => {
        if (currentPlayingButton) {
            currentPlayingButton.innerHTML = '<i class="fa fa-play"></i>';
            currentPlayingButton.classList.remove('playing');
            currentPlayingButton = null;
        }
    });

    // Initial load
    loadTracks();

    // --- Auth Modal Logic ---
    const authModal = document.getElementById('auth-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const cabinetLink = document.getElementById('cabinet-link');
    const usernameDisplay = document.getElementById('username-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Show modal
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.style.display = 'block';
        showLoginForm();
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        updateUIForAuthState();
        loadTracks(); // Reload tracks to update view for logged-out state
    });

    // Hide modal
    closeModalBtn.addEventListener('click', () => authModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == authModal) {
            authModal.style.display = 'none';
        }
    });

    // Switch forms
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.msg || 'Login failed');

            localStorage.setItem('token', result.token);
            authModal.style.display = 'none';
            updateUIForAuthState();
        } catch (err) {
            alert(err.message);
        }
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.msg || 'Registration failed');

            localStorage.setItem('token', result.token);
            alert('Регистрация прошла успешно!');
            authModal.style.display = 'none';
            updateUIForAuthState();
        } catch (err) {
            alert(err.message);
        }
    });

    // Function to update UI based on auth state
    const updateUIForAuthState = () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = parseJwt(token);
                if (decodedToken && decodedToken.user) {
                    const user = decodedToken.user;
                    usernameDisplay.textContent = user.username;
                    userRoleDisplay.textContent = user.role;

                    cabinetLink.style.display = 'inline';
                    logoutBtn.style.display = 'inline-block';
                    loginBtn.style.display = 'none';
                } else {
                    throw new Error('Invalid token structure');
                }
            } catch (error) {
                console.error('Failed to parse token or update UI:', error);
                localStorage.removeItem('token'); // Clear invalid token
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

    // Check auth state on page load
    updateUIForAuthState();
});
