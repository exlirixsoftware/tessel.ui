/**
 * The GitHub service: discovers the framework repositories on the configured
 * profile and loads their releases. It runs during the build, so a repository
 * or release published on GitHub reaches the site with the next build.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractReadmeLogo, resolveReadmeLogo } from './functions.js';

const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'cache');
const REQUEST_TIMEOUT = 10000;

function cacheName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function fetchFromApi(path, accept = 'application/vnd.github+json') {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      'User-Agent': 'Tessel-UI-Website',
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
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
 * Fetch a list from the GitHub REST API, cached to a local JSON file so
 * repeated builds stay fast and don't get rate-limited. Freshness is tracked
 * by a timestamp inside the file rather than its mtime, because a fresh
 * checkout would otherwise make the committed cache look current. The items
 * are stored under `field`, keeping only those `keep` accepts.
 *
 * Set GITHUB_TOKEN to raise the rate limit, which matters on shared CI hosts.
 */
async function fetchCachedList(name, path, ttl, field, keep) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cacheFile = join(CACHE_DIR, `${name}.json`);

  const cached = await readCache(cacheFile);
  if (cached && Date.now() - (cached.fetchedAt ?? 0) < ttl * 1000) {
    return cached;
  }

  const result = { ok: false, [field]: [], error: null, stale: false };

  let response;
  let decoded;
  try {
    response = await fetchFromApi(path);
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
  result[field] = decoded.filter(keep);
  await writeFile(cacheFile, JSON.stringify({ ...result, fetchedAt: Date.now() }));

  return result;
}

/**
 * Fetch a repo's releases. A token with push access also lists drafts, which
 * must never go public.
 *
 * @returns {Promise<{ok: boolean, releases: object[], error: ?string, stale: boolean}>}
 */
export function fetchGithubReleases(repo, ttl) {
  return fetchCachedList(
    cacheName(`github_releases_${repo}`),
    `/repos/${repo}/releases?per_page=100`,
    ttl,
    'releases',
    (release) => !release.draft,
  );
}

/**
 * Fetch every public repository on a GitHub profile, with all the details the
 * API gives for each one.
 *
 * @returns {Promise<{ok: boolean, repositories: object[], error: ?string, stale: boolean}>}
 */
export function fetchGithubRepositories(profile, ttl) {
  return fetchCachedList(
    cacheName(`github_repositories_${profile}`),
    `/users/${profile}/repos?per_page=100&type=owner`,
    ttl,
    'repositories',
    (repository) => !repository.private,
  );
}

/**
 * Download the logo shown in a repository's README into the cache, so the site
 * serves its own copy instead of depending on GitHub for every page view. A
 * README with no logo, or one pointing at a missing image, is a settled answer
 * and is cached like one. Anything else keeps the last logo that worked.
 *
 * @returns {Promise<{file: ?string, error: ?string}>} `file` is inside CACHE_DIR
 */
export async function fetchRepositoryLogo(repo, ttl) {
  const name = cacheName(`github_logo_${repo}`);
  const cacheFile = join(CACHE_DIR, `${name}.json`);

  const cached = await readCache(cacheFile);
  if (cached && Date.now() - (cached.fetchedAt ?? 0) < ttl * 1000) {
    return cached;
  }

  const result = { file: null, error: null };

  try {
    const readme = await fetchFromApi(`/repos/${repo}/readme`, 'application/vnd.github.raw+json');
    if (!readme.ok && readme.status !== 404) {
      throw new Error(`GitHub API returned HTTP ${readme.status}`);
    }

    const logoUrl = readme.ok ? resolveReadmeLogo(extractReadmeLogo(await readme.text()), repo) : null;
    if (logoUrl) {
      // No Authorization here: the README decides which host this goes to.
      const image = await fetch(logoUrl, {
        headers: { 'User-Agent': 'Tessel-UI-Website' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (image.ok) {
        result.file = `${name}${extname(new URL(logoUrl).pathname).toLowerCase()}`;
        await writeFile(join(CACHE_DIR, result.file), Buffer.from(await image.arrayBuffer()));
      } else if (image.status === 404) {
        result.error = `its README points at a logo that doesn't exist (${logoUrl})`;
      } else {
        throw new Error(`HTTP ${image.status} for ${logoUrl}`);
      }
    }
  } catch (error) {
    return {
      file: cached?.file ?? null,
      error: `could not load its logo (${error.cause?.message ?? error.message})`,
    };
  }

  await writeFile(cacheFile, JSON.stringify({ ...result, fetchedAt: Date.now() }));

  return result;
}

/**
 * Build the site's framework list: the entries in config.frameworks first, so
 * they survive GitHub being unreachable, then any other repository on the
 * profile that matches config.repositoryPattern, oldest first. Each framework
 * carries GitHub's full repository data as `details` (null if GitHub had none)
 * and its README logo as `logoFile`, a path in the cache (null if it has none).
 *
 * @returns {Promise<{frameworks: object, ok: boolean, error: ?string, stale: boolean}>}
 */
export async function loadFrameworks(config) {
  const data = await fetchGithubRepositories(config.githubProfile, config.githubCacheTtl);
  const repositories = data.repositories ?? [];
  const frameworks = {};

  for (const [key, info] of Object.entries(config.frameworks)) {
    const details = repositories.find((repository) => repository.full_name.toLowerCase() === info.repo.toLowerCase());
    frameworks[key] = { ...info, description: details?.description ?? null, details: details ?? null };
  }

  const configuredRepos = Object.values(config.frameworks).map((info) => info.repo.toLowerCase());
  const discovered = repositories
    .filter((repository) => config.repositoryPattern.test(repository.name)
      && !repository.fork
      && !repository.archived
      && !configuredRepos.includes(repository.full_name.toLowerCase()))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  for (const repository of discovered) {
    // GitHub names are unique ignoring case and already safe in URLs and keys.
    frameworks[repository.name.toLowerCase()] = {
      label: repository.name,
      repo: repository.full_name,
      icon: config.languageIcons[repository.language] ?? config.fallbackIcon,
      description: repository.description,
      details: repository,
    };
  }

  await Promise.all(Object.values(frameworks).map(async (info) => {
    const logo = await fetchRepositoryLogo(info.repo, config.githubCacheTtl);
    info.logoFile = logo.file ? join(CACHE_DIR, logo.file) : null;
    info.logoError = logo.error;
  }));

  return { frameworks, ok: data.ok, error: data.error, stale: data.stale };
}
