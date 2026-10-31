import { format, h, iconGithub } from './functions.js';

export function renderFooter({ config, lang, page, t, asset, pageUrl }) {
  const languageLinks = Object.entries(config.supportedLanguages).map(([code, info]) => `
        <a href="${h(pageUrl(page, code))}" data-lang="${h(code)}" class="${code === lang ? 'is-active' : ''}">
          <img src="${h(asset(info.flag))}" alt="" class="lang-switcher__flag">
          ${h(info.label)}
        </a>`).join('');

  return `</main>

<footer class="site-footer">
  <div class="site-footer__inner">
    <div class="site-footer__brand">
      <img src="${h(asset('assets/images/logo.png'))}" alt="" class="brand__logo">
      <p>${h(t('footer.tagline'))}</p>
    </div>

    <div class="site-footer__col">
      <h4>${h(t('footer.links_heading'))}</h4>
      <a href="${h(pageUrl('home'))}">${h(t('nav.home'))}</a>
      <a href="${h(pageUrl('download'))}">${h(t('nav.download'))}</a>
      <a href="${h(pageUrl('changelog'))}">${h(t('nav.changelog'))}</a>
      <a href="https://github.com/exlirixsoftware">${iconGithub(16)} ${h(t('nav.github'))}</a>
    </div>

    <div class="site-footer__col">
      <h4>${h(t('footer.resources_heading'))}</h4>
      <span>${h(t('footer.license'))}</span>
    </div>

    <div class="site-footer__col">
      <h4>${h(t('footer.language_heading'))}</h4>${languageLinks}
    </div>
  </div>

  <div class="site-footer__bottom">
    ${format(h(t('footer.copyright')), String(new Date().getUTCFullYear()))}
  </div>
</footer>

<script type="module" src="${h(asset('assets/js/app.js'))}"></script>
</body>
</html>
`;
}
