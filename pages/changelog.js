import { format, formatDate, h, iconGithub, renderReleaseNotes } from '../includes/functions.js';
import { renderRepositoryInfo } from '../includes/repository.js';

function renderRelease(release, index, t) {
  const tag = release.tag_name ?? 'untagged';
  const title = release.name || tag;
  const publishedAt = release.published_at ?? release.created_at ?? null;
  const notesHtml = renderReleaseNotes(release.body ?? '');

  return `
              <tsl-expander header="${h(title)}" ${index === 0 ? 'expanded' : ''}>
                <div class="release-meta">
                  ${index === 0 ? `<tsl-badge kind="accent" solid>${h(t('download.latest'))}</tsl-badge>` : ''}
                  ${release.prerelease ? `<tsl-badge kind="warning">${h(t('download.prerelease'))}</tsl-badge>` : ''}
                  <tsl-badge kind="neutral">${h(tag)}</tsl-badge>
                  ${publishedAt ? `<tsl-text variant="secondary">${h(format(t('download.published_on'), formatDate(publishedAt)))}</tsl-text>` : ''}
                </div>

                <div class="changelog-notes">
                  ${notesHtml !== '' ? notesHtml : `<tsl-text variant="secondary">${h(t('changelog.no_notes'))}</tsl-text>`}
                </div>
              </tsl-expander>`;
}

function renderPanelBody(data, info, t) {
  const releases = data.releases ?? [];

  if (!data.ok && releases.length === 0) {
    return `<tsl-info-bar severity="warning" title="${h(t('changelog.error.title'))}" surface>
            ${h(format(t('changelog.error.instructions'), info.label))}
            ${data.error ? `<br><code>${h(data.error)}</code>` : ''}
          </tsl-info-bar>`;
  }

  if (releases.length === 0) {
    return `<tsl-info-bar severity="informational" surface>${h(t('changelog.no_versions'))}</tsl-info-bar>`;
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

export function renderChangelog({ frameworks, t, asset, releasesByFramework }) {
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
  <h1>${h(t('changelog.heading'))}</h1>
  <p>${h(t('changelog.subtitle'))}</p>
</section>

<section class="section">
  <tsl-tabs value="${h(entries[0][0])}">${tabs}
${panels}
  </tsl-tabs>
</section>
`;
}
