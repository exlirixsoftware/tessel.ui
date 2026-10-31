import { format, formatDate, h } from './functions.js';

/** A framework's GitHub details, shown above its releases. */
export function renderRepositoryInfo(key, info, t) {
  const description = t(`platforms.${key}.desc`, info.description ?? '');
  const details = info.details;

  if (!details) {
    return description ? `<div class="repository-info"><p>${h(description)}</p></div>` : '';
  }

  const license = details.license?.spdx_id;
  const badges = [
    details.language,
    license && license !== 'NOASSERTION' ? license : null,
    ...(details.topics ?? []),
  ].filter(Boolean);

  const homepage = /^https?:\/\//.test(details.homepage ?? '')
    ? `<a href="${h(details.homepage)}" target="_blank" rel="noopener">
            <tsl-button variant="link">${h(t('repository.homepage'))}</tsl-button>
          </a>`
    : '';

  return `<div class="repository-info">
          ${description ? `<p>${h(description)}</p>` : ''}
          <div class="release-meta">
            ${badges.map((badge) => `<tsl-badge kind="neutral">${h(badge)}</tsl-badge>`).join('\n            ')}
            <tsl-text variant="secondary">${h((details.stargazers_count ?? 0).toLocaleString('en-US'))} ${h(t('repository.stars'))}</tsl-text>
            <tsl-text variant="secondary">${h((details.forks_count ?? 0).toLocaleString('en-US'))} ${h(t('repository.forks'))}</tsl-text>
            ${details.pushed_at ? `<tsl-text variant="secondary">${h(format(t('repository.updated_on'), formatDate(details.pushed_at)))}</tsl-text>` : ''}
            ${homepage}
          </div>
        </div>`;
}
