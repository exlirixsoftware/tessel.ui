/**
 * Renders every page in every language into dist/, ready for any static host.
 * Run with `npm run build`, and again whenever a release is published: the
 * release lists are fetched here, not in the visitor's browser.
 */

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import config from './config.js';
import { fetchGithubReleases } from './includes/functions.js';
import { renderFooter } from './includes/footer.js';
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
function createContext(page, lang, translations, releasesByFramework) {
  const root = '../'.repeat(pagePath(page, lang).split('/').length - 1);

  return {
    config,
    lang,
    page,
    releasesByFramework,
    t: (key, fallback) => translations[key] ?? fallback ?? key,
    asset: (path) => root + path,
    pageUrl: (target, targetLang = lang) => root + pagePath(target, targetLang) || './',
  };
}

async function fetchAllReleases() {
  const entries = await Promise.all(Object.entries(config.frameworks).map(async ([key, info]) => {
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

async function build() {
  const releasesByFramework = await fetchAllReleases();

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await cp(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });
  await cp(join(ROOT, 'lib'), join(DIST, 'lib'), { recursive: true });

  let pageCount = 0;
  for (const lang of Object.keys(config.supportedLanguages)) {
    const { default: translations } = await import(`./lang/${lang}.js`);

    for (const [page, renderPage] of Object.entries(PAGES)) {
      const context = createContext(page, lang, translations, releasesByFramework);
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
