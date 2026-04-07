<?php
// HTML emitters. Kept dumb on purpose so index.php remains a thin controller.

function render_index_row($file, $currentIdx, $currentQ) {
    echo "<div id='index'>";
    echo "<hr>";
    echo "<a class='index0" . ($currentIdx === '0' ? ' active' : '') . "' href='" . htmlspecialchars($file) . "?id=0'><strong>TODAY</strong></a>";
    foreach (range('A', 'Z') as $L) {
        $cls = ($currentIdx === $L) ? 'index active' : 'index';
        echo "<a class='$cls' href='" . htmlspecialchars($file) . "?id=$L'><strong>$L</strong></a>";
    }
    $atCls = ($currentIdx === '@') ? 'index active' : 'index';
    echo "<a class='$atCls' href='" . htmlspecialchars($file) . "?id=@'><strong>&#64;</strong></a>";
    // Search box at the end of the row
    echo "<form class='searchform' method='get' action='" . htmlspecialchars($file) . "'>";
    echo "<input type='text' name='q' id='searchq' placeholder='search name or MRN&hellip;' value='" . htmlspecialchars($currentQ) . "' autocomplete='off'>";
    echo "<button type='button' class='clearq' title='Clear'>&times;</button>";
    echo "</form>";
    echo "<hr>";
    echo "</div>";
}

// Renders the patient cards used by TODAY / alphabetic / search results.
function render_patient_list(array $folders, $file) {
    if (empty($folders)) {
        echo "<div class='emptylist'>No patients found.</div>";
        return;
    }
    foreach ($folders as $folder) {
        $base = basename($folder);
        $info = parse_folder($base);
        $dobFmt = '';
        if ($info['dob'] !== '') {
            $dt = DateTime::createFromFormat('Ymd', $info['dob']);
            if ($dt) $dobFmt = $dt->format('d-M-Y');
        }
        echo "<div class='div_wrap'>";
        echo "  <div class='div_pat'>";
        echo "    <span class='namelabel'>" . htmlspecialchars($info['last']) . ", " . htmlspecialchars($info['first']) . "</span><br/>";
        echo "    <span class='idlabel'>" . htmlspecialchars($info['mrn']) . "<br/>" . htmlspecialchars($dobFmt) . "</span>";
        echo "  </div>";
        $dates = unique_exam_dates_for($folder);
        if (!empty($dates)) {
            echo "  <div class='div_list'>";
            foreach ($dates as $d) {
                $href = htmlspecialchars($file) . "?id=" . urlencode($base) . "&date=" . urlencode($d);
                $label = date('d-M-Y', strtotime($d));
                echo "    <div class='div_date'><a class='datepill' target='_blank' href='$href'>$label</a></div>";
            }
            echo "  </div>";
        }
        echo "</div>";
        echo "<hr>";
    }
}

// Renders the date-list table used when ?id=<patient> with no date.
function render_patient_dates($folderPath, $file) {
    $base = basename($folderPath);
    $info = parse_folder($base);
    $dobFmt = '';
    if ($info['dob'] !== '') {
        $dt = DateTime::createFromFormat('Ymd', $info['dob']);
        if ($dt) $dobFmt = $dt->format('d-M-Y');
    }
    $dates = unique_exam_dates_for($folderPath);
    echo "<table border=0>";
    echo "  <tr>";
    echo "    <td class='name'>";
    echo "      <span class='namelabel'>" . htmlspecialchars($info['last']) . ", " . htmlspecialchars($info['first']) . "</span><br/>";
    echo "      <span class='idlabel'>" . htmlspecialchars($info['mrn']) . "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($dobFmt) . "</span>";
    echo "    </td>";
    foreach ($dates as $d) {
        $href = htmlspecialchars($file) . "?id=" . urlencode($base) . "&date=" . urlencode($d);
        $label = date('d-M-Y', strtotime($d));
        echo "<td class='date'><a class='datepill' href='$href'>$label</a></td>";
    }
    echo "  </tr>";
    echo "</table>";
}

// Renders the exam view (RE/LE columns + selection toolbar).
function render_exam($idx, $date, $path, $dataURL, $viewer) {
    $folder = $path . $idx;
    $images = glob($folder . '/*.jpg');
    if (empty($images)) {
        echo "<div class='emptylist'>No images for this exam.</div>";
        return;
    }
    natcasesort($images);

    // Header box
    $first = parse_image(basename(reset($images)));
    $dobFmt = $first['dob'] !== '' ? date('d-M-Y', strtotime($first['dob'])) : '';
    $examFmt = date('d-M-Y', strtotime($date));
    echo "<div class='header'>";
    echo "  <span class='label'>Name:</span> " . htmlspecialchars($first['last']) . ", " . htmlspecialchars($first['first']);
    echo "  &nbsp;&nbsp;&nbsp;<span class='label'>MRN:</span> " . htmlspecialchars($first['mrn']);
    echo "  &nbsp;&nbsp;&nbsp;<span class='label'>DoB</span>: " . htmlspecialchars($dobFmt) . "<br/>";
    echo "  <span class='label'>Exam Date:</span> " . htmlspecialchars($examFmt);
    echo "</div>";

    // Toolbar
    echo "<div class='exam-toolbar'>";
    echo "  <button id='btn-select-all'>Select all</button>";
    echo "  <button id='btn-clear-all'>Clear all</button>";
    echo "  <button id='btn-export'>Export selected</button>";
    echo "  <span id='sel-count'>0 selected</span>";
    echo "</div>";

    echo "<div class='content' id='content'>";

    // Right eye
    echo "<div class='RE' id='RE'>";
    echo "  <div class='title'>RIGHT EYE</div>";
    foreach ($images as $imagePath) {
        $base = basename($imagePath);
        if (strpos($base, 't-') === 0) continue;
        $info = parse_image($base);
        if ($info['eye'] !== 'OD') continue;
        if (substr($info['captureDt'], 0, 8) !== $date) continue;
        echo render_thumb_cell($imagePath, $idx, $dataURL, $viewer, $info);
    }
    echo "</div>";

    // Left eye
    echo "<div class='LE' id='LE'>";
    echo "  <div class='title'>LEFT EYE</div>";
    foreach ($images as $imagePath) {
        $base = basename($imagePath);
        if (strpos($base, 't-') === 0) continue;
        $info = parse_image($base);
        if ($info['eye'] !== 'OS') continue;
        if (substr($info['captureDt'], 0, 8) !== $date) continue;
        echo render_thumb_cell($imagePath, $idx, $dataURL, $viewer, $info);
    }
    echo "</div>";

    echo "</div>"; // .content
}

function render_thumb_cell($imagePath, $idx, $dataURL, $viewer, $info) {
    ensure_thumb($imagePath);
    $base    = basename($imagePath);
    $thumbBn = 't-' . $base;
    $encBase  = rawurlencode($base);
    $encThumb = rawurlencode($thumbBn);
    $encIdx   = rawurlencode($idx);
    $dataSrc  = $dataURL . $encIdx . '/' . $encBase;
    $thumbSrc = $dataURL . $encIdx . '/' . $encThumb;
    $label    = htmlspecialchars($info['modality'] . ' ' . $info['imagingType']);
    $nameAttr = htmlspecialchars($base, ENT_QUOTES);

    // The .thumb-wrap div carries data attrs and click/contextmenu handlers.
    // The inner <img> has pointer-events: none so Edge's Visual Search hover
    // icon never triggers — Edge only attaches it to <img> elements that
    // actually receive pointer events.
    $out  = "<div class='cell'>";
    $out .= "  <div class='viewer'>";
    $out .= "    <div class='typeP'>$label</div>";
    if ($viewer === 'spotlight') {
        $out .= "    <a class='spotlight' href='$dataSrc'>";
        $out .= "      <div class='thumb-wrap' data-full='$dataSrc' data-name='$nameAttr'>";
        $out .= "        <img class='exam-thumb' src='$thumbSrc' alt=''>";
        $out .= "      </div>";
        $out .= "    </a>";
    } else {
        $out .= "    <div class='thumb-wrap' data-full='$dataSrc' data-name='$nameAttr'>";
        $out .= "      <img class='exam-thumb' src='$thumbSrc' alt=''>";
        $out .= "    </div>";
    }
    $out .= "  </div>";
    $out .= "</div>";
    return $out;
}
