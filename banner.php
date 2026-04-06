<?php
// Banner: title left, viewer toggle + Phaethon credit right.
?>
<hr>
<div class='banner-content'>
    <div class='banner-left'>
        <span class='title-script'>Othello</span>&nbsp;<span class='title-plain'>Clarus</span>
    </div>
    <div class='banner-right'>
        <div class='switch-captions'>
            <span<?= $viewer === 'spotlight' ? " class='active'" : '' ?>>Spotlight</span>
            <span<?= $viewer === 'pview' ? " class='active'" : '' ?>>PView</span>
        </div>
        <label class='switch' title='Toggle viewer'>
            <input type='checkbox' id='viewerToggle' <?= $viewer === 'pview' ? 'checked' : '' ?>>
            <span class='slider'></span>
        </label>
        <br>
        <span class='phaethon'>Phaethon.net</span>
        <span class='version'>v.<?= htmlspecialchars($version) ?></span>
    </div>
</div>
