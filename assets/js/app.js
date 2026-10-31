import {
  setup,
  setTheme,
  getTheme,
  addThemeListener,
  TesselTheme,
  createIcon,
  showSnackbar,
  showDialog,
  DialogResult,
} from '../../lib/tessel.min.js';

const THEME_KEY = 'tessel-theme';
const LANG_KEY = 'tessel-lang';

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored && Object.values(TesselTheme).includes(stored) ? stored : TesselTheme.SYSTEM;
  } catch (e) {
    return TesselTheme.SYSTEM;
  }
}

setup(readStoredTheme());

addThemeListener(() => {
  try {
    localStorage.setItem(THEME_KEY, getTheme());
  } catch (e) {
    /* localStorage unavailable (private mode, etc.) — theme just won't persist */
  }
});

function renderFeatureIcons() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.replaceChildren(createIcon(el.dataset.icon, 24));
  });
}

function setupMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.classList.toggle('is-open', isOpen);
  });
}

function setupLanguageSwitcher() {
  const wrapper = document.querySelector('.lang-switcher');
  const toggle = document.querySelector('.lang-switcher__toggle');
  if (!wrapper || !toggle) return;

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = wrapper.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', () => {
    wrapper.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
}

function setupLanguageLinks() {
  document.querySelectorAll('a[data-lang]').forEach((link) => {
    link.addEventListener('click', () => {
      try {
        localStorage.setItem(LANG_KEY, link.dataset.lang);
      } catch (e) {
        /* localStorage unavailable (private mode, etc.) — choice just won't persist */
      }
      // Carry ?fw= over, so switching language keeps the open framework tab.
      link.search = location.search;
    });
  });
}

function selectRequestedFramework() {
  const requested = new URLSearchParams(location.search).get('fw');
  const tabs = document.querySelector('tsl-tabs');
  if (!requested || !tabs) return;

  const isKnown = [...tabs.querySelectorAll('tsl-tab')].some((tab) => tab.getAttribute('value') === requested);
  if (isKnown) tabs.setAttribute('value', requested);
}

function setupDemoButtons() {
  const strings = window.__tesselDemoStrings;
  if (!strings) return;

  document.getElementById('demo-snackbar-btn')?.addEventListener('click', () => {
    showSnackbar(strings.snackbarTitle, {
      message: strings.snackbarMessage,
      severity: 'success',
    });
  });

  document.getElementById('demo-dialog-btn')?.addEventListener('click', () => {
    showDialog({
      title: strings.dialogTitle,
      message: strings.dialogMessage,
      primaryText: strings.dialogPrimary,
      closeText: strings.dialogSecondary,
      primaryDestructive: true,
    }).then((result) => {
      if (result === DialogResult.PRIMARY) {
        showSnackbar(strings.snackbarTitle, {
          message: strings.snackbarMessage,
          severity: 'success',
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderFeatureIcons();
  setupMobileNav();
  setupLanguageSwitcher();
  setupLanguageLinks();
  selectRequestedFramework();
  setupDemoButtons();
});
