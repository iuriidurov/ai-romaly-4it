document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const decodedToken = parseJwt(token);
    if (!decodedToken || !decodedToken.user || decodedToken.user.role !== 'admin') {
        alert('Доступ запрещен. Только для администраторов.');
        window.location.href = '/';
        return;
    }

    const currentUser = decodedToken.user;

    const collectionsManagementList = document.getElementById('collections-management-list');
    const modal = document.getElementById('collection-modal');
    const modalTitle = document.getElementById('modal-title');
    const collectionForm = document.getElementById('collection-form');
    const collectionIdInput = document.getElementById('collection-id');
    const collectionNameInput = document.getElementById('collection-name');
    const showAddFormBtn = document.getElementById('show-add-form-btn');
    const closeBtn = document.querySelector('.close-btn');

    const updateHeaderUI = () => {
        const cabinetLink = document.getElementById('cabinet-link');
        const usernameDisplay = document.getElementById('username-display');
        const userRoleDisplay = document.getElementById('user-role-display');
        const logoutBtn = document.getElementById('logout-btn');
        const loginBtn = document.getElementById('login-btn');

        if (currentUser) {
            usernameDisplay.textContent = currentUser.name;
            userRoleDisplay.textContent = currentUser.role;
            cabinetLink.style.display = 'inline-block';
            logoutBtn.style.display = 'inline-block';
            loginBtn.style.display = 'none';
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                window.location.href = '/';
            });
        } else {
            cabinetLink.style.display = 'none';
            logoutBtn.style.display = 'none';
            loginBtn.style.display = 'inline-block';
        }
    };

    const loadCollections = async () => {
        try {
            const res = await fetch('/api/collections', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Не удалось загрузить сборники');
            const collections = await res.json();
            renderCollections(collections);
        } catch (error) {
            collectionsManagementList.innerHTML = `<p>${error.message}</p>`;
        }
    };

    const renderCollections = (collections) => {
        collectionsManagementList.innerHTML = '';
        collections.forEach(collection => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${collection.name}</td>
                <td class="actions">
                    <button class="btn btn-primary btn-edit" data-id="${collection._id}" data-name="${collection.name}">Редактировать</button>
                    <button class="btn btn-danger btn-delete" data-id="${collection._id}">Удалить</button>
                </td>
            `;
            collectionsManagementList.appendChild(tr);
        });
    };

    const openModalForEdit = (id, name) => {
        modalTitle.textContent = 'Редактировать сборник';
        collectionIdInput.value = id;
        collectionNameInput.value = name;
        modal.style.display = 'block';
    };

    const openModalForAdd = () => {
        modalTitle.textContent = 'Добавить сборник';
        collectionForm.reset();
        collectionIdInput.value = '';
        modal.style.display = 'block';
    };

    const closeModal = () => {
        modal.style.display = 'none';
    };

    collectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = collectionIdInput.value;
        const name = collectionNameInput.value;
        const url = id ? `/api/collections/${id}` : '/api/collections';
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.msg || 'Ошибка сохранения');
            }
            closeModal();
            loadCollections();
        } catch (error) {
            alert(error.message);
        }
    });

    collectionsManagementList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const id = e.target.dataset.id;
            const name = e.target.dataset.name;
            openModalForEdit(id, name);
        }
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            if (confirm('Вы уверены, что хотите удалить этот сборник? Треки будут перемещены в "Без сборника".')) {
                try {
                    const res = await fetch(`/api/collections/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error('Ошибка удаления');
                    loadCollections();
                } catch (error) {
                    alert(error.message);
                }
            }
        }
    });

    showAddFormBtn.addEventListener('click', openModalForAdd);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target == modal) closeModal();
    });

    function parseJwt(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

        const loadSidebarCollections = async () => {
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

    const loadSidebarAuthors = async () => {
        const authorsList = document.getElementById('authors-list');
        if (!authorsList) return;
        try {
            const response = await fetch('/api/users/authors');
            if (!response.ok) throw new Error('Не удалось загрузить список авторов для боковой панели');
            const authors = await response.json();
            authorsList.innerHTML = '';
            authors.forEach(author => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="#">${author.name}</a>`;
                authorsList.appendChild(li);
            });
        } catch (error) {
            console.error('Ошибка при загрузке авторов для боковой панели:', error);
            authorsList.innerHTML = '<li>Не удалось загрузить авторов.</li>';
        }
    };

    updateHeaderUI();
    loadCollections();
    loadSidebarCollections();
    loadSidebarAuthors();
});
