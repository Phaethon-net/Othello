# Dual-Image Side-by-Side View

**Status: implemented (v1).**

Two retinal images can be viewed side by side in the PView overlay, each
with **independent** zoom / pan / brightness / contrast / red-free state.
Per the original spec each pane's controls are entirely separate; the panes
are not linked.

## How to use it

1. Click any thumbnail in an exam view → opens single-pane PView (pane A).
2. Click the **+ Add second view** button at the top of the overlay.
3. The picker modal opens, showing every image for the same patient,
   grouped by eye (Right Eye / Left Eye) and then by date (newest first).
4. Click a thumbnail in the picker → it loads into pane B and the layout
   splits 50/50.
5. Each pane has its own controls. Mouse wheel / Ctrl+wheel / Shift+wheel /
   Alt+click only affect the pane the cursor is over. Each pane shows its
   own zoom / contrast / brightness / mode readouts in the top-left.
6. Click the **×** in pane B's top-right to return to single-pane mode.
   Pane A keeps its current view state.

## Implementation notes

- `js/PView.js` is structured around a `Pane` class. The `PView` controller
  owns two instances (`paneA`, `paneB`) and toggles `#overlay.single` ↔
  `#overlay.dual` to drive the CSS layout.
- Each `Pane` has its own offscreen canvas + cached `ImageData` for the
  red-free swap, so the two panes can be in different colour modes.
- The picker is populated from `window.OTHELLO.patientImages`, which
  `index.php` emits inline on exam-view pages via
  `lib/patient.php → all_patient_images()`.
- Window `resize` and the single↔dual transitions both call
  `pane.resize()` so each canvas's backing store matches its CSS size and
  the image is re-centred.

## Future work (still not implemented)

- **Linked mode toggle.** A "link panes" checkbox that propagates
  zoom/pan/brightness/contrast/red-free deltas from whichever pane is under
  the cursor to the other pane. Would let the user step through aligned
  pairs without having to mirror gestures by hand.
- **More than two panes** (e.g. 2×2 grid for serial follow-up).
- **Image registration / alignment.** Beyond Othello's scope without an
  external library.
- **Measurement overlays.**
- **Drag-and-drop** an exam-view thumbnail directly onto an open pane B as
  an alternative to the picker.
