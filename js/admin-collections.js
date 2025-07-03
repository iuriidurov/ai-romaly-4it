document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // 1. Проверка прав администратора
    if (!token || !user || user.role !== 'admin') {
        alert('Доступ запрещен. Только для администраторов.');
        window.location.href = '/';
        return;
    }

    // 2. Получение элементов DOM
    const collectionsManagementList = document.getElementById('collections-management-list');
    const modal = document.getElementById('collection-modal');
    const modalTitle = document.getElementById('modal-title');
    const collectionForm = document.getElementById('collection-form');
    const collectionIdInput = document.getElementById('collection-id');
    const collectionNameInput = document.getElementById('collection-name');
    const showAddFormBtn = document.getElementById('show-add-form-btn');
    const closeBtn = document.querySelector('.close-btn');
    const navMenu = document.querySelector('.nav-menu');

    // 3. Настройка навигации и запуск загрузки
    setupAdminNav();
    loadCollections();

    // 4. Функции
    function setupAdminNav() {
        navMenu.innerHTML = `
            <a href="/admin-collections.html" class="nav-link active">Управление сборниками</a>
            <a href="/admin-moderation.html" class="nav-link">Треки на модерации</a>
            <a href="#" id="logout-link" class="nav-link">Выход</a>
        `;
        document.getElementById('logout-link').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }

    async function loadCollections() {
        try {
            const res = await fetch('/api/collections', { headers: { 'Authorization': `Bearer ${token}` } });
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
                    <button class="btn btn-primary btn-sm btn-edit" data-id="${collection._id}" data-name="${collection.name}">Редактировать</button>
                    <button class="btn btn-danger btn-sm btn-delete" data-id="${collection._id}">Удалить</button>
                </td>
            `;
            collectionsManagementList.appendChild(tr);
        });
    }

    function openModalForEdit(id, name) {
        modalTitle.textContent = 'Редактировать сборник';
        collectionIdInput.value = id;
        collectionNameInput.value = name;
        modal.style.display = 'block';
    }

    function openModalForAdd() {
        modalTitle.textContent = 'Добавить сборник';
        collectionForm.reset();
        collectionIdInput.value = '';
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"/]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            "'": '&#39;', '"': '&quot;', '/': '&#x2F;'
        }[tag] || tag));
    }

    // 5. Обработчики событий
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
            if (confirm('Вы уверены, что хотите удалить этот сборник?')) {
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
});
