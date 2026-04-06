/* Othello PView — pure-vanilla canvas viewer with optional dual-pane mode.
 *
 * Per-pane:
 *   - cursor-anchored exponential zoom (mouse wheel)
 *   - click-drag pan with inertial glide
 *   - Ctrl+wheel  contrast
 *   - Shift+wheel brightness
 *   - Alt+click   toggle Colour / Red Free
 *   - per-pane readouts (zoom / contrast / brightness / mode)
 *
 * Layout modes:
 *   single  : only paneA visible, fills viewport
 *   dual    : paneA + paneB, 50/50 split
 *   b-only  : only paneB visible (after closing paneA in dual)
 *
 * Toolbars:
 *   - "+ Compare" (bottom centre)  -> single|b-only -> dual, picker target='add'
 *   - "Change"    (top centre, per pane, only in dual) -> picker target='A'|'B'
 *   - "×"         (top right, per pane) -> closePane(which); last pane closes overlay
 *
 * Public API:
 *   PView.open(url)         -- open url in single mode
 *   PView.close()           -- hide overlay, reset state
 *   PView.closePane(which)  -- 'A' or 'B'; last visible pane closes the overlay
 *   PView.openPicker(t)     -- t in {'add','A','B'}; default 'add'
 *   PView.closePicker()
 */

(function () {
    'use strict';

    function $(id) { return document.getElementById(id); }
    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

    /* ----------------------------------------------------------------- */
    /* Pane                                                              */
    /* ----------------------------------------------------------------- */

    function Pane(paneEl) {
        this.paneEl = paneEl;
        this.canvas = paneEl.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        const r = paneEl.querySelector('.readouts');
        this.rZoom       = r.querySelector('.r-zoom');
        this.rContrast   = r.querySelector('.r-contrast');
        this.rBrightness = r.querySelector('.r-brightness');
        this.rMode       = r.querySelector('.r-mode');

        this.img = null;
        this.imgLoaded = false;
        this.baseScale = 1;
        this.zoom = 1;
        this.minZoom = 1;
        this.maxZoom = 40;
        this.tx = 0;
        this.ty = 0;
        this.brightness = 1;
        this.contrast = 1;
        this.redFree = false;
        this.offCanvas = null;
        this.offCtx = null;
        this.rgbaNormal = null;
        this.rgbaRedFree = null;

        this.dragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.vx = 0;
        this.vy = 0;
        this.lastMoveTs = 0;
        this.coasting = false;
        this.rafPending = false;

        this._bind();
    }

    Pane.prototype._bind = function () {
        const self = this;
        this.canvas.addEventListener('wheel',        function (e) { self._onWheel(e); }, { passive: false });
        this.canvas.addEventListener('mousedown',    function (e) { self._onMouseDown(e); });
        this.canvas.addEventListener('click',        function (e) { self._onClick(e); });
        this.canvas.addEventListener('contextmenu',  function (e) { e.preventDefault(); });
        // Window-level move/up so dragging doesn't break when leaving the canvas
        this._onMoveBound = function (e) { self._onMouseMove(e); };
        this._onUpBound   = function (e) { self._onMouseUp(e); };
        window.addEventListener('mousemove', this._onMoveBound);
        window.addEventListener('mouseup',   this._onUpBound);
    };

    Pane.prototype.reset = function () {
        this.img = null;
        this.imgLoaded = false;
        this.zoom = 1;
        this.tx = 0;
        this.ty = 0;
        this.brightness = 1;
        this.contrast = 1;
        this.redFree = false;
        this.offCanvas = null;
        this.offCtx = null;
        this.rgbaNormal = null;
        this.rgbaRedFree = null;
        this.dragging = false;
        this.vx = this.vy = 0;
        this.coasting = false;
        this._updateReadouts();
        if (this.rMode) {
            this.rMode.textContent = 'Colour';
            this.rMode.classList.remove('redfree');
        }
        if (this.ctx) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    };

    Pane.prototype.load = function (url) {
        const self = this;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            self.img = img;
            self.imgLoaded = true;
            self.resize();
            self._buildOffscreen();
            self._centerImage();
            self._updateReadouts();
            self._requestRender();
        };
        img.onerror = function () {
            console.error('PView: failed to load', url);
        };
        img.src = url;
    };

    // Match the canvas's backing-store size to its CSS size and recompute fit-scale.
    Pane.prototype.resize = function () {
        const rect = this.canvas.getBoundingClientRect();
        // Avoid 0×0 (e.g. while pane is hidden); fall back to viewport.
        const cw = Math.max(1, Math.round(rect.width));
        const ch = Math.max(1, Math.round(rect.height));
        if (this.canvas.width !== cw)  this.canvas.width  = cw;
        if (this.canvas.height !== ch) this.canvas.height = ch;
        if (this.imgLoaded && this.img) {
            this._computeFitScale();
            this._centerImage();
        }
    };

    Pane.prototype._computeFitScale = function () {
        const w = this.img.width, h = this.img.height;
        const cw = this.canvas.width, ch = this.canvas.height;
        this.baseScale = Math.min(cw / w, ch / h);
        this.minZoom = 1;
    };

    Pane.prototype._centerImage = function () {
        const drawnW = this.img.width  * this.baseScale * this.zoom;
        const drawnH = this.img.height * this.baseScale * this.zoom;
        this.tx = (this.canvas.width  - drawnW) / 2;
        this.ty = (this.canvas.height - drawnH) / 2;
    };

    Pane.prototype._buildOffscreen = function () {
        const w = this.img.width, h = this.img.height;
        this.offCanvas = document.createElement('canvas');
        this.offCanvas.width = w;
        this.offCanvas.height = h;
        this.offCtx = this.offCanvas.getContext('2d', { willReadFrequently: true });
        this.offCtx.drawImage(this.img, 0, 0);
        try {
            this.rgbaNormal = this.offCtx.getImageData(0, 0, w, h);
            const rf = this.offCtx.getImageData(0, 0, w, h);
            const d = rf.data;
            for (let i = 0; i < d.length; i += 4) {
                const avg = (d[i + 1] + d[i + 2]); // green + blue, no red
                d[i] = avg;
                d[i + 1] = avg;
                d[i + 2] = avg;
            }
            this.rgbaRedFree = rf;
        } catch (e) {
            this.rgbaNormal = null;
            this.rgbaRedFree = null;
            console.warn('PView: getImageData failed (CORS?). Red-free disabled.', e);
        }
    };

    Pane.prototype._applyRedFree = function () {
        if (!this.offCtx || !this.rgbaNormal || !this.rgbaRedFree) return;
        this.offCtx.putImageData(this.redFree ? this.rgbaRedFree : this.rgbaNormal, 0, 0);
    };

    Pane.prototype._draw = function () {
        if (!this.imgLoaded) return;
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.filter = 'brightness(' + this.brightness.toFixed(2) + ') contrast(' + this.contrast.toFixed(2) + ')';
        const s = this.baseScale * this.zoom;
        ctx.setTransform(s, 0, 0, s, this.tx, this.ty);
        ctx.drawImage(this.offCanvas, 0, 0);
    };

    Pane.prototype._requestRender = function () {
        if (this.rafPending) return;
        this.rafPending = true;
        const self = this;
        requestAnimationFrame(function () { self._tick(); });
    };

    Pane.prototype._tick = function () {
        this.rafPending = false;
        if (this.coasting && !this.dragging) {
            this.tx += this.vx;
            this.ty += this.vy;
            this.vx *= 0.92;
            this.vy *= 0.92;
            if (Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.05) {
                this.coasting = false;
                this.vx = this.vy = 0;
            } else {
                this._requestRender();
            }
        }
        this._draw();
    };

    Pane.prototype._onWheel = function (e) {
        if (!this.imgLoaded) return;
        e.preventDefault();
        if (e.shiftKey) {
            this.brightness = clamp(this.brightness - e.deltaY / 2000, 0.1, 4);
        } else if (e.ctrlKey) {
            this.contrast = clamp(this.contrast - e.deltaY / 2000, 0.1, 4);
        } else {
            const rect = this.canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const k = Math.exp(-e.deltaY * 0.0015);
            const newZoom = clamp(this.zoom * k, this.minZoom, this.maxZoom);
            const ratio = newZoom / this.zoom;
            this.tx = cx - ratio * (cx - this.tx);
            this.ty = cy - ratio * (cy - this.ty);
            this.zoom = newZoom;
        }
        this._updateReadouts();
        this._requestRender();
    };

    Pane.prototype._onMouseDown = function (e) {
        if (!this.imgLoaded) return;
        if (e.button !== 0) return;
        if (e.altKey) return;
        e.preventDefault();
        this.dragging = true;
        this.coasting = false;
        this.vx = this.vy = 0;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.lastMoveTs = performance.now();
        this.canvas.classList.add('dragging');
    };

    Pane.prototype._onMouseMove = function (e) {
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.tx += dx;
        this.ty += dy;
        const now = performance.now();
        const dt = Math.max(1, now - this.lastMoveTs);
        const newVx = (dx / dt) * 16;
        const newVy = (dy / dt) * 16;
        this.vx = this.vx * 0.5 + newVx * 0.5;
        this.vy = this.vy * 0.5 + newVy * 0.5;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.lastMoveTs = now;
        this._requestRender();
    };

    Pane.prototype._onMouseUp = function (e) {
        if (!this.dragging) return;
        this.dragging = false;
        this.canvas.classList.remove('dragging');
        if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
            this.coasting = true;
            this._requestRender();
        }
    };

    Pane.prototype._onClick = function (e) {
        if (!this.imgLoaded) return;
        if (!e.altKey) return;
        e.preventDefault();
        this.redFree = !this.redFree;
        this._applyRedFree();
        if (this.rMode) {
            this.rMode.textContent = this.redFree ? 'Red Free' : 'Colour';
            this.rMode.classList.toggle('redfree', this.redFree);
        }
        this._requestRender();
    };

    Pane.prototype._updateReadouts = function () {
        if (this.rZoom)       this.rZoom.textContent       = 'zoom: '       + this.zoom.toFixed(2);
        if (this.rContrast)   this.rContrast.textContent   = 'contrast: '   + this.contrast.toFixed(2);
        if (this.rBrightness) this.rBrightness.textContent = 'brightness: ' + this.brightness.toFixed(2);
    };

    /* ----------------------------------------------------------------- */
    /* PView controller                                                  */
    /* ----------------------------------------------------------------- */

    let paneA = null, paneB = null;
    let overlay = null;
    let pickerTarget = 'add';   // 'add' | 'A' | 'B'

    function init() {
        overlay = $('overlay');
        if (!overlay) return;
        const aEl = $('paneA'), bEl = $('paneB');
        if (aEl) paneA = new Pane(aEl);
        if (bEl) paneB = new Pane(bEl);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onWindowResize);
    }

    function onKeyDown(e) {
        if (!overlay || overlay.style.display !== 'block') return;
        if (e.key === 'Escape') {
            const picker = $('picker');
            if (picker && picker.classList.contains('show')) {
                closePicker();
            } else {
                close();
            }
        }
    }

    function onWindowResize() {
        if (!overlay || overlay.style.display !== 'block') return;
        // Defer to next frame so CSS layout settles before reading pane sizes.
        requestAnimationFrame(function () {
            if (paneA && !overlay.classList.contains('b-only')) {
                paneA.resize(); paneA._requestRender();
            }
            if (paneB && (overlay.classList.contains('dual') || overlay.classList.contains('b-only'))) {
                paneB.resize(); paneB._requestRender();
            }
        });
    }

    function setMode(mode) {
        // mode: 'single' | 'dual' | 'b-only'
        overlay.classList.remove('single', 'dual', 'b-only');
        overlay.classList.add(mode);
    }

    function open(url) {
        if (!overlay) return;
        overlay.style.display = 'block';
        setMode('single');
        if (paneA) {
            paneA.reset();
            requestAnimationFrame(function () {
                paneA.resize();
                paneA.load(url);
            });
        }
        if (paneB) paneB.reset();
    }

    function close() {
        if (!overlay) return;
        overlay.style.display = 'none';
        setMode('single');
        if (paneA) paneA.reset();
        if (paneB) paneB.reset();
        closePicker();
    }

    // Loads url into the missing pane and switches to dual mode.
    // Used by "+ Compare" in single OR b-only mode.
    function addCompareView(url) {
        if (!overlay) return;
        const wasBOnly = overlay.classList.contains('b-only');
        setMode('dual');
        requestAnimationFrame(function () {
            if (wasBOnly) {
                // paneB exists, paneA is the missing one
                if (paneA) {
                    paneA.reset();
                    paneA.resize();
                    paneA.load(url);
                }
                if (paneB) { paneB.resize(); paneB._centerImage(); paneB._requestRender(); }
            } else {
                // paneA exists, paneB is the missing one
                if (paneB) {
                    paneB.reset();
                    paneB.resize();
                    paneB.load(url);
                }
                if (paneA) { paneA.resize(); paneA._centerImage(); paneA._requestRender(); }
            }
        });
    }

    // Loads url into a specific existing pane (used by per-pane Change button).
    function replacePane(which, url) {
        const pane = (which === 'A') ? paneA : paneB;
        if (!pane) return;
        pane.reset();
        pane.resize();
        pane.load(url);
    }

    // Closes one pane. If it was the last visible pane, closes the overlay.
    function closePane(which) {
        if (!overlay) return;
        const isDual = overlay.classList.contains('dual');
        const isSingle = overlay.classList.contains('single');
        const isBOnly = overlay.classList.contains('b-only');

        if (which === 'A') {
            if (isSingle) { close(); return; }
            if (isDual) {
                if (paneA) paneA.reset();
                setMode('b-only');
                requestAnimationFrame(function () {
                    if (paneB) { paneB.resize(); paneB._centerImage(); paneB._requestRender(); }
                });
                return;
            }
            // b-only: paneA already hidden — nothing to close
            return;
        }
        if (which === 'B') {
            if (isBOnly) { close(); return; }
            if (isDual) {
                if (paneB) paneB.reset();
                setMode('single');
                requestAnimationFrame(function () {
                    if (paneA) { paneA.resize(); paneA._centerImage(); paneA._requestRender(); }
                });
                return;
            }
            // single: paneB already hidden — nothing to close
            return;
        }
    }

    /* ---- Picker ----------------------------------------------------- */

    function openPicker(target) {
        // target: 'add' (default) | 'A' | 'B'
        pickerTarget = (target === 'A' || target === 'B') ? target : 'add';
        const picker = $('picker');
        const body = $('picker-body');
        if (!picker || !body) return;
        const headerLabel = picker.querySelector('.picker-header > span:first-child');
        if (headerLabel) {
            headerLabel.textContent =
                pickerTarget === 'add' ? 'Select image to compare' :
                pickerTarget === 'A'   ? 'Change left view' :
                                         'Change right view';
        }
        const list = (window.OTHELLO && window.OTHELLO.patientImages) || [];
        if (list.length === 0) {
            body.innerHTML = "<div style='padding:20px;color:#b0b0b0;'>No other images for this patient.</div>";
        } else {
            body.innerHTML = renderPickerBody(list);
            body.querySelectorAll('.picker-thumb').forEach(function (el) {
                el.addEventListener('click', function () {
                    const url = el.dataset.url;
                    closePicker();
                    if (pickerTarget === 'A' || pickerTarget === 'B') {
                        replacePane(pickerTarget, url);
                    } else {
                        addCompareView(url);
                    }
                });
            });
        }
        picker.classList.add('show');
    }

    function closePicker() {
        const picker = $('picker');
        if (picker) picker.classList.remove('show');
    }

    function renderPickerBody(list) {
        // Group: eye -> date -> [items]
        const groups = { OD: {}, OS: {}, other: {} };
        list.forEach(function (it) {
            const eye = (it.eye === 'OD' || it.eye === 'OS') ? it.eye : 'other';
            const d = it.date || 'unknown';
            if (!groups[eye][d]) groups[eye][d] = [];
            groups[eye][d].push(it);
        });

        const eyeLabels = { OD: 'Right Eye (OD)', OS: 'Left Eye (OS)', other: 'Other' };
        const eyeOrder = ['OD', 'OS', 'other'];
        let html = '';
        eyeOrder.forEach(function (eye) {
            const dates = groups[eye];
            const dateKeys = Object.keys(dates).sort().reverse(); // newest first
            if (dateKeys.length === 0) return;
            html += "<div class='picker-eye'>";
            html += "<h3>" + eyeLabels[eye] + "</h3>";
            dateKeys.forEach(function (d) {
                const items = dates[d];
                html += "<div class='picker-date'>";
                html += "<h4>" + formatDate(d) + "</h4>";
                html += "<div class='picker-thumbs'>";
                items.forEach(function (it) {
                    const label = escapeHtml((it.modality || '') + ' ' + (it.imagingType || ''));
                    html += "<div class='picker-thumb' data-url='" + escapeAttr(it.url) + "' title='" + escapeAttr(it.name) + "'>";
                    html += "<img src='" + escapeAttr(it.thumb) + "' alt=''>";
                    html += "<div class='label'>" + label + "</div>";
                    html += "</div>";
                });
                html += "</div></div>";
            });
            html += "</div>";
        });
        return html;
    }

    function formatDate(yyyymmdd) {
        if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '';
        return yyyymmdd.slice(6, 8) + '-' + monthName(yyyymmdd.slice(4, 6)) + '-' + yyyymmdd.slice(0, 4);
    }
    function monthName(mm) {
        const m = ['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return m[parseInt(mm, 10)] || mm;
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
        });
    }
    function escapeAttr(s) { return escapeHtml(s); }

    /* ---- Bootstrap -------------------------------------------------- */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.PView = {
        open: open,
        close: close,
        closePane: closePane,
        openPicker: openPicker,
        closePicker: closePicker
    };

    window.openHelp = function () {
        const div = $('helper');
        if (div) div.style.display = 'block';
    };
    window.closeHelp = function () {
        const div = $('helper');
        if (div) div.style.display = 'none';
    };
})();
