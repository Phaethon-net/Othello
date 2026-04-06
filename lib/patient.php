<?php
// Patient/exam helpers. All filename parsing assumes the Clarus convention:
//   folder: LASTNAME_FIRSTNAME_MRN_DOB
//   image:  LAST_FIRST_MRN_DOB_TYPE_MODALITY_IMAGING_YYYYMMDDHHMMSS_EYE_..._...
// Indices: 0=last, 1=first, 2=mrn, 3=dob, 5=modality (Color/Red-Free),
//          6=imaging type, 7=capture datetime (YYYYMMDDHHMMSS), 8=eye (OD|OS)

function parse_folder($folderName) {
    $p = explode('_', $folderName);
    return [
        'last'  => $p[0] ?? '',
        'first' => $p[1] ?? '',
        'mrn'   => $p[2] ?? '',
        'dob'   => isset($p[3]) ? substr($p[3], 0, 10) : '',
    ];
}

function parse_image($basename) {
    $p = explode('_', $basename);
    return [
        'last'        => $p[0] ?? '',
        'first'       => $p[1] ?? '',
        'mrn'         => $p[2] ?? '',
        'dob'         => $p[3] ?? '',
        'modality'    => $p[5] ?? '',
        'imagingType' => $p[6] ?? '',
        'captureDt'   => $p[7] ?? '',
        'eye'         => $p[8] ?? '',
    ];
}

// Folders that contain at least one full-resolution JPG whose filename
// has today's YYYYMMDD in the capture-datetime position. Mirrors Clarus's
// fileFilter() + glob check, but only includes folders that actually have
// today's images (not just folders touched today).
function today_patients($path, $today) {
    $hits = [];
    foreach (glob($path . '*', GLOB_ONLYDIR) as $f) {
        // Check for any non-thumbnail JPG with today's date in field [7]
        $jpgs = glob($f . '/*.jpg');
        foreach ($jpgs as $j) {
            $base = basename($j);
            if (strpos($base, 't-') === 0) continue;
            $p = explode('_', $base);
            if (isset($p[7]) && substr($p[7], 0, 8) === $today) {
                $hits[] = $f;
                break;
            }
        }
    }
    natcasesort($hits);
    return $hits;
}

function search_patients($path, $q) {
    $q = trim($q);
    if ($q === '') return [];
    $qLower    = mb_strtolower($q);
    $isMrnLike = ctype_alnum($q);
    $hits = [];
    foreach (glob($path . '*', GLOB_ONLYDIR) as $f) {
        $base = basename($f);
        $p = explode('_', $base);
        if (count($p) < 4) continue;
        $lastL  = mb_strtolower($p[0]);
        $firstL = mb_strtolower($p[1]);
        $mrnL   = mb_strtolower($p[2]);
        $matches =
            (function_exists('str_starts_with') ? str_starts_with($lastL, $qLower) : strpos($lastL, $qLower) === 0)
            || (function_exists('str_contains') ? str_contains($firstL, $qLower) : strpos($firstL, $qLower) !== false)
            || ($isMrnLike && (function_exists('str_contains') ? str_contains($mrnL, $qLower) : strpos($mrnL, $qLower) !== false));
        if ($matches) $hits[] = $f;
    }
    natcasesort($hits);
    return $hits;
}

// Returns every full-resolution image in a patient folder, structured for
// the dual-view picker. Each element: {url, thumb, name, eye, date, modality, imagingType}.
function all_patient_images($folderPath, $dataURL, $idx) {
    $out = [];
    $files = glob($folderPath . '/*.jpg');
    if (!is_array($files)) return $out;
    natcasesort($files);
    $encIdx = rawurlencode($idx);
    foreach ($files as $f) {
        $base = basename($f);
        if (strpos($base, 't-') === 0) continue;
        $info = parse_image($base);
        $thumbBn = 't-' . $base;
        // Make sure the thumb exists for the picker — uses ensure_thumb from lib/thumbnail.php
        if (function_exists('ensure_thumb')) ensure_thumb($f);
        $out[] = [
            'url'         => $dataURL . $encIdx . '/' . rawurlencode($base),
            'thumb'       => $dataURL . $encIdx . '/' . rawurlencode($thumbBn),
            'name'        => $base,
            'eye'         => $info['eye'],
            'date'        => substr($info['captureDt'], 0, 8),
            'modality'    => $info['modality'],
            'imagingType' => $info['imagingType'],
        ];
    }
    return $out;
}

// Unique exam dates (YYYYMMDD) for a patient folder.
function unique_exam_dates_for($folderPath) {
    $dates = [];
    foreach (glob($folderPath . '/*.jpg') as $j) {
        $base = basename($j);
        if (strpos($base, 't-') === 0) continue;
        $p = explode('_', $base);
        if (isset($p[7])) $dates[] = substr($p[7], 0, 8);
    }
    $dates = array_unique($dates);
    natcasesort($dates);
    return $dates;
}
