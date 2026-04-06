# Othello

A PHP + vanilla-JS retinal-image browser. Rewrite of `Clarus_Viewer` with
the same data store, same look, plus:

- Search box (surname / first name / MRN) on the alphabetic selector row
- Default view = today's patients
- Right-click an exam date to open it in the current tab (left-click still
  opens it in a new tab, as before)
- Lazy thumbnail generation in the patient folder if missing
- Per-thumbnail selection in exam view, with **Export selected** that streams
  a ZIP of the originals through the browser's native Save-As dialog
- Banner toggle switch flipping `$viewer` between `spotlight` and `pview`,
  defaulting from `config.ini` and persisted in the PHP session
- Rewritten **PView**: cursor-anchored exponential zoom, inertial pan,
  Ctrl/Shift+wheel for contrast/brightness, Alt+click red-free, with a
  "Colour" / "Red Free" mode indicator
- Spotlight viewer kept as-is (`js/spotlight.bundle.js`)

The data store at `D:\clarus_data\` is shared with Clarus_Viewer and is **not**
modified by Othello with one exception: missing `t-<filename>.jpg` thumbnails
are created in-place on first view. Existing thumbnails are never overwritten.

## Server requirements

- PHP 7.4+ (PHP 8.x recommended)
- Extensions: `gd` (thumbnail generation), `zip` (export). On Windows both
  ship with PHP — uncomment `extension=gd` and `extension=zip` in `php.ini`.
- A virtual directory or alias at `/Clarus_Data/` (or whatever
  `config.ini [paths.<servername>] data_url` says) pointing at the data
  filesystem path.

## Configuration

Edit `config.ini`:

- `[site] title / version / favicon`
- `[viewer] default = pview | spotlight` — first-visit default
- `[paths.<SERVER_NAME>]` — one section per server hostname:
  - `data_fs`  : filesystem path to the patient folder root
  - `data_url` : web URL prefix that serves that folder
  - `base_url` : where Othello itself is mounted

`config.php` selects the section matching `$_SERVER['SERVER_NAME']`, falling
back to `paths.localhost`.

## Export over plain HTTP

Othello is intended for closed networks served over plain HTTP. The
`window.showDirectoryPicker()` File System Access API is **not** available in
that context, so export is handled entirely server-side: clicking
**Export selected** POSTs the selection to `export.php`, which builds a temp
ZIP and streams it back with `Content-Disposition: attachment`. Edge / any
browser then shows its standard Save-As dialog so the user picks the
destination folder.

The ZIP contains the original full-resolution files with their original
underscore-delimited filenames. Thumbnails (`t-*.jpg`) are excluded.

## Keyboard / mouse in PView

| Action                       | Binding                       |
|------------------------------|-------------------------------|
| Zoom (cursor-anchored)       | Mouse wheel                   |
| Pan                          | Click + drag (release glides) |
| Contrast                     | Ctrl + wheel                  |
| Brightness                   | Shift + wheel                 |
| Toggle Colour / Red Free     | Alt + click                   |
| Close overlay                | Esc or X                      |

## File layout

```
Othello/
├── index.php          front controller / router
├── config.php         session boot, config.ini load, paths
├── config.ini         user-editable defaults
├── set_viewer.php     POST endpoint: writes $_SESSION['viewer']
├── export.php         POST endpoint: streams ZIP of selected originals
├── header.php         <head>, asset includes, OTHELLO global
├── banner.php         title + viewer toggle
├── footer.php
├── favicon.ico
├── README.md
├── TODO_DUAL_VIEW.md  future side-by-side dual-image work
├── css/styles.css     ported from Clarus + new toggle/search/selection CSS
├── js/
│   ├── PView.js          vanilla canvas viewer
│   ├── exam.js           thumbnail select / export / right-click handling
│   ├── search.js         search-box UX (focus shortcut, clear button)
│   ├── viewer-toggle.js  banner switch -> set_viewer.php -> reload
│   └── spotlight.bundle.js  v0.7.8, copied verbatim from Clarus_Viewer
└── lib/
    ├── thumbnail.php  Thumbnail() + ensure_thumb()
    ├── patient.php    filename parsing, today/search helpers
    └── render.php     HTML emitters for list/dates/exam views
```
