<?php
/**
 * @var array $config
 */

$frameworks = $config['frameworks'];

$requestedFw = $_GET['fw'] ?? null;
$initialKey = is_string($requestedFw) && array_key_exists($requestedFw, $frameworks)
    ? $requestedFw
    : array_key_first($frameworks);

$releasesByFramework = [];
foreach ($frameworks as $key => $info) {
    $releasesByFramework[$key] = tessel_fetch_github_releases($info['repo'], $config['github_cache_ttl']);
}
?>

<section class="page-heading">
  <h1><?= h(t('changelog.heading')) ?></h1>
  <p><?= h(t('changelog.subtitle')) ?></p>
</section>

<section class="section">
  <tsl-tabs value="<?= h($initialKey) ?>">
    <?php foreach ($frameworks as $key => $info): ?>
      <tsl-tab value="<?= h($key) ?>"><?= h($info['label']) ?></tsl-tab>
    <?php endforeach; ?>

    <?php foreach ($frameworks as $key => $info): ?>
      <?php
        $data = $releasesByFramework[$key];
        $releases = $data['releases'] ?? [];
      ?>
      <tsl-tab-panel value="<?= h($key) ?>">
        <div class="framework-panel-heading">
          <img src="<?= h($info['icon']) ?>" alt="" class="framework-panel-heading__icon">
          <h2><?= h($info['label']) ?></h2>
        </div>

        <?php if (!$data['ok'] && empty($releases)): ?>

          <tsl-info-bar severity="warning" title="<?= h(t('changelog.error.title')) ?>" surface>
            <?= h(sprintf(t('changelog.error.instructions'), $info['label'])) ?>
            <?php if (!empty($data['error'])): ?>
              <br><code><?= h($data['error']) ?></code>
            <?php endif; ?>
          </tsl-info-bar>

        <?php elseif (empty($releases)): ?>

          <tsl-info-bar severity="informational" surface><?= h(t('changelog.no_versions')) ?></tsl-info-bar>

        <?php else: ?>

          <?php if (!empty($data['stale'])): ?>
            <tsl-info-bar severity="informational" surface><?= h(t('download.stale_notice')) ?></tsl-info-bar>
          <?php endif; ?>

          <div class="release-list">
            <?php foreach ($releases as $index => $release): ?>
              <?php
                $tag = $release['tag_name'] ?? 'untagged';
                $title = $release['name'] ?: $tag;
                $publishedAt = $release['published_at'] ?? $release['created_at'] ?? null;
                $publishedLabel = $publishedAt ? date('F j, Y', strtotime($publishedAt)) : '';
                $notesHtml = tessel_render_release_notes($release['body'] ?? '');
              ?>
              <tsl-expander header="<?= h($title) ?>" <?= $index === 0 ? 'expanded' : '' ?>>
                <div class="release-meta">
                  <?php if ($index === 0): ?>
                    <tsl-badge kind="accent" solid><?= h(t('download.latest')) ?></tsl-badge>
                  <?php endif; ?>
                  <?php if (!empty($release['prerelease'])): ?>
                    <tsl-badge kind="warning"><?= h(t('download.prerelease')) ?></tsl-badge>
                  <?php endif; ?>
                  <tsl-badge kind="neutral"><?= h($tag) ?></tsl-badge>
                  <?php if ($publishedLabel): ?>
                    <tsl-text variant="secondary"><?= h(sprintf(t('download.published_on'), $publishedLabel)) ?></tsl-text>
                  <?php endif; ?>
                </div>

                <div class="changelog-notes">
                  <?php if ($notesHtml !== ''): ?>
                    <?= $notesHtml ?>
                  <?php else: ?>
                    <tsl-text variant="secondary"><?= h(t('changelog.no_notes')) ?></tsl-text>
                  <?php endif; ?>
                </div>
              </tsl-expander>
            <?php endforeach; ?>
          </div>

          <div class="download-footer">
            <a href="https://github.com/<?= h($info['repo']) ?>/releases" target="_blank" rel="noopener">
              <tsl-button variant="link"><?= tessel_icon_github(14) ?> <?= h(sprintf(t('changelog.view_on_github'), $info['label'])) ?></tsl-button>
            </a>
          </div>

        <?php endif; ?>
      </tsl-tab-panel>
    <?php endforeach; ?>
  </tsl-tabs>
</section>
