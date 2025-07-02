document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    const parseJwt = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    };

    if (!token) {
        window.location.href = '/';
        return;
    }

    const decodedToken = parseJwt(token);
    if (!decodedToken || !decodedToken.user || decodedToken.user.role !== 'admin') {
        alert('Доступ запрещен. Эта страница только для администраторов.');
        window.location.href = '/';
        return;
    }

    const currentUser = decodedToken.user;
    const usernameDisplay = document.getElementById('username-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    const cabinetLink = document.getElementById('cabinet-link');
    const logoutBtn = document.getElementById('logout-btn');
    const loginBtn = document.getElementById('login-btn');
    const authorsListContainer = document.getElementById('authors-management-list');
    const sidebarAuthorsList = document.getElementById('authors-list');

    // --- UI Update Functions ---
    const updateHeaderUI = () => {
        usernameDisplay.textContent = currentUser.name;
        userRoleDisplay.textContent = currentUser.role;
        cabinetLink.style.display = 'inline';
        logoutBtn.style.display = 'inline-block';
        loginBtn.style.display = 'none';
    };

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/';
    });

    // --- Data Loading Functions ---
    const loadAuthors = async () => {
        try {
            authorsListContainer.innerHTML = '<p>Загрузка авторов...</p>';
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Не удалось загрузить список авторов.');
            }

            const users = await response.json();
            renderAuthors(users);

        } catch (error) {
            console.error('Ошибка при загрузке авторов:', error);
            authorsListContainer.innerHTML = `<p>${error.message}</p>`;
        }
    };

    const loadSidebarAuthors = async () => {
        try {
            const response = await fetch('/api/users/authors');
            if (!response.ok) throw new Error('Не удалось загрузить список авторов для боковой панели');
            const authors = await response.json();
            sidebarAuthorsList.innerHTML = '';
            authors.forEach(author => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#">${author.name}</a>`;
                sidebarAuthorsList.appendChild(li);
            });
        } catch (error) {
            console.error('Ошибка при загрузке авторов для боковой панели:', error);
            sidebarAuthorsList.innerHTML = '<li>Не удалось загрузить авторов.</li>';
        }
    };

    const renderAuthors = (users) => {
        authorsListContainer.innerHTML = '';
        if (users.length === 0) {
            authorsListContainer.innerHTML = '<p>Авторы не найдены.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'authors-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Имя</th>
                    <th>Email/Телефон</th>
                    <th>Роль</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.dataset.userId = user._id;
            tr.innerHTML = `
                <td>${user.name}</td>
                <td>${user.emailOrPhone}</td>
                <td>${user.role}</td>
                <td>
                    <button class="btn-delete" ${user._id === currentUser.id ? 'disabled' : ''}>Удалить</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        authorsListContainer.appendChild(table);
    };

    // --- Event Delegation for Delete Buttons ---
    authorsListContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const row = e.target.closest('tr');
            const userId = row.dataset.userId;
            const userName = row.cells[0].textContent;

            if (confirm(`Вы уверены, что хотите удалить пользователя ${userName} и все его треки? Это действие необратимо.`)) {
                try {
                    const response = await fetch(`/api/users/${userId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.msg || 'Не удалось удалить пользователя.');
                    }

                    alert(result.msg);
                    row.remove(); // Remove user from the list

                } catch (error) {
                    console.error('Ошибка при удалении пользователя:', error);
                    alert(`Ошибка: ${error.message}`);
                }
            }
        }
    });

    const loadCollectionsList = async () => {
        const collectionsList = document.getElementById('collections-list');
        if (!collectionsList) return;
        try {
            const response = await fetch('/api/collections', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Не удалось загрузить сборники');
            const collections = await response.json();
            collectionsList.innerHTML = '';
            collections.forEach(collection => {
                if (collection.name !== 'Без сборника') {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="#">${collection.name}</a>`;
                    collectionsList.appendChild(li);
                }
            });
        } catch (error) {
            console.error('Ошибка при загрузке сборников:', error);
            collectionsList.innerHTML = '<li>Не удалось загрузить сборники.</li>';
        }
    };

    // --- Initial Load ---
    updateHeaderUI();
    loadAuthors();
    loadSidebarAuthors();
    loadCollectionsList();
});
