<?php
/**
 * Shared helpers: escaping, i18n, and the GitHub releases fetcher.
 */

/** Escape a value for safe HTML output. */
function h(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

/**
 * The GitHub "mark" logo as an inline SVG (Octicons, MIT licensed), colored
 * via currentColor so it follows the surrounding text/button color in both
 * themes. Tessel's own icon set has no GitHub logo, so this fills that gap
 * anywhere the site links out to GitHub.
 */
function tessel_icon_github(int $size = 16): string
{
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' . $size . '" height="' . $size . '" '
        . 'viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style="flex:none;display:inline-block;vertical-align:middle">'
        . '<path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 '
        . '0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 '
        . '0 0-.67-.2-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.02-2.2-.82-2.2-.82-.44 1.1-.16 '
        . '1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66 '
        . '-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 '
        . '0 .21-.15.46-.55.38A8.01 8.01 0 0 1 0 8c0-4.42 3.58-8 8-8z"/></svg>';
}

/**
 * Resolve the active language from ?lang=, falling back to a cookie, then
 * the configured default. Must be called before any output is sent, since
 * it may set a cookie.
 */
function tessel_current_lang(array $config): string
{
    $supported = array_keys($config['supported_languages']);
    $default = $config['default_language'];

    if (isset($_GET['lang']) && in_array($_GET['lang'], $supported, true)) {
        $lang = $_GET['lang'];
        if (!headers_sent()) {
            setcookie('tessel_lang', $lang, time() + 60 * 60 * 24 * 365, '/');
        }
        return $lang;
    }

    if (isset($_COOKIE['tessel_lang']) && in_array($_COOKIE['tessel_lang'], $supported, true)) {
        return $_COOKIE['tessel_lang'];
    }

    return in_array($default, $supported, true) ? $default : 'en';
}

/** Translate a key using the currently loaded $GLOBALS['translations'] map. */
function t(string $key, ?string $fallback = null): string
{
    $translations = $GLOBALS['translations'] ?? [];
    return $translations[$key] ?? ($fallback ?? $key);
}

/** Human-readable file size, e.g. "1.4 MB". */
function tessel_format_bytes(int $bytes): string
{
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $size = (float) $bytes;
    $i = 0;
    while ($size >= 1024 && $i < count($units) - 1) {
        $size /= 1024;
        $i++;
    }
    return round($size, $size < 10 ? 2 : 1) . ' ' . $units[$i];
}

/**
 * Turn a GitHub release body (Markdown, as written in the GitHub UI when
 * publishing a release) into safe, minimally-styled HTML: headings, bullet
 * lists, bold, inline code and links. Not a full Markdown parser — just
 * enough for typical release notes. The input is escaped first, so the
 * output is safe to echo directly.
 */
function tessel_render_release_notes(?string $body): string
{
    $body = trim((string) $body);
    if ($body === '') {
        return '';
    }

    $escaped = h($body);
    $escaped = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $escaped);
    $escaped = preg_replace('/`([^`]+?)`/', '<code>$1</code>', $escaped);
    $escaped = preg_replace_callback(
        '/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/',
        static fn (array $m) => '<a href="' . $m[2] . '" target="_blank" rel="noopener">' . $m[1] . '</a>',
        $escaped
    );

    $html = '';
    $inList = false;

    foreach (preg_split('/\r\n|\r|\n/', $escaped) as $line) {
        $trimmed = trim($line);

        if (preg_match('/^[-*+]\s+(.*)$/', $trimmed, $m)) {
            if (!$inList) {
                $html .= '<ul class="changelog-notes-list">';
                $inList = true;
            }
            $html .= '<li>' . $m[1] . '</li>';
            continue;
        }

        if ($inList) {
            $html .= '</ul>';
            $inList = false;
        }

        if ($trimmed === '') {
            continue;
        }

        if (preg_match('/^#{1,6}\s+(.*)$/', $trimmed, $m)) {
            $html .= '<p class="changelog-notes-heading">' . $m[1] . '</p>';
        } else {
            $html .= '<p>' . $trimmed . '</p>';
        }
    }

    if ($inList) {
        $html .= '</ul>';
    }

    return $html;
}

/**
 * Fetch releases for a GitHub repo via the REST API, cached to a local
 * JSON file so the page stays fast and doesn't get rate-limited.
 *
 * @return array{ok: bool, releases: array, error: ?string, stale: bool}
 */
function tessel_fetch_github_releases(string $repo, int $ttl): array
{
    $cacheDir = __DIR__ . '/../cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0775, true);
    }
    $cacheFile = $cacheDir . '/github_releases_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $repo) . '.json';

    if (is_file($cacheFile) && (time() - filemtime($cacheFile) < $ttl)) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($cached)) {
            return $cached;
        }
    }

    $result = ['ok' => false, 'releases' => [], 'error' => null, 'stale' => false];

    if (!function_exists('curl_init')) {
        $result['error'] = 'The PHP cURL extension is not enabled on this server.';
        return tessel_fallback_to_cache($cacheFile, $result);
    }

    $ch = curl_init("https://api.github.com/repos/{$repo}/releases?per_page=100");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'User-Agent: Tessel-UI-Website',
            'Accept: application/vnd.github+json',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        $result['error'] = 'Could not reach GitHub (' . $curlError . ').';
        return tessel_fallback_to_cache($cacheFile, $result);
    }

    $decoded = json_decode($body, true);

    if ($status !== 200) {
        $result['error'] = is_array($decoded) && isset($decoded['message'])
            ? $decoded['message']
            : "GitHub API returned HTTP {$status}.";
        return tessel_fallback_to_cache($cacheFile, $result);
    }

    if (!is_array($decoded)) {
        $result['error'] = 'Unexpected response from GitHub.';
        return tessel_fallback_to_cache($cacheFile, $result);
    }

    $result['ok'] = true;
    $result['releases'] = $decoded;
    @file_put_contents($cacheFile, json_encode($result));

    return $result;
}

/** On a failed live fetch, prefer serving a (marked) stale cache over an error page. */
function tessel_fallback_to_cache(string $cacheFile, array $result): array
{
    if (is_file($cacheFile)) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['ok'])) {
            $cached['stale'] = true;
            return $cached;
        }
    }
    return $result;
}
