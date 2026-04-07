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

        // Click target is .thumb-wrap (the inner <img> has pointer-events: none
        // to defeat Edge's Visual Search hover icon).
        const wraps = document.querySelectorAll('.thumb-wrap');
        if (wraps.length === 0) return;

        const selected = new Set();   // keys are basenames
        const countEl  = document.getElementById('sel-count');

        function updateCount() {
            if (countEl) countEl.textContent = selected.size + ' selected';
        }

        function toggleSelect(wrap) {
            const k = wrap.dataset.name;
            if (!k) return;
            if (selected.has(k)) {
                selected.delete(k);
                wrap.classList.remove('selected');
            } else {
                selected.add(k);
                wrap.classList.add('selected');
            }
            updateCount();
        }

        wraps.forEach(function (wrap) {
            // Right-click toggles selection. stopPropagation so the wrapping
            // <a class='spotlight'> in spotlight mode doesn't see it.
            wrap.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleSelect(wrap);
            });
            // In pview mode, left-click opens our viewer. In spotlight mode,
            // we let the click bubble to the wrapping <a class='spotlight'>
            // which the spotlight library binds to.
            if (viewer === 'pview') {
                wrap.addEventListener('click', function (e) {
                    if (e.altKey) return;     // reserve for future use
                    if (window.PView && wrap.dataset.full) {
                        window.PView.open(wrap.dataset.full);
                    }
                });
            }
        });

        const btnAll = document.getElementById('btn-select-all');
        if (btnAll) btnAll.addEventListener('click', function () {
            wraps.forEach(function (w) {
                if (!selected.has(w.dataset.name)) toggleSelect(w);
            });
        });

        const btnClear = document.getElementById('btn-clear-all');
        if (btnClear) btnClear.addEventListener('click', function () {
            document.querySelectorAll('.thumb-wrap.selected').forEach(function (w) {
                toggleSelect(w);
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
