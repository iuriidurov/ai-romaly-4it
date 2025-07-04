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
    return str.replace(/[&<>"'\/]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        "'": '&#39;', '"': '&quot;', '/': '&#x2F;'
    }[tag] || tag));
}

document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('auth-modal');
    if (!authModal) return;

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

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.style.display = 'block';
            showLoginForm();
        });
    }

    if (authModalCloseBtn) {
        authModalCloseBtn.addEventListener('click', () => {
            authModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target == authModal) {
            authModal.style.display = 'none';
        }
    });

    function showLoginForm() {
        loginFormContainer.style.display = 'block';
        registerFormContainer.style.display = 'none';
        forgotPasswordFormContainer.style.display = 'none';
    }

    function showRegisterForm() {
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'block';
        forgotPasswordFormContainer.style.display = 'none';
    }

    function showForgotPasswordForm() {
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'none';
        forgotPasswordFormContainer.style.display = 'block';
    }

    if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    if (showForgotPasswordLink) showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); showForgotPasswordForm(); });
    if (backToLoginLink) backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });

    if (loginForm) {
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
                if (result.role === 'author' || result.role === 'admin') {
                    window.location.href = '/cabinet';
                } else {
                    authModal.style.display = 'none';
                    updateUIForAuthState();
                    window.location.reload(); 
                }
            } catch (err) {
                alert(err.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());
            if (data.password !== data.password2) {
                return alert('Пароли не совпадают');
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
    }

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

    const updateUIForAuthState = () => {
        const token = localStorage.getItem('token');
        if (cabinetLink && logoutBtn && loginBtn) {
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
        }
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/';
        });
    }

    updateUIForAuthState();
});
