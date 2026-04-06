/* Othello exam view — thumbnail selection, export, right-click on date pills.
 *
 * Selection model:
 *   - Right-click thumbnail toggles selection (no browser context menu).
 *   - Left-click thumbnail opens it in the active viewer.
 *       * spotlight: handled by the wrapping <a class="spotlight"> + spotlight lib
 *       * pview:     calls window.PView.open(url)
 *   - Select all / Clear all buttons; Export selected POSTs to export.php which
 *     streams a ZIP back so Edge's native Save-As dialog handles destination.
 */

(function () {
    'use strict';

    function init() {
        const O = window.OTHELLO || { viewer: 'pview', idx: '' };
        const viewer = O.viewer;
        const idx    = O.idx;

        // Right-click on date pills opens the exam view in the current tab.
        document.querySelectorAll('a.datepill').forEach(function (a) {
            a.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                window.location = a.href;
            });
        });

        const thumbs = document.querySelectorAll('img.exam-thumb');
        if (thumbs.length === 0) return;

        const selected = new Set();   // keys are basenames
        const countEl  = document.getElementById('sel-count');

        function updateCount() {
            if (countEl) countEl.textContent = selected.size + ' selected';
        }

        function toggleSelect(img) {
            const k = img.dataset.name;
            if (!k) return;
            if (selected.has(k)) {
                selected.delete(k);
                img.classList.remove('selected');
            } else {
                selected.add(k);
                img.classList.add('selected');
            }
            updateCount();
        }

        thumbs.forEach(function (img) {
            // Right-click toggles selection. Also stop the wrapping <a>'s
            // default context menu so spotlight mode works the same.
            img.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleSelect(img);
            });
            // In pview mode, left-click opens our viewer. In spotlight mode,
            // we let the wrapping <a class="spotlight"> handle it.
            if (viewer === 'pview') {
                img.addEventListener('click', function (e) {
                    if (e.altKey) return;     // reserve for future use
                    if (window.PView && img.dataset.full) {
                        window.PView.open(img.dataset.full);
                    }
                });
            }
        });

        // Suppress context menu on the spotlight <a> wrappers too, otherwise
        // Edge can show the menu before our img handler fires.
        document.querySelectorAll('a.spotlight').forEach(function (a) {
            a.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                const img = a.querySelector('img.exam-thumb');
                if (img) toggleSelect(img);
            });
        });

        const btnAll = document.getElementById('btn-select-all');
        if (btnAll) btnAll.addEventListener('click', function () {
            thumbs.forEach(function (i) {
                if (!selected.has(i.dataset.name)) toggleSelect(i);
            });
        });

        const btnClear = document.getElementById('btn-clear-all');
        if (btnClear) btnClear.addEventListener('click', function () {
            document.querySelectorAll('img.exam-thumb.selected').forEach(function (i) {
                toggleSelect(i);
            });
        });

        const btnExport = document.getElementById('btn-export');
        if (btnExport) btnExport.addEventListener('click', function () {
            if (selected.size === 0) {
                alert('No images selected.');
                return;
            }
            // Build a hidden POST form so the browser handles the download
            // (and the native Save As dialog) — works on plain HTTP, no JS fetch.
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'export.php';
            form.style.display = 'none';

            const addInput = function (name, value) {
                const inp = document.createElement('input');
                inp.type = 'hidden';
                inp.name = name;
                inp.value = value;
                form.appendChild(inp);
            };
            addInput('idx', idx);
            selected.forEach(function (n) { addInput('files[]', n); });

            document.body.appendChild(form);
            form.submit();
            form.remove();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
