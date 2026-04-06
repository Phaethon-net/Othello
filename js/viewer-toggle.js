/* Othello viewer toggle — flips $_SESSION['viewer'] via set_viewer.php
 * and reloads the current page so PHP re-emits the correct exam markup.
 */
(function () {
    'use strict';
    function init() {
        const sw = document.getElementById('viewerToggle');
        if (!sw) return;
        sw.addEventListener('change', async function (e) {
            const v = e.target.checked ? 'pview' : 'spotlight';
            try {
                const r = await fetch('set_viewer.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ viewer: v })
                });
                if (r.ok) {
                    location.reload();
                } else {
                    e.target.checked = !e.target.checked;
                    alert('Failed to set viewer.');
                }
            } catch (err) {
                e.target.checked = !e.target.checked;
                alert('Failed to set viewer: ' + err);
            }
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
