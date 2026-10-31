import { h, jsonForScript } from './functions.js';

/**
 * Sends a returning visitor who picked another language to that language's
 * copy of this page. Only needed on default-language pages: those are what
 * bare links land on, and the other languages live under their own paths.
 */
function renderLanguageRedirect({ config, lang, page, pageUrl }) {
  if (lang !== config.defaultLanguage) {
    return '';
  }

  const targets = Object.keys(config.supportedLanguages)
    .filter((code) => code !== lang)
    .map((code) => [code, pageUrl(page, code)]);

  return `<script>
  // Runs before anything renders, so the wrong language never flashes.
  (function () {
    try {
      var target = ${jsonForScript(Object.fromEntries(targets))}[localStorage.getItem('tessel-lang')];
      if (target) location.replace(target + location.search + location.hash);
    } catch (e) {}
  })();
</script>
`;
}

export function renderHeader(context) {
  const { config, lang, page, t, asset, pageUrl } = context;
  const navLink = (target, label) => `<a href="${h(pageUrl(target))}" class="${page === target ? 'is-active' : ''}">${h(t(label))}</a>`;

  const languageItems = Object.entries(config.supportedLanguages).map(([code, info]) => `
            <a
              role="menuitem"
              class="lang-switcher__item ${code === lang ? 'is-active' : ''}"
              href="${h(pageUrl(page, code))}"
              data-lang="${h(code)}"
            >
              <img src="${h(asset(info.flag))}" alt="" class="lang-switcher__flag">
              <span>${h(info.label)}</span>
            </a>`).join('');

  return `<!DOCTYPE html>
<html lang="${h(lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(config.siteName)}</title>
<meta name="description" content="${h(t('meta.description'))}">
<link rel="icon" href="${h(asset('assets/images/favicon.png'))}" type="image/png">
<link rel="stylesheet" href="${h(asset('assets/css/style.css'))}">
${renderLanguageRedirect(context)}<script>
  // Applied before Tessel.js loads, so the page doesn't flash the wrong
  // theme while the module script (deferred by spec) finishes loading.
  (function () {
    try {
      var saved = localStorage.getItem('tessel-theme') || 'system';
      var dark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var root = document.documentElement;
      root.setAttribute('data-tessel-theme', dark ? 'dark' : 'light');
      root.style.colorScheme = dark ? 'dark' : 'light';
      root.style.background = dark ? '#0f1115' : '#f4f5f7';
    } catch (e) {}
  })();
</script>
</head>
<body>

<header class="site-header">
  <div class="site-header__inner">
    <a class="brand" href="${h(pageUrl('home'))}">
      <img src="${h(asset('assets/images/logo.png'))}" alt="${h(config.siteName)}" class="brand__logo">
      <span class="brand__name">${h(config.siteName)}</span>
    </a>

    <button type="button" class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>

    <nav class="nav-links">
      ${navLink('home', 'nav.home')}
      ${navLink('download', 'nav.download')}
      ${navLink('changelog', 'nav.changelog')}
    </nav>

    <div class="nav-actions">
      <div class="lang-switcher">
        <button type="button" class="lang-switcher__toggle" aria-haspopup="true" aria-expanded="false">
          <img src="${h(asset(config.supportedLanguages[lang].flag))}" alt="" class="lang-switcher__flag">
          <span class="lang-switcher__code">${h(lang.toUpperCase())}</span>
          <span class="lang-switcher__chevron" aria-hidden="true">▾</span>
        </button>
        <div class="lang-switcher__menu" role="menu">${languageItems}
        </div>
      </div>

      <tsl-theme-toggle></tsl-theme-toggle>
    </div>
  </div>
</header>

<main class="site-main">
`;
}
