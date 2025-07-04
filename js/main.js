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
    // --- DOM Elements ---
    const trackList = document.querySelector('.track-list');
    const collectionsList = document.getElementById('collections-list');
    const audioPlayer = document.getElementById('audio-player');

    // Auth Modal Elements
    const authModal = document.getElementById('auth-modal');
    const authModalCloseBtn = authModal.querySelector('.close-btn');
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


    // Add to Collection Modal Elements
    const addToCollectionModal = document.getElementById('add-to-collection-modal');
    const addToCollectionForm = document.getElementById('add-to-collection-form');
    const trackIdInput = document.getElementById('track-id-to-add');
    const collectionSelect = document.getElementById('collection-select');
    const addToCollectionCloseBtn = addToCollectionModal.querySelector('.close-btn');
    const statusMessage = addToCollectionForm.querySelector('.status-message');

    // --- State ---
    let currentPlayingButton = null;

    // --- DATA LOADING FUNCTIONS ---

    const loadCollectionsMenu = async () => {
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
            if (collectionsList) collectionsList.innerHTML = '<li>Ошибка загрузки</li>';
        }
    };

    const loadTracks = async () => {
        try {
            const response = await fetch('/api/tracks');
            if (!response.ok) throw new Error('Network response was not ok');
            const tracks = await response.json();
            trackList.innerHTML = '';

            if (tracks.length === 0) {
                trackList.innerHTML = '<p>Треков пока нет.</p>';
                return;
            }

            const token = localStorage.getItem('token');
            const decodedToken = token ? parseJwt(token) : null;
            const currentUser = decodedToken ? decodedToken.user : null;
            const isAdmin = currentUser && currentUser.role === 'admin';

            tracks.forEach(track => {
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

    // --- UI & EVENT LISTENERS ---

    trackList.addEventListener('click', async (e) => {
        const playBtn = e.target.closest('.play-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const addToCollectionBtn = e.target.closest('.add-to-collection-btn');

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

        if (addToCollectionBtn) {
            e.preventDefault();
            const trackId = addToCollectionBtn.dataset.id;
            openAddToCollectionModal(trackId);
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

    // --- MODAL: Auth ---
    
    // Show auth modal
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.style.display = 'block';
        showLoginForm();
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        updateUIForAuthState();
        loadTracks(); // Reload tracks to update admin controls
    });

    // Hide auth modal
    authModalCloseBtn.addEventListener('click', () => authModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == authModal) {
            authModal.style.display = 'none';
        }
        if (e.target == addToCollectionModal) {
            addToCollectionModal.style.display = 'none';
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

    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); showForgotPasswordForm(); });
    backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });


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
            if (result.role === 'admin' || result.role === 'author') {
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
                showLoginForm();
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

    // --- UI Update Function ---
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

    // --- Initial Load ---
    const init = () => {
        updateUIForAuthState();
        loadCollectionsMenu();
        loadTracks();
        loadTopAuthors();
    };

    init();
});