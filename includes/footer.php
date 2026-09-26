<?php
/**
 * @var array $config
 * @var string $lang
 */
?>
</main>

<footer class="site-footer">
  <div class="site-footer__inner">
    <div class="site-footer__brand">
      <img src="assets/images/logo.png" alt="" class="brand__logo">
      <p><?= h(t('footer.tagline')) ?></p>
    </div>

    <div class="site-footer__col">
      <h4><?= h(t('footer.links_heading')) ?></h4>
      <a href="index.php?page=home"><?= h(t('nav.home')) ?></a>
      <a href="index.php?page=download"><?= h(t('nav.download')) ?></a>
      <a href="index.php?page=changelog"><?= h(t('nav.changelog')) ?></a>
      <a href="https://github.com/exlirixsoftware"><?= tessel_icon_github(16) ?> <?= h(t('nav.github')) ?></a>
    </div>

    <div class="site-footer__col">
      <h4><?= h(t('footer.resources_heading')) ?></h4>
      <span><?= h(t('footer.license')) ?></span>
    </div>

    <div class="site-footer__col">
      <h4><?= h(t('footer.language_heading')) ?></h4>
      <?php foreach ($config['supported_languages'] as $code => $info): ?>
        <a href="?<?= h(http_build_query(array_merge($_GET, ['lang' => $code]))) ?>" class="<?= $code === $lang ? 'is-active' : '' ?>">
          <img src="<?= h($info['flag']) ?>" alt="" class="lang-switcher__flag">
          <?= h($info['label']) ?>
        </a>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="site-footer__bottom">
    <?= sprintf(h(t('footer.copyright')), date('Y')) ?>
  </div>
</footer>

<script type="module" src="assets/js/app.js"></script>
</body>
</html>
