<?php
/**
 * @var array $config
 * @var string $lang
 * @var string $page
 */
?>
<!DOCTYPE html>
<html lang="<?= h($lang) ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($config['site_name']) ?></title>
<meta name="description" content="<?= h(t('meta.description')) ?>">
<link rel="icon" href="assets/images/favicon.png" type="image/png">
<link rel="stylesheet" href="assets/css/style.css">
<script>
  // Applied before Tessel.js loads, so the page doesn't flash the wrong
  // theme while the module script (deferred by spec) finishes loading.
  (function () {
    try {
      var saved = localStorage.getItem('tessel-theme') || 'system';
      var dark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var root = document.documentElement;
      root.setAttribute('data-tessel-theme', dark ? 'dark' : 'light');
      root.style.colorScheme = dark ? 'dark' : 'light';
      root.style.background = dark ? '#0f1115' : '#f4f5f7';
    } catch (e) {}
  })();
</script>
</head>
<body>

<header class="site-header">
  <div class="site-header__inner">
    <a class="brand" href="index.php">
      <img src="assets/images/logo.png" alt="<?= h($config['site_name']) ?>" class="brand__logo">
      <span class="brand__name"><?= h($config['site_name']) ?></span>
    </a>

    <button type="button" class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>

    <nav class="nav-links">
      <a href="index.php?page=home" class="<?= $page === 'home' ? 'is-active' : '' ?>"><?= h(t('nav.home')) ?></a>
      <a href="index.php?page=download" class="<?= $page === 'download' ? 'is-active' : '' ?>"><?= h(t('nav.download')) ?></a>
      <a href="index.php?page=changelog" class="<?= $page === 'changelog' ? 'is-active' : '' ?>"><?= h(t('nav.changelog')) ?></a>
    </nav>

    <div class="nav-actions">
      <div class="lang-switcher">
        <button type="button" class="lang-switcher__toggle" aria-haspopup="true" aria-expanded="false">
          <img src="<?= h($config['supported_languages'][$lang]['flag']) ?>" alt="" class="lang-switcher__flag">
          <span class="lang-switcher__code"><?= h(strtoupper($lang)) ?></span>
          <span class="lang-switcher__chevron" aria-hidden="true">▾</span>
        </button>
        <div class="lang-switcher__menu" role="menu">
          <?php foreach ($config['supported_languages'] as $code => $info): ?>
            <a
              role="menuitem"
              class="lang-switcher__item <?= $code === $lang ? 'is-active' : '' ?>"
              href="?<?= h(http_build_query(array_merge($_GET, ['lang' => $code]))) ?>"
            >
              <img src="<?= h($info['flag']) ?>" alt="" class="lang-switcher__flag">
              <span><?= h($info['label']) ?></span>
            </a>
          <?php endforeach; ?>
        </div>
      </div>

      <tsl-theme-toggle></tsl-theme-toggle>
    </div>
  </div>
</header>

<main class="site-main">
