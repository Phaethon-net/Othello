<?php
// Lazy thumbnail generation. Writes "t-<basename>" alongside the source.
// This is the ONLY write Othello performs against D:\clarus_data\.

function Thumbnail($srcPath, $thumbPath, $width = 150) {
    if (file_exists($thumbPath)) return true;          // never overwrite
    if (!is_readable($srcPath))   return false;
    $bytes = @file_get_contents($srcPath);
    if ($bytes === false) return false;
    $image = @imagecreatefromstring($bytes);
    if (!$image) return false;
    $h = (int) round(imagesy($image) * $width / imagesx($image));
    if ($h <= 0) { imagedestroy($image); return false; }
    $out = imagecreatetruecolor($width, $h);
    imagecopyresampled($out, $image, 0, 0, 0, 0, $width, $h, imagesx($image), imagesy($image));
    $ok = imagejpeg($out, $thumbPath, 95);
    imagedestroy($image);
    imagedestroy($out);
    return $ok;
}

function ensure_thumb($imageFsPath) {
    $thumb = dirname($imageFsPath) . DIRECTORY_SEPARATOR . 't-' . basename($imageFsPath);
    if (!file_exists($thumb)) Thumbnail($imageFsPath, $thumb);
    return $thumb;
}
