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
  <h1><?= h(t('download.heading')) ?></h1>
  <p><?= h(t('download.subtitle')) ?></p>
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

          <tsl-info-bar severity="warning" title="<?= h(t('download.error.title')) ?>" surface>
            <?= h(sprintf(t('download.error.instructions'), $info['label'])) ?>
            <?php if (!empty($data['error'])): ?>
              <br><code><?= h($data['error']) ?></code>
            <?php endif; ?>
          </tsl-info-bar>

        <?php elseif (empty($releases)): ?>

          <tsl-info-bar severity="informational" surface><?= h(t('download.no_releases')) ?></tsl-info-bar>

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
                $assets = $release['assets'] ?? [];
              ?>
              <tsl-expander header="<?= h($title) ?>" <?= $index === 0 ? 'expanded' : '' ?>>
                <div class="release-meta">
                  <?php if ($index === 0): ?><tsl-badge kind="accent" solid><?= h(t('download.latest')) ?></tsl-badge><?php endif; ?>
                  <?php if (!empty($release['prerelease'])): ?><tsl-badge kind="warning"><?= h(t('download.prerelease')) ?></tsl-badge><?php endif; ?>
                  <?php if ($publishedLabel): ?>
                    <tsl-text variant="secondary"><?= h(sprintf(t('download.published_on'), $publishedLabel)) ?></tsl-text>
                  <?php endif; ?>
                </div>

                <h4 class="release-subheading"><?= h(t('download.source_heading')) ?></h4>
                <div class="demo-row">
                  <a href="<?= h($release['zipball_url'] ?? '#') ?>">
                    <tsl-button variant="outline" icon="download"><?= h(t('download.source_zip')) ?></tsl-button>
                  </a>
                  <a href="<?= h($release['tarball_url'] ?? '#') ?>">
                    <tsl-button variant="outline" icon="download"><?= h(t('download.source_targz')) ?></tsl-button>
                  </a>
                </div>

                <h4 class="release-subheading"><?= h(t('download.assets_heading')) ?></h4>
                <?php if (empty($assets)): ?>
                  <tsl-text variant="secondary"><?= h(t('download.no_assets')) ?></tsl-text>
                <?php else: ?>
                  <tsl-table>
                    <table>
                      <thead>
                        <tr>
                          <th><?= h(t('download.table.file')) ?></th>
                          <th><?= h(t('download.table.size')) ?></th>
                          <th><?= h(t('download.table.downloads')) ?></th>
                          <th><?= h(t('download.table.action')) ?></th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php foreach ($assets as $asset): ?>
                          <tr>
                            <td><?= h($asset['name'] ?? '') ?></td>
                            <td><?= h(tessel_format_bytes((int) ($asset['size'] ?? 0))) ?></td>
                            <td><?= h(number_format((int) ($asset['download_count'] ?? 0))) ?></td>
                            <td>
                              <a href="<?= h($asset['browser_download_url'] ?? '#') ?>">
                                <tsl-button variant="accent" icon="download"><?= h(t('download.table.download_btn')) ?></tsl-button>
                              </a>
                            </td>
                          </tr>
                        <?php endforeach; ?>
                      </tbody>
                    </table>
                  </tsl-table>
                <?php endif; ?>
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
