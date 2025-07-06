document.addEventListener('DOMContentLoaded', () => {
    const trackContainer = document.getElementById('track-container');
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('id');

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

    loadTrack();
});
