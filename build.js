/**
 * Renders every page in every language into dist/, ready for any static host.
 * Run with `npm run build`, and again whenever a repository or release is
 * published: both are fetched here, not in the visitor's browser.
 */

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import config from './config.js';
import { renderFooter } from './includes/footer.js';
import { normalizeLogo } from './includes/functions.js';
import { fetchGithubReleases, loadFrameworks } from './includes/github.js';
import { renderHeader } from './includes/header.js';
import { renderChangelog } from './pages/changelog.js';
import { renderDownload } from './pages/download.js';
import { renderHome } from './pages/home.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

const PAGES = { home: renderHome, download: renderDownload, changelog: renderChangelog };

/** Where a page lives, relative to the site root: "", "de/", "de/download/"… */
function pagePath(page, lang) {
  const segments = [];
  if (lang !== config.defaultLanguage) segments.push(lang);
  if (page !== 'home') segments.push(page);
  return segments.map((segment) => `${segment}/`).join('');
}

/**
 * Everything a template needs for one page. Every URL is relative, so the
 * site works from a subfolder (such as GitHub Pages) as well as a domain root.
 */
function createContext(page, lang, translations, frameworks, releasesByFramework) {
  const root = '../'.repeat(pagePath(page, lang).split('/').length - 1);

  return {
    config,
    lang,
    page,
    frameworks,
    releasesByFramework,
    t: (key, fallback) => translations[key] ?? fallback ?? key,
    asset: (path) => root + path,
    pageUrl: (target, targetLang = lang) => root + pagePath(target, targetLang) || './',
  };
}

async function fetchFrameworks() {
  const { frameworks, ok, stale, error } = await loadFrameworks(config);
  if (!ok) {
    console.warn(`warning: could not list ${config.githubProfile}'s repositories: ${error}`);
  } else if (stale) {
    console.warn(`warning: using cached repositories for ${config.githubProfile}, GitHub could not be reached`);
  }
  console.log(`Frameworks: ${Object.values(frameworks).map((info) => info.label).join(', ')}`);
  return frameworks;
}

async function fetchAllReleases(frameworks) {
  const entries = await Promise.all(Object.entries(frameworks).map(async ([key, info]) => {
    const data = await fetchGithubReleases(info.repo, config.githubCacheTtl);
    if (!data.ok) {
      console.warn(`warning: no release data for ${info.repo}: ${data.error}`);
    } else if (data.stale) {
      console.warn(`warning: using cached releases for ${info.repo}, GitHub could not be reached`);
    }
    return [key, data];
  }));
  return Object.fromEntries(entries);
}

/**
 * Publish every framework's logo at the same dimensions: its README logo, or
 * its icon if it has none or the file turns out not to be an image.
 */
async function publishLogos(frameworks) {
  await mkdir(join(DIST, 'assets', 'logos'), { recursive: true });

  for (const [key, info] of Object.entries(frameworks)) {
    if (info.logoError) {
      console.warn(`warning: ${info.label}: ${info.logoError}`);
    }

    const fallback = join(ROOT, info.icon);
    const logo = `assets/logos/${key}.png`;
    await normalizeLogo(info.logoFile ?? fallback, join(DIST, logo)).catch(async (error) => {
      console.warn(`warning: ${info.label}: unusable logo, using its icon (${error.message})`);
      await normalizeLogo(fallback, join(DIST, logo));
    });
    info.icon = logo;
  }
}

async function build() {
  const frameworks = await fetchFrameworks();
  const releasesByFramework = await fetchAllReleases(frameworks);

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await cp(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });
  await cp(join(ROOT, 'lib'), join(DIST, 'lib'), { recursive: true });
  await publishLogos(frameworks);

  let pageCount = 0;
  for (const lang of Object.keys(config.supportedLanguages)) {
    const { default: translations } = await import(`./lang/${lang}.js`);

    for (const [page, renderPage] of Object.entries(PAGES)) {
      const context = createContext(page, lang, translations, frameworks, releasesByFramework);
      const outputDir = join(DIST, pagePath(page, lang));

      await mkdir(outputDir, { recursive: true });
      await writeFile(
        join(outputDir, 'index.html'),
        renderHeader(context) + renderPage(context) + renderFooter(context),
      );
      pageCount++;
    }
  }

  console.log(`Built ${pageCount} pages into dist/`);
}

await build();
