import { format, formatBytes, formatDate, h, iconGithub } from '../includes/functions.js';
import { renderRepositoryInfo } from '../includes/repository.js';

function renderAssets(assets, t) {
  if (assets.length === 0) {
    return `<tsl-text variant="secondary">${h(t('download.no_assets'))}</tsl-text>`;
  }

  const rows = assets.map((asset) => `
                          <tr>
                            <td>${h(asset.name ?? '')}</td>
                            <td>${h(formatBytes(asset.size ?? 0))}</td>
                            <td>${h((asset.download_count ?? 0).toLocaleString('en-US'))}</td>
                            <td>
                              <a href="${h(asset.browser_download_url ?? '#')}">
                                <tsl-button variant="accent" icon="download">${h(t('download.table.download_btn'))}</tsl-button>
                              </a>
                            </td>
                          </tr>`).join('');

  return `<tsl-table>
                    <table>
                      <thead>
                        <tr>
                          <th>${h(t('download.table.file'))}</th>
                          <th>${h(t('download.table.size'))}</th>
                          <th>${h(t('download.table.downloads'))}</th>
                          <th>${h(t('download.table.action'))}</th>
                        </tr>
                      </thead>
                      <tbody>${rows}
                      </tbody>
                    </table>
                  </tsl-table>`;
}

function renderRelease(release, index, t) {
  const title = release.name || (release.tag_name ?? 'untagged');
  const publishedAt = release.published_at ?? release.created_at ?? null;

  return `
              <tsl-expander header="${h(title)}" ${index === 0 ? 'expanded' : ''}>
                <div class="release-meta">
                  ${index === 0 ? `<tsl-badge kind="accent" solid>${h(t('download.latest'))}</tsl-badge>` : ''}
                  ${release.prerelease ? `<tsl-badge kind="warning">${h(t('download.prerelease'))}</tsl-badge>` : ''}
                  ${publishedAt ? `<tsl-text variant="secondary">${h(format(t('download.published_on'), formatDate(publishedAt)))}</tsl-text>` : ''}
                </div>

                <h4 class="release-subheading">${h(t('download.source_heading'))}</h4>
                <div class="demo-row">
                  <a href="${h(release.zipball_url ?? '#')}">
                    <tsl-button variant="outline" icon="download">${h(t('download.source_zip'))}</tsl-button>
                  </a>
                  <a href="${h(release.tarball_url ?? '#')}">
                    <tsl-button variant="outline" icon="download">${h(t('download.source_targz'))}</tsl-button>
                  </a>
                </div>

                <h4 class="release-subheading">${h(t('download.assets_heading'))}</h4>
                ${renderAssets(release.assets ?? [], t)}
              </tsl-expander>`;
}

function renderPanelBody(data, info, t) {
  const releases = data.releases ?? [];

  if (!data.ok && releases.length === 0) {
    return `<tsl-info-bar severity="warning" title="${h(t('download.error.title'))}" surface>
            ${h(format(t('download.error.instructions'), info.label))}
            ${data.error ? `<br><code>${h(data.error)}</code>` : ''}
          </tsl-info-bar>`;
  }

  if (releases.length === 0) {
    return `<tsl-info-bar severity="informational" surface>${h(t('download.no_releases'))}</tsl-info-bar>`;
  }

  return `${data.stale ? `<tsl-info-bar severity="informational" surface>${h(t('download.stale_notice'))}</tsl-info-bar>` : ''}

          <div class="release-list">${releases.map((release, index) => renderRelease(release, index, t)).join('')}
          </div>

          <div class="download-footer">
            <a href="https://github.com/${h(info.repo)}/releases" target="_blank" rel="noopener">
              <tsl-button variant="link">${iconGithub(14)} ${h(format(t('changelog.view_on_github'), info.label))}</tsl-button>
            </a>
          </div>`;
}

export function renderDownload({ frameworks, t, asset, releasesByFramework }) {
  const entries = Object.entries(frameworks);

  const tabs = entries.map(([key, info]) => `
    <tsl-tab value="${h(key)}">${h(info.label)}</tsl-tab>`).join('');

  const panels = entries.map(([key, info]) => `
      <tsl-tab-panel value="${h(key)}">
        <div class="framework-panel-heading">
          <img src="${h(asset(info.icon))}" alt="" class="framework-panel-heading__icon">
          <h2>${h(info.label)}</h2>
        </div>

        ${renderRepositoryInfo(key, info, t)}

        ${renderPanelBody(releasesByFramework[key], info, t)}
      </tsl-tab-panel>`).join('');

  return `
<section class="page-heading">
  <h1>${h(t('download.heading'))}</h1>
  <p>${h(t('download.subtitle'))}</p>
</section>

<section class="section">
  <tsl-tabs value="${h(entries[0][0])}">${tabs}
${panels}
  </tsl-tabs>
</section>
`;
}
