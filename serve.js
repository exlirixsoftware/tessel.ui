/**
 * Serves dist/ over HTTP. Run `npm run build` first, then `npm start`.
 * The port comes from PORT, defaulting to 3000.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 3000;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

async function statOrNull(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

function sendText(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

const server = createServer(async (req, res) => {
  let url;
  let pathname;
  try {
    url = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return sendText(res, 400, 'Bad request');
  }

  // resolve() collapses any "..", so anything outside dist/ shows up here.
  let file = resolve(join(DIST, pathname));
  if (file !== DIST && !file.startsWith(DIST + sep)) {
    return sendText(res, 403, 'Forbidden');
  }

  let info = await statOrNull(file);
  if (info?.isDirectory()) {
    // Pages use relative URLs, which only resolve from a trailing-slash path.
    if (!pathname.endsWith('/')) {
      // Leading slashes are collapsed: "//host/" would redirect off this site.
      res.writeHead(301, { Location: `${url.pathname.replace(/^\/+/, '/')}/${url.search}` });
      return res.end();
    }
    file = join(file, 'index.html');
    info = await statOrNull(file);
  }

  if (!info?.isFile()) {
    return sendText(res, 404, 'Not found');
  }

  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    'Content-Length': info.size,
  });
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Serving dist/ at http://localhost:${PORT}`);
});
