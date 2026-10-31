/**
 * Shared helpers: escaping, formatting, and the GitHub releases fetcher.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'cache');

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

/** Escape a value for safe HTML output. */
export function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Serialize a value for an inline <script>, where "</script>" must not appear. */
export function jsonForScript(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

/** Fill the single %s placeholder used by the translation strings. */
export function format(template, value) {
  return template.replace('%s', () => value);
}

/**
 * The GitHub "mark" logo as an inline SVG (Octicons, MIT licensed), colored
 * via currentColor so it follows the surrounding text/button color in both
 * themes. Tessel's own icon set has no GitHub logo, so this fills that gap
 * anywhere the site links out to GitHub.
 */
export function iconGithub(size = 16) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `
    + 'viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style="flex:none;display:inline-block;vertical-align:middle">'
    + '<path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 '
    + '0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 '
    + '0 0-.67-.2-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.02-2.2-.82-2.2-.82-.44 1.1-.16 '
    + '1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66 '
    + '-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 '
    + '0 .21-.15.46-.55.38A8.01 8.01 0 0 1 0 8c0-4.42 3.58-8 8-8z"/></svg>';
}

/** Human-readable file size, e.g. "1.4 MB". */
export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  const factor = size < 10 ? 100 : 10;
  return `${Math.round(size * factor) / factor} ${units[i]}`;
}

/** Long date such as "September 26, 2026", in UTC so builds don't vary by machine. */
export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Turn a GitHub release body (Markdown, as written in the GitHub UI when
 * publishing a release) into safe, minimally-styled HTML: headings, bullet
 * lists, bold, inline code and links. Not a full Markdown parser — just
 * enough for typical release notes. The input is escaped first, so the
 * output is safe to embed directly.
 */
export function renderReleaseNotes(body) {
  const trimmedBody = String(body ?? '').trim();
  if (trimmedBody === '') {
    return '';
  }

  const escaped = h(trimmedBody)
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, text, url) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`,
    );

  let html = '';
  let inList = false;

  for (const line of escaped.split(/\r\n|\r|\n/)) {
    const trimmed = line.trim();

    const listItem = trimmed.match(/^[-*+]\s+(.*)$/);
    if (listItem) {
      if (!inList) {
        html += '<ul class="changelog-notes-list">';
        inList = true;
      }
      html += `<li>${listItem[1]}</li>`;
      continue;
    }

    if (inList) {
      html += '</ul>';
      inList = false;
    }

    if (trimmed === '') {
      continue;
    }

    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    html += heading
      ? `<p class="changelog-notes-heading">${heading[1]}</p>`
      : `<p>${trimmed}</p>`;
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

async function readCache(cacheFile) {
  try {
    return JSON.parse(await readFile(cacheFile, 'utf8'));
  } catch {
    return null;
  }
}

/** On a failed live fetch, prefer a (marked) stale cache over an error notice. */
function fallbackToCache(cached, result) {
  return cached?.ok ? { ...cached, stale: true } : result;
}

/**
 * Fetch releases for a GitHub repo via the REST API, cached to a local JSON
 * file so repeated builds stay fast and don't get rate-limited. Freshness is
 * tracked by a timestamp inside the file rather than its mtime, because a
 * fresh checkout would otherwise make the committed cache look current.
 *
 * Set GITHUB_TOKEN to raise the rate limit, which matters on shared CI hosts.
 *
 * @returns {Promise<{ok: boolean, releases: object[], error: ?string, stale: boolean}>}
 */
export async function fetchGithubReleases(repo, ttl) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cacheFile = join(CACHE_DIR, `github_releases_${repo.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

  const cached = await readCache(cacheFile);
  if (cached && Date.now() - (cached.fetchedAt ?? 0) < ttl * 1000) {
    return cached;
  }

  const result = { ok: false, releases: [], error: null, stale: false };

  let response;
  let decoded;
  try {
    response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100`, {
      headers: {
        'User-Agent': 'Tessel-UI-Website',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
      },
      signal: AbortSignal.timeout(10000),
    });
    decoded = await response.json().catch(() => null);
  } catch (error) {
    result.error = `Could not reach GitHub (${error.cause?.message ?? error.message}).`;
    return fallbackToCache(cached, result);
  }

  if (response.status !== 200) {
    result.error = decoded?.message ?? `GitHub API returned HTTP ${response.status}.`;
    return fallbackToCache(cached, result);
  }

  if (!Array.isArray(decoded)) {
    result.error = 'Unexpected response from GitHub.';
    return fallbackToCache(cached, result);
  }

  result.ok = true;
  // A token with push access also lists drafts, which must never go public.
  result.releases = decoded.filter((release) => !release.draft);
  await writeFile(cacheFile, JSON.stringify({ ...result, fetchedAt: Date.now() }));

  return result;
}
