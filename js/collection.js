document.addEventListener('DOMContentLoaded', () => {
    const collectionDetailContainer = document.getElementById('collection-detail-container');
    const collectionId = new URLSearchParams(window.location.search).get('id');

    if (!collectionId) {
        collectionDetailContainer.innerHTML = '<h2>Сборник не найден.</h2>';
        return;
    }

    const loadCollectionDetails = async () => {
        try {
            const response = await fetch(`/api/collections/${collectionId}`);
            if (!response.ok) throw new Error('Не удалось загрузить сборник');
            const collection = await response.json();

            document.title = `${collection.name} - AI-Ромалы`;

            let tracksHTML = '<ul>';
            collection.tracks.forEach(track => {
                tracksHTML += `<li>${track.title} - ${track.author.name}</li>`;
            });
            tracksHTML += '</ul>';

            collectionDetailContainer.innerHTML = `
                <div class="collection-header">
                    <img src="/${collection.coverImagePath}" alt="Обложка сборника" class="collection-cover">
                    <div class="collection-info">
                        <h2>${escapeHTML(collection.name)}</h2>
                        <p>${escapeHTML(collection.description)}</p>
                    </div>
                </div>
                <h3>Треки в сборнике</h3>
                <div class="track-list">${tracksHTML}</div>
            `;

        } catch (error) {
            console.error('Ошибка загрузки сборника:', error);
            collectionDetailContainer.innerHTML = `<h2>${error.message}</h2>`;
        }
    };

    const loadCollectionsMenu = async () => {
        const collectionsList = document.getElementById('collections-list');
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
            if(collectionsList) collectionsList.innerHTML = '<li>Ошибка загрузки</li>';
        }
    };

    const loadTopAuthors = async () => {
        const authorsList = document.getElementById('authors-list');
        if (!authorsList) return;

        try {
            const response = await fetch('/api/users/authors');
            if (!response.ok) throw new Error('Не удалось загрузить список авторов');
            const authors = await response.json();

            authorsList.innerHTML = '';

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
        }
    };

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"'/]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            "'": '&#39;', '"': '&quot;', '/': '&#x2F;'
        }[tag] || tag));
    }

    // Initial Load
    loadCollectionDetails();
    loadCollectionsMenu();
    loadTopAuthors();
});
