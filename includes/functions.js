/**
 * Shared helpers: escaping, formatting, and README logos.
 */

import sharp from 'sharp';

/** Published logos are this many pixels square, double their largest display size. */
const LOGO_SIZE = 128;

/** SVG logos render at this density; it has no effect on other formats. */
const LOGO_DECODING = { density: 300 };

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

/** Escape a value for safe HTML output. */
export function h(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Serialize a value for an inline <script>, where "</script>" must not appear. */
export function jsonForScript(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

/** Fill the single %s placeholder used by the translation strings. */
export function format(template, value) {
  return template.replace('%s', () => value);
}

/**
 * The GitHub "mark" logo as an inline SVG (Octicons, MIT licensed), colored
 * via currentColor so it follows the surrounding text/button color in both
 * themes. Tessel's own icon set has no GitHub logo, so this fills that gap
 * anywhere the site links out to GitHub.
 */
export function iconGithub(size = 16) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `
    + 'viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style="flex:none;display:inline-block;vertical-align:middle">'
    + '<path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 '
    + '0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 '
    + '0 0-.67-.2-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.02-2.2-.82-2.2-.82-.44 1.1-.16 '
    + '1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66 '
    + '-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 '
    + '0 .21-.15.46-.55.38A8.01 8.01 0 0 1 0 8c0-4.42 3.58-8 8-8z"/></svg>';
}

/** Human-readable file size, e.g. "1.4 MB". */
export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  const factor = size < 10 ? 100 : 10;
  return `${Math.round(size * factor) / factor} ${units[i]}`;
}

/** Long date such as "September 26, 2026", in UTC so builds don't vary by machine. */
export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Apply bold, inline code and links to text that is already escaped. */
function renderInline(escaped) {
  return escaped
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, text, url) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`,
    );
}

/** Split a table row into cells. "\|" is a literal pipe, even inside code. */
function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'));
}

/** Pipes in a list item or heading are just text, so those never start or continue a table. */
function isTableRow(line) {
  return /(?<!\\)\|/.test(line) && !/^\s*([-*+]|#{1,6})\s/.test(line);
}

/** A row like "| --- | :--: |". Alignment colons are accepted but not applied. */
function isTableDelimiter(line) {
  return /(?<!\\)\|/.test(line) && tableCells(line).every((cell) => /^:?-+:?$/.test(cell));
}

/** How many lines the table starting at `start` spans, or 0 if none starts there. */
function tableLength(lines, start) {
  const delimiter = lines[start + 1];
  if (
    !isTableRow(lines[start])
    || delimiter === undefined
    || !isTableDelimiter(delimiter)
    || tableCells(lines[start]).length !== tableCells(delimiter).length
  ) {
    return 0;
  }

  let end = start + 2;
  while (end < lines.length && isTableRow(lines[end])) {
    end++;
  }
  return end - start;
}

/** Render table lines with the same <tsl-table> markup as the download page. */
function renderTable(lines) {
  const [header, , ...rows] = lines.map(tableCells);
  // Every row gets the header's cell count: short rows are padded, extras dropped.
  const cells = (row, tag) => header
    .map((_, i) => `<${tag}>${renderInline(row[i] ?? '')}</${tag}>`)
    .join('');

  return `<tsl-table><table><thead><tr>${cells(header, 'th')}</tr></thead>`
    + `<tbody>${rows.map((row) => `<tr>${cells(row, 'td')}</tr>`).join('')}</tbody></table></tsl-table>`;
}

/**
 * Turn a GitHub release body (Markdown, as written in the GitHub UI when
 * publishing a release) into safe, minimally-styled HTML: headings, bullet
 * lists, tables, bold, inline code and links. Not a full Markdown parser —
 * just enough for typical release notes. The input is escaped first, so the
 * output is safe to embed directly.
 */
export function renderReleaseNotes(body) {
  const trimmedBody = String(body ?? '').trim();
  if (trimmedBody === '') {
    return '';
  }

  const lines = h(trimmedBody).split(/\r\n|\r|\n/);

  // Tables are cut out before inline formatting runs, which is applied per
  // cell: a "**" or "`" pair around a pipe must not produce tags that span cells.
  let html = '';
  let textLines = [];
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      inCodeFence = !inCodeFence;
    }

    const length = inCodeFence ? 0 : tableLength(lines, i);
    if (length === 0) {
      textLines.push(lines[i]);
      continue;
    }

    html += renderTextBlocks(textLines) + renderTable(lines.slice(i, i + length));
    textLines = [];
    i += length - 1;
  }

  return html + renderTextBlocks(textLines);
}

/** Render the headings, lists and paragraphs in a run of non-table lines. */
function renderTextBlocks(lines) {
  let html = '';
  let inList = false;

  for (const line of renderInline(lines.join('\n')).split('\n')) {
    const trimmed = line.trim();

    const listItem = trimmed.match(/^[-*+]\s+(.*)$/);
    if (listItem) {
      if (!inList) {
        html += '<ul class="changelog-notes-list">';
        inList = true;
      }
      html += `<li>${listItem[1]}</li>`;
      continue;
    }

    if (inList) {
      html += '</ul>';
      inList = false;
    }

    if (trimmed === '') {
      continue;
    }

    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    html += heading
      ? `<p class="changelog-notes-heading">${heading[1]}</p>`
      : `<p>${trimmed}</p>`;
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

/**
 * Find the logo in a README: the first image whose alt text has the word
 * "logo", written as ![logo](res/icon.png) or <img alt="logo" src="res/icon.png">.
 * Going by the alt text keeps badges and screenshots out.
 *
 * @returns {?string} the image's path or URL, exactly as the README wrote it
 */
export function extractReadmeLogo(readme) {
  for (const match of String(readme ?? '').matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)|<img\b[^>]*>/gi)) {
    const [tag, markdownAlt, markdownSrc] = match;
    const alt = markdownAlt ?? tag.match(/\balt\s*=\s*["']([^"']*)/i)?.[1] ?? '';
    const src = markdownSrc ?? tag.match(/\bsrc\s*=\s*["']?([^"'\s>]+)/i)?.[1];
    if (src && /\blogo\b/i.test(alt)) {
      return src;
    }
  }
  return null;
}

/**
 * Turn a logo path from a repo's README into a downloadable URL. Relative
 * paths, including "/res/icon.png", start at the root of the default branch.
 *
 * @returns {?string} an https image URL, or null if the path isn't one
 */
export function resolveReadmeLogo(path, repo) {
  if (!path) {
    return null;
  }

  try {
    const url = new URL(path.replace(/^\/+/, ''), `https://raw.githubusercontent.com/${repo}/HEAD/`);
    return url.protocol === 'https:' && /\.(png|jpe?g|gif|webp|svg)$/i.test(url.pathname) ? url.href : null;
  } catch {
    return null;
  }
}

/** Where a logo's visible part sits on its canvas, or null if it's fully transparent. */
async function visibleBounds(input) {
  try {
    // Trimming the alpha channel alone removes only transparent padding. A
    // plain trim() would take a solid background for padding and crop into it.
    // These are two pipelines because sharp always trims before it extracts.
    const alpha = await sharp(input, LOGO_DECODING).ensureAlpha().extractChannel('alpha').png().toBuffer();
    const { info } = await sharp(alpha).trim({ background: 'black' }).toBuffer({ resolveWithObject: true });

    return {
      left: -info.trimOffsetLeft,
      top: -info.trimOffsetTop,
      width: info.width,
      height: info.height,
    };
  } catch {
    return null;
  }
}

/**
 * Write a logo as a square transparent PNG of the shared size. Its transparent
 * padding is removed first, because a box of equal size can't make logos look
 * equal while each one fills a different share of its own canvas.
 */
export async function normalizeLogo(input, output) {
  const bounds = await visibleBounds(input);
  const image = sharp(input, LOGO_DECODING);

  if (bounds) {
    image.extract(bounds);
  }

  await image
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(output);
}
