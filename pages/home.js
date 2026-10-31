import { h, iconGithub, jsonForScript } from '../includes/functions.js';

export function renderHome({ config, t, asset, pageUrl }) {
  const platforms = Object.entries(config.frameworks).map(([key, info]) => `
      <tsl-card>
        <div class="platform-card">
          <img src="${h(asset(info.icon))}" alt="${h(info.label)}" class="platform-card__icon">
          <h3>${h(t(`platforms.${key}.title`))}</h3>
          <p>${h(t(`platforms.${key}.desc`))}</p>
          <a href="${h(`${pageUrl('download')}?fw=${key}`)}" class="platform-card__cta">
            <tsl-button variant="outline" icon="download">${h(t('download.table.download_btn'))}</tsl-button>
          </a>
        </div>
      </tsl-card>`).join('');

  const features = [
    { icon: 'brightness', title: t('features.theming.title'), desc: t('features.theming.desc') },
    { icon: 'view-all', title: t('features.components.title'), desc: t('features.components.desc') },
    { icon: 'phone', title: t('features.responsive.title'), desc: t('features.responsive.desc') },
    { icon: 'shield', title: t('features.open_source.title'), desc: t('features.open_source.desc') },
  ].map((feature) => `
      <tsl-card class="feature-card">
        <div class="feature-card__icon" data-icon="${h(feature.icon)}"></div>
        <h3>${h(feature.title)}</h3>
        <p>${h(feature.desc)}</p>
      </tsl-card>`).join('');

  const demoStrings = {
    snackbarTitle: t('demo.snackbar.title'),
    snackbarMessage: t('demo.snackbar.message'),
    dialogTitle: t('demo.dialog.title'),
    dialogMessage: t('demo.dialog.message'),
    dialogPrimary: t('demo.dialog.primary'),
    dialogSecondary: t('demo.dialog.secondary'),
  };

  return `
<section class="hero">
  <div class="hero__inner">
    <tsl-badge kind="accent">${h(t('hero.eyebrow'))}</tsl-badge>
    <h1 class="hero__title">${h(t('hero.title'))}</h1>
    <p class="hero__subtitle">${h(t('hero.subtitle'))}</p>
    <div class="hero__actions">
      <a href="${h(pageUrl('download'))}">
        <tsl-button variant="accent" icon="download">${h(t('hero.cta_primary'))}</tsl-button>
      </a>
      <a href="https://github.com/exlirixsoftware">
        <tsl-button variant="outline">${iconGithub(16)} ${h(t('hero.cta_secondary'))}</tsl-button>
      </a>
    </div>
  </div>
</section>

<section class="section">
  <div class="section__heading">
    <h2>${h(t('platforms.heading'))}</h2>
    <p>${h(t('platforms.subtitle'))}</p>
  </div>

  <div class="platform-grid">${platforms}
  </div>
</section>

<section class="section section--alt">
  <div class="section__heading">
    <h2>${h(t('features.heading'))}</h2>
    <p>${h(t('features.subtitle'))}</p>
  </div>

  <div class="feature-grid">${features}
  </div>
</section>

<section class="section">
  <div class="section__heading">
    <h2>${h(t('demo.heading'))}</h2>
    <p>${h(t('demo.subtitle'))}</p>
  </div>

  <div class="demo-grid">
    <tsl-card header="${h(t('demo.buttons.label'))}">
      <div class="demo-row">
        <tsl-button variant="standard">Standard</tsl-button>
        <tsl-button variant="accent">Accent</tsl-button>
        <tsl-button variant="outline">Outline</tsl-button>
        <tsl-button variant="subtle">Subtle</tsl-button>
        <tsl-button variant="danger">Danger</tsl-button>
        <tsl-button variant="icon" icon="settings" aria-label="Settings"></tsl-button>
      </div>
    </tsl-card>

    <tsl-card header="${h(t('demo.inputs.label'))}">
      <div class="demo-stack">
        <tsl-text-field placeholder="Your name" icon="contact"></tsl-text-field>
        <tsl-text-area placeholder="Your message" rows="3"></tsl-text-area>
        <tsl-number-box value="4" min="0" max="10"></tsl-number-box>
        <tsl-slider value="60" min="0" max="100"></tsl-slider>
      </div>
    </tsl-card>

    <tsl-card header="${h(t('demo.selection.label'))}">
      <div class="demo-stack">
        <tsl-checkbox checked>Remember me</tsl-checkbox>
        <tsl-radio-group value="a">
          <tsl-radio value="a">Option A</tsl-radio>
          <tsl-radio value="b">Option B</tsl-radio>
        </tsl-radio-group>
        <tsl-switch checked>Enabled</tsl-switch>
        <tsl-select placeholder="Choose a fruit">
          <tsl-option value="apple">Apple</tsl-option>
          <tsl-option value="pear">Pear</tsl-option>
          <tsl-option value="plum">Plum</tsl-option>
        </tsl-select>
        <tsl-progress-bar value="70" max="100"></tsl-progress-bar>
      </div>
    </tsl-card>

    <tsl-card header="${h(t('demo.feedback.label'))}">
      <div class="demo-stack">
        <div class="demo-row">
          <tsl-badge kind="neutral">Neutral</tsl-badge>
          <tsl-badge kind="accent">Accent</tsl-badge>
          <tsl-badge kind="success">Success</tsl-badge>
          <tsl-badge kind="warning">Warning</tsl-badge>
          <tsl-badge kind="danger">Danger</tsl-badge>
        </div>
        <div class="demo-row">
          <tsl-button id="demo-snackbar-btn" variant="outline">${h(t('demo.snackbar_btn'))}</tsl-button>
          <tsl-button id="demo-dialog-btn" variant="outline">${h(t('demo.dialog_btn'))}</tsl-button>
        </div>
      </div>
    </tsl-card>
  </div>
</section>

<section class="cta-banner">
  <h2>${h(t('hero.cta_primary'))}</h2>
  <a href="${h(pageUrl('download'))}">
    <tsl-button variant="accent" icon="download">${h(t('hero.cta_primary'))}</tsl-button>
  </a>
</section>

<script>
  window.__tesselDemoStrings = ${jsonForScript(demoStrings)};
</script>
`;
}
