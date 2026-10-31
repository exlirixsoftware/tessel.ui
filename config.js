/**
 * Site-wide configuration for the Tessel.UI website.
 */

export default {
  siteName: 'Tessel.UI',

  // How long (in seconds) a fetched GitHub response is cached to disk before
  // the next build re-fetches it. Keeps rebuilds fast and avoids hitting
  // GitHub's unauthenticated rate limit. Shared by the repository list and
  // the Download and Changelog pages.
  githubCacheTtl: 600,

  // The GitHub profile the site is built from. Every build lists its public
  // repositories, and each one whose name matches repositoryPattern (forks
  // and archived repositories aside) becomes a framework on the Home, Download
  // and Changelog pages — publish a repository and rebuild, nothing to edit
  // here. The match is case-sensitive, which keeps tessel.ui.website out.
  githubProfile: 'exlirixsoftware',
  repositoryPattern: /^Tessel/,

  // Frameworks that are always listed, first and in this order, even if
  // GitHub can't be reached. Only needed to give a repository a short key
  // (used in ?fw= and translation keys), a label or a fallback icon. Any other
  // repository uses its GitHub name, description and language instead. A logo
  // in the README, written as ![logo](path), always replaces the icon.
  frameworks: {
    js: { label: 'Tessel.js', repo: 'exlirixsoftware/Tessel.js', icon: 'assets/images/javascript.png' },
    dotnet: { label: 'Tessel.NET', repo: 'exlirixsoftware/Tessel.NET', icon: 'assets/images/dotnet.png' },
    java: { label: 'Tessel4J', repo: 'exlirixsoftware/Tessel4J', icon: 'assets/images/java.png' },
  },

  // Icons for discovered repositories without a README logo, by GitHub's
  // primary language.
  languageIcons: {
    JavaScript: 'assets/images/javascript.png',
    'C#': 'assets/images/dotnet.png',
    Java: 'assets/images/java.png',
  },
  fallbackIcon: 'assets/images/logo.png',

  // Served from the site root; every other language gets a /<code>/ prefix.
  defaultLanguage: 'en',

  supportedLanguages: {
    en: { label: 'English', flag: 'assets/images/united-kingdom.png' },
    de: { label: 'Deutsch', flag: 'assets/images/germany.png' },
    ro: { label: 'Română', flag: 'assets/images/romania.png' },
  },
};
