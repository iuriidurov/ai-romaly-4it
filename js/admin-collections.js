document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    // Utility to parse JWT to get user info
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

    const decodedToken = token ? parseJwt(token) : null;
    const user = decodedToken ? decodedToken.user : null;

    // 1. Check for admin rights
    if (!token || !user || user.role !== 'admin') {
        alert('Доступ запрещен. Только для администраторов.');
        window.location.href = '/';
        return;
    }

    // 2. Get DOM elements
    const collectionsManagementList = document.getElementById('collections-management-list');
    const modal = document.getElementById('collection-modal');
    const modalTitle = document.getElementById('modal-title');
    const collectionForm = document.getElementById('collection-form');
    const collectionIdInput = document.getElementById('collection-id');
    const collectionNameInput = document.getElementById('collection-name');
    const collectionDescriptionInput = document.getElementById('collection-description');
    const collectionCoverInput = document.getElementById('collection-cover');
    const showAddFormBtn = document.getElementById('show-add-form-btn');
    const closeBtn = modal.querySelector('.close-btn');
    
    // Update header UI
    const usernameDisplay = document.getElementById('username-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    const cabinetLink = document.getElementById('cabinet-link');
    const logoutBtn = document.getElementById('logout-btn');
    const loginBtn = document.getElementById('login-btn');

    if (usernameDisplay) usernameDisplay.textContent = user.name;
    if (userRoleDisplay) userRoleDisplay.textContent = user.role;
    if (cabinetLink) cabinetLink.style.display = 'inline';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/';
        });
    }


    // 3. Load initial data
    loadCollections();
    loadCollectionsMenu(); // Load the left-side menu

    // 4. Functions
    async function loadCollections() {
        try {
            const res = await fetch('/api/collections', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (!res.ok) throw new Error('Не удалось загрузить сборники');
            const collections = await res.json();
            renderCollections(collections);
        } catch (error) {
            collectionsManagementList.innerHTML = `<tr><td colspan="2">${error.message}</td></tr>`;
        }
    }

    function renderCollections(collections) {
        collectionsManagementList.innerHTML = '';
        if (collections.length === 0) {
            collectionsManagementList.innerHTML = '<tr><td colspan="2">Сборники еще не созданы.</td></tr>';
            return;
        }
        collections.forEach(collection => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHTML(collection.name)}</td>
                <td class="actions">
                    <button class="btn btn-primary btn-sm btn-edit" data-id="${collection._id}">Редактировать</button>
                    <button class="btn btn-danger btn-sm btn-delete" data-id="${collection._id}">Удалить</button>
                </td>
            `;
            collectionsManagementList.appendChild(tr);
        });
    }

    function openModalForAdd() {
        modalTitle.textContent = 'Добавить сборник';
        collectionForm.reset();
        collectionIdInput.value = '';
        modal.style.display = 'block';
    }

    async function openModalForEdit(id) {
        try {
            const res = await fetch(`/api/collections/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Не удалось загрузить данные сборника');
            const collection = await res.json();

            modalTitle.textContent = 'Редактировать сборник';
            collectionIdInput.value = collection._id;
            collectionNameInput.value = collection.name;
            collectionDescriptionInput.value = collection.description || '';
            // Cover image cannot be pre-filled for security reasons
            modal.style.display = 'block';
        } catch (error) {
            alert(error.message);
        }
    }

    function closeModal() {
        modal.style.display = 'none';
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
        if (!collectionsList) return; // Exit if the element doesn't exist

        try {
            const response = await fetch('/api/collections');
            if (!response.ok) throw new Error('Не удалось загрузить список сборников');
            const collections = await response.json();
            
            collectionsList.innerHTML = ''; // Clear previous list
            
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

    // 5. Event Handlers
    collectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = collectionIdInput.value;
        const url = id ? `/api/collections/${id}` : '/api/collections';
        const method = id ? 'PUT' : 'POST';

        const formData = new FormData();
        formData.append('name', collectionNameInput.value);
        formData.append('description', collectionDescriptionInput.value);
        if (collectionCoverInput.files[0]) {
            formData.append('coverImage', collectionCoverInput.files[0]);
        }

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                    // No 'Content-Type' header, browser sets it for FormData
                },
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.msg || 'Ошибка сохранения');
            }
            
            closeModal();
            loadCollections();
            loadCollectionsMenu();
        } catch (error) {
            alert(error.message);
        }
    });

    collectionsManagementList.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('btn-edit')) {
            const id = target.dataset.id;
            openModalForEdit(id);
        }
        if (target.classList.contains('btn-delete')) {
            const id = target.dataset.id;
            if (confirm('Вы уверены, что хотите удалить этот сборник?')) {
                try {
                    const res = await fetch(`/api/collections/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error('Ошибка удаления');
                    loadCollections();
                    loadCollectionsMenu();
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
});
