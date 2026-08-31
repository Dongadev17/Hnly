# AGENTS.md

## Project
Hnly — a curated daily Hacker News feed. Zero-framework ES2022+ static web app in `src/`, also run inside an Android WebView. No `package.json`, no build step, no CI, no tests. Verification is manual: serve `src/` statically (`npx serve src`) and eyeball it.

## Architecture rules
- **Script load order is the contract.** `src/index.html` wires plain-global scripts in this exact order: engine CDN → `engine-bootstrap.js` → `components/*` → `pages/*` → `utils/getDailyHackerNews.js` → `main.js`. To add a file, put a `<script>` tag in index.html at the right slot (order matters — no ES modules).
- **The UI engine is external.** `Router`, `html`, `Toast`, `utils`, etc. come from `HMI_UI` (CDN `https://zap.fihelay497.workers.dev/js`), destructured once in `engine-bootstrap.js`. Pages need network to run and cannot be built/imported locally. Don't add engine-like helpers in repo code unless asked.
- **Pages are route functions** `(params, el) => templateString` registered in `main.js` with `{ cache: false }`. The `html` tagged template handles static markup; dynamic lists use `.map().join("")`.
- State travels via module globals in `main.js` (`POSTS`, `LOADING`, `SELECTED_POST`) — no framework state.

## CSP & security (non-negotiable)
- `src/index.html` has a strict CSP: `default-src 'self'`, **no `'unsafe-inline'` for scripts**, hashed inline snippets only. Any new script origin or inline `<script>` must be added to the CSP (and hash updated).
- Every HN/API-supplied value (title, text, author, ids, URLs, comments) must pass this file's `escapeHTML`/`stripTags`/`isSafeUrl` before interpolation — never slide raw data into templates.

## Corex build gotchas (from real build fixes)
The gitignored `corex.yaml` config drives the wrapper build (bundle + minify). Builds break on:
- **Backslash regex literals** — replace `x.replace(/\n/g, ...)` with `x.split("\n").join(...)`.
- **Method calls inside `${}` template interpolation** — precompute first: `const kidIds = kids.join(",");` then use `${kidIds}`.

## Storage keys (duplicate names = divergence)
- Cache: `daily_hacker_news_v3` (5 min TTL) — **bump the version suffix when the post set changes**. v2 added `_topic`/`_feeds`/`_rank`/`_why`; v3 changed selection to reserve up to `MIN_PER_TOPIC` posts per topic and grew the pool (`MAX_CANDIDATES: 320`).
- `algeria_news_v3` (Algeria Tech feed cache, 5 min TTL) — v3 switched from the RSS feed to the WP REST API filtered by the Algeria tag (id 119).
- `saved_hacker_news_posts`, `hnly_read_posts`, `hnly_hidden_posts` (localStorage, via `safeStorage`); `hnly_selected_post` (sessionStorage, mirrors the Comments route's story); `hnly_algeria_notice` (localStorage, once-ever Algeria-first visit notice).

## Platform & deploy
- `window.Android` bridge (`getAppVersion`, `openInAppBrowser`, `copyText`) is checked as a property and must degrade gracefully on web.
- Deploys go to Netlify (https://hnly.netlify.app); **bump `src/version.json` with every release** — About's "Check for updates" normalizes versions numerically (`1.0` == `1.0.0`) and reports outdated.
- `dist/`, `android/`, `corex.yaml`, `commitpush.bat` are gitignored; `README.md` documents the architecture in detail.

## Styling
Tailwind JIT CDN with heavy arbitrary-value syntax (`rounded-[24px]`, `min-h-[48px]`). Dark tokens: surfaces `#1c1c1e`/`#2c2c2e`, accent `#ff6600`, white text at stepped opacity. Animation is Web Animations API only (`cubic-bezier(0.22, 1, 0.36, 1)` spring), cap entrance animations at the first 18 cards via `MAX_ANIMATED`.