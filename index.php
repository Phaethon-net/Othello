<?php
require __DIR__ . '/config.php';

$idx  = isset($_GET['id'])   ? (string) $_GET['id']   : '0';
$date = isset($_GET['date']) ? (string) $_GET['date'] : '';
$q    = isset($_GET['q'])    ? trim((string) $_GET['q']) : '';

include __DIR__ . '/header.php';
include __DIR__ . '/banner.php';

render_index_row($file, $idx, $q);
?>

<!-- PView overlay (single instance, reused for every image) -->
<div id='overlay' class='single'>
    <div id='paneA' class='pane'>
        <canvas class='canvas' id='canvasA'></canvas>
        <div class='readouts'>
            <div class='r-zoom'>zoom: 1.00</div>
            <div class='r-contrast'>contrast: 1.00</div>
            <div class='r-brightness'>brightness: 1.00</div>
            <div class='r-mode'>Colour</div>
        </div>
        <button class='pane-change' onclick='PView.openPicker("A")'>Change</button>
        <div class='pane-close' onclick='PView.closePane("A")' title='Close this view'>&times;</div>
    </div>
    <div id='paneB' class='pane'>
        <canvas class='canvas' id='canvasB'></canvas>
        <div class='readouts'>
            <div class='r-zoom'>zoom: 1.00</div>
            <div class='r-contrast'>contrast: 1.00</div>
            <div class='r-brightness'>brightness: 1.00</div>
            <div class='r-mode'>Colour</div>
        </div>
        <button class='pane-change' onclick='PView.openPicker("B")'>Change</button>
        <div class='pane-close' onclick='PView.closePane("B")' title='Close this view'>&times;</div>
    </div>

    <div id='overlay-toolbar'>
        <button id='btn-add-second' onclick='PView.openPicker("add")'>+ Compare</button>
    </div>

    <div id='help' onclick='openHelp()'>?</div>
    <div id='helper' onclick='closeHelp()'>
        <h3>Othello PView Help</h3>
        <span class='bold'>Zoom in/out:</span> Mouse scroll over image (zooms toward cursor).<br>
        <span class='bold'>Pan:</span> Click &amp; drag. Release for inertia.<br>
        <span class='bold'>Contrast:</span> Ctrl + scroll.<br>
        <span class='bold'>Brightness:</span> Shift + scroll.<br>
        <span class='bold'>Toggle Colour / Red Free:</span> Alt + click.<br>
        <span class='bold'>Add second view:</span> Toolbar button (top centre).<br>
        <span class='bold'>Close:</span> Esc or X.<br><br>
        In dual view, each pane has its own independent controls.<br>
        Click this panel to dismiss.
    </div>

    <!-- Second-view picker modal -->
    <div id='picker'>
        <div class='picker-inner'>
            <div class='picker-header'>
                <span>Select second view</span>
                <span class='picker-close' onclick='PView.closePicker()'>&times;</span>
            </div>
            <div class='picker-body' id='picker-body'></div>
        </div>
    </div>
</div>

<?php
// Routing
if ($q !== '') {
    // Search results — same layout as TODAY/alphabetic
    render_patient_list(search_patients($path, $q), $file);

} elseif (strlen($idx) > 2 && $date === '') {
    // Patient detail (date list)
    $folderPath = $path . $idx;
    if (is_dir($folderPath)) {
        render_patient_dates($folderPath, $file);
    } else {
        echo "<div class='emptylist'>Unknown patient.</div>";
    }

} elseif (strlen($idx) > 2 && $date !== '') {
    // Exam view
    render_exam($idx, $date, $path, $dataURL, $viewer);
    // Emit the full patient image list for the dual-view picker.
    $patientImages = all_patient_images($path . $idx, $dataURL, $idx);
    echo "<script>window.OTHELLO.patientImages = " . json_encode($patientImages) . ";</script>";

} elseif ($idx === '0' || $idx === '') {
    // Default = TODAY
    render_patient_list(today_patients($path, $today), $file);

} else {
    // Alphabetic subgroup
    $folders = glob($path . $idx . '*', GLOB_ONLYDIR);
    if (!is_array($folders)) $folders = [];
    natcasesort($folders);
    render_patient_list($folders, $file);
}

include __DIR__ . '/footer.php';
