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
    const collectionsList = document.querySelector('.left-column ul');

    // Function to fetch and display collections in the left menu
    const loadCollectionsMenu = async () => {
        try {
            const response = await fetch('/api/tracks/collections');
            if (!response.ok) throw new Error('Не удалось загрузить список сборников');
            const collections = await response.json();
            
            if (collections.length > 0) {
                collectionsList.innerHTML = ''; // Clear hardcoded list only if fetch is successful
            }
            
            collections.forEach(collectionName => {
                const listItem = document.createElement('li');
                // In the future, the link can filter tracks by collection
                listItem.innerHTML = `<a href="#">${collectionName}</a>`;
                collectionsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Ошибка при загрузке меню сборников:', error);
            // If fetch fails, the hardcoded list in HTML will be used as a fallback.
        }
    };

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

                // Defensive checks for author and collection
                const authorName = track.author ? track.author.name : 'Неизвестный автор';
                const collectionName = track.collectionId ? track.collectionId.name : 'Без сборника';
                const canDelete = currentUser && track.author && (currentUser.id === track.author._id || currentUser.role === 'admin');
                const deleteButtonHTML = canDelete ? `<a href="#" title="Удалить" class="delete-btn" data-id="${track._id}"><i class="fa fa-trash"></i></a>` : '';

                trackItem.innerHTML = `
                    <div class="track-play">
                        <button class="play-btn" data-src="/${track.filePath}"><i class="fa fa-play"></i></button>
                    </div>
                    <div class="track-info">
                        <p class="track-title">${track.title}</p>
                        <p class="track-author">${authorName} / ${collectionName}</p>
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

    const loadTopAuthors = async () => {
        const authorsList = document.querySelector('.top-authors ul');
        if (!authorsList) return; // Guard clause if element doesn't exist

        try {
            const response = await fetch('/api/users/authors');
            if (!response.ok) throw new Error('Не удалось загрузить список авторов');
            const authors = await response.json();

            authorsList.innerHTML = ''; // Clear static/old list

            if (authors.length === 0) {
                authorsList.innerHTML = '<li>Авторов пока нет.</li>';
                return;
            }

            authors.forEach(author => {
                const listItem = document.createElement('li');
                listItem.textContent = author.name;
                authorsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Ошибка при загрузке списка авторов:', error);
            // Keep the static list as a fallback
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
                    const response = await fetch(`/api/tracks/${trackId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (!response.ok) {
                        const result = await response.json();
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
    const forgotPasswordFormContainer = document.getElementById('forgot-password-form-container');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const showForgotPasswordLink = document.getElementById('show-forgot-password');
    const backToLoginLink = document.getElementById('back-to-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    // Show modal
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.style.display = 'block';
        showLoginForm(); // Ensure login form is shown by default
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

    const showLoginForm = () => {
        loginFormContainer.style.display = 'block';
        registerFormContainer.style.display = 'none';
        forgotPasswordFormContainer.style.display = 'none';
    };

    const showRegisterForm = () => {
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'block';
        forgotPasswordFormContainer.style.display = 'none';
    };

    const showForgotPasswordForm = () => {
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'none';
        forgotPasswordFormContainer.style.display = 'block';
    };

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    showForgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordForm();
    });

    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
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
            if (!res.ok) throw new Error(result.msg || 'Ошибка входа');

            localStorage.setItem('token', result.token);

            // Check user role and redirect if admin or author
            if (result.role === 'admin' || result.role === 'author') {
                window.location.href = '/author.html';
            } else {
                authModal.style.display = 'none';
                updateUIForAuthState();
                window.location.reload(); // Reload for other roles or if role is not returned
            }
        } catch (err) {
            alert(err.message);
        }
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        if (data.password !== data.password2) {
            alert('Пароли не совпадают');
            return;
        }

        try {
            const res = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.msg || 'Ошибка регистрации');

            // Automatically log in the user and redirect
            localStorage.setItem('token', result.token);

            if (result.role === 'author') {
                window.location.href = '/author.html';
            } else {
                authModal.style.display = 'none';
                updateUIForAuthState();
                window.location.reload();
            }
        } catch (err) {
            alert(err.message);
        }
    });

    // Forgot password form submission
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(forgotPasswordForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const res = await fetch('/api/users/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.msg || 'Ошибка при отправке запроса');
                
                alert('Если пользователь с таким Email или телефоном существует, мы выслали инструкции по восстановлению на указанный адрес.');
                showLoginForm(); // Go back to login form
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(item => {
        item.addEventListener('click', e => {
            const targetId = e.currentTarget.dataset.target;
            const passwordInput = document.getElementById(targetId);
            const icon = e.currentTarget.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Function to update UI based on auth state
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

    // Initial data loading on page load
    loadCollectionsMenu();
    loadTracks();
    loadTopAuthors();
    updateUIForAuthState();
});
