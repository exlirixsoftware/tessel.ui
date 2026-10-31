/**
 * Site-wide configuration for the Tessel.UI website.
 */

export default {
  siteName: 'Tessel.UI',

  // How long (in seconds) a fetched GitHub releases response is cached to
  // disk before the next build re-fetches it. Keeps rebuilds fast and avoids
  // hitting GitHub's unauthenticated rate limit. Shared by the Download and
  // Changelog pages.
  githubCacheTtl: 600,

  // One GitHub repo per framework edition ("owner/repo"). Both the
  // Download page (source + binaries) and the Changelog page (release
  // notes) read every framework listed here — add a new release by
  // publishing it on the matching GitHub repo and rebuilding this site,
  // nothing to edit here. "icon" is shown next to that framework's name.
  frameworks: {
    js: { label: 'Tessel.js', repo: 'exlirixsoftware/Tessel.js', icon: 'assets/images/javascript.png' },
    dotnet: { label: 'Tessel.NET', repo: 'exlirixsoftware/Tessel.NET', icon: 'assets/images/dotnet.png' },
    java: { label: 'Tessel4J', repo: 'exlirixsoftware/Tessel4J', icon: 'assets/images/java.png' },
  },

  // Served from the site root; every other language gets a /<code>/ prefix.
  defaultLanguage: 'en',

  supportedLanguages: {
    en: { label: 'English', flag: 'assets/images/united-kingdom.png' },
    de: { label: 'Deutsch', flag: 'assets/images/germany.png' },
    it: { label: 'Italiano', flag: 'assets/images/italy.png' },
    ro: { label: 'Română', flag: 'assets/images/romania.png' },
    es: { label: 'Español', flag: 'assets/images/spain.png' },
  },
};
