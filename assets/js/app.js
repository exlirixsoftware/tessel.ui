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
  setupDemoButtons();
});
