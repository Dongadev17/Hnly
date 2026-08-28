# Hnly

A curated daily Hacker News feed — ranked every day by popularity, freshness, and discussion, then balanced across topics so no single site or subject dominates your feed. Dark, iOS-flavored UI built to run **both as a web app and inside a mobile WebView wrapper**.

> **Why reading this repo is quick and readable** — there's no framework, no bundler, no build step in the normal web workflow. The whole app is a small set of browser scripts that load in a strict order, and its "engine" is small and external. See [Architecture](#architecture) and [How the code is organized](#how-the-code-is-organized).

---

## Highlights

- **One UI, two hosts** — the exact same `src/` runs in a browser and inside the native Android WebView. A tiny JS bridge (`window.Android`) upgrades the experience when running packaged.
- **Zero-dependency web stack** — plain ES2022+ JavaScript, [Tailwind CSS (CDN)](https://tailwindcss.com/), Material Design Icons, and the Montserrat font.
- **Smart daily feed** — merges HN `topstories`, `beststories`, and `newstories`, deduplicates, infers topics, scores each story, and greedily selects a diverse set (no domain/topic monopolies).
- **Cached & offline-friendly** — the daily selection is cached in `localStorage` (5 min TTL); saved posts persist locally too.
- **Smooth "Apple-like" motion** — entrance, list, and removal animations use the Web Animations API with a springy `cubic-bezier(0.22, 1, 0.36, 1)` easing — no animation libraries.
- **Privacy-first** — no accounts, no tracking, no analytics; everything stays on the device.

---

## Architecture

```
Browser / Android WebView
        │
        ▼
src/main.js  ────── creates the Router, defines routes, global state
        │
        ├── Router + UI primitives (html, Toast, utils, …)  ◄── provided by the runtime engine
        │
        ├── pages   Home · Posts · About        (route entry points)
        │              │
        │              ├── components  Navbar · DownloadBanner · postCard · postGrid
        │              └── utils       getDailyHackerNews (feed pipeline + saved posts)
        │
        └── index.html ── script order: components → pages → utils → main.js
```

### The runtime engine (internal)

> **⚠️ Note:** the UI engine that powers the app a.k.a. **Corex** (the `Router`, `html` template helper, `Toast`, `utils`, and the CLI that packages the Android wrapper) is **personal, internal-use-only software**. It is loaded from a private CDN and tracks no dependencies you need to install. This repository deliberately does **not** include it or its CLI config (`corex.yaml`).

What that means for you:
- Reading the repo is easy — you only see **this app's** code, not framework internals.
- Hnly depends on that CDN at runtime, so the pages need network access to work.
- If you want to build your own copy of the UI engine, that's out of scope here.

Everything below describes **Hnly's own code**.

---

## How the code is organized

```
.
├── src/
│   ├── index.html                 # Entry point — script order + Content-Security-Policy
│   ├── engine-bootstrap.js        # Destructures engine globals (Router, html, Toast, …)
│   ├── main.js                    # APP_INFO, global POSTS/LOADING state, router setup
│   ├── style.css                  # Global styles (font, selection, disabled)
│   ├── version.json               # Latest deployed version (used by "Check for updates")
│   ├── assets/logo.png            # App icon used in the UI
│   ├── components/                # Reusable HTML-building functions
│   │   ├── Navbar.js              # Navbar shell + per-page nav content
│   │   ├── DownloadBanner.js      # "Get the app" banner (web visitors, once per session)
│   │   ├── postCard.js            # Single story card (+ skeleton)
│   │   └── postGrid.js            # Grid / skeleton / empty-state renderers
│   ├── pages/                     # One function per route
│   │   ├── Home.js                # Feed: render, stagger-in, refresh, retry
│   │   ├── Posts.js               # Saved posts + animated removal
│   │   └── About.js               # iOS-style settings page + actions
│   └── utils/
│       └── getDailyHackerNews.js  # Fetch → dedupe → tag → score → diversify → cache
└── commitpush.bat                 # Local dev helper (gitignored)
```

### Load order & globals

`index.html` is the contract. Scripts are plain browser globals, so **order matters**:

1. Third-party CDNs (Tailwind, fonts, icons), `style.css`, and the engine's CSS/JS.
2. `engine-bootstrap.js` — the engine bundle exposes globals like `Router`, `html`, `Toast`, and `utils`. This file destructures them **once** into top-level constants (an external file rather than an inline script, so the page's CSP never needs `'unsafe-inline'` for it). After it runs, every app file can use them.
3. `components/*` → `pages/*` → `utils/*` → `main.js`.

---

## How the UI works

### Routing

Routes are registered in `main.js`:

```js
r.add("home", Home, { cache: false })
  .add("posts", Posts, { cache: false })
  .add("about", About, { cache: false })
```

- Each page is a **function** `(params, el) => …` that returns a template string and receives the mounted element.
- `{ cache: false }` forces re-render on every visit — so Home animates its cards fresh each time and About always reflects the latest version.
- Navbar buttons use `data-route` to navigate (the engine wires them up).

### Templates

Statically-oriented HTML is written with `html` (a tagged template from the engine). Dynamic lists are built with `.map()` + `.join("")`:

```js
const PostGrid = () => {
  const savedIds = getSavedPostIdSet(); // read once per render
  return html`
    ${POSTS.length
      ? html`<div class="columns …">
          ${POSTS.map((post) => PostCard(post, savedIds)).join("")}
        </div>`
      : EmptyState("mdi-newspaper-variant-outline", "No stories found")}
  `;
};
```

### Styling system

- **Tailwind CSS (JIT CDN)** — arbitrary values like `rounded-[24px]`, `bg-[#1c1c1e]`, `min-h-[48px]` are used heavily for exact pixel fidelity.
- **Design tokens** (dark theme):
  - Surfaces: `#1c1c1e` (card) / `#2c2c2e` (raised chip) / `#212121` (nav buttons)
  - Accent: **`#ff6600`** (Hacker News orange)
  - Text: white with stepped opacity (`/35` → `/70`)
  - Radius: `rounded-[24px]` for cards, `rounded-full` for pills
- **Icons**: Material Design Icons via `<span class="mdi mdi-…">`.

### Motion

All animation is Web Animations API (`.animate()`), so it's GPU-friendly and interruptible:

```js
// Home.js — staggered card entrance (first 18 cards only)
const MAX_ANIMATED = 18;
card.animate(
  [
    { opacity: 0, transform: "translateY(18px) scale(0.98)" },
    { opacity: 1, transform: "translateY(0) scale(1)" },
  ],
  { duration: 380, delay: Math.min(i * 30, 420), easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }
);
```

Only the first viewport-worthy batch (18 cards) animates; the rest appear instantly, so off-screen cards don't each spawn a WAAPI layer. The same spring easing reappears in the Download banner drop-in and the saved-post collapse on `Posts.js`.

### The Android bridge

Inside the packaged app the wrapper injects a `window.Android` object. Hnly uses a few methods and degrades gracefully when missing:

| Method | Used for | Fallback when absent |
|---|---|---|
| `Android.getAppVersion()` | real app version in `APP_INFO`/About | hardcoded `"1.0.0"` |
| `Android.openInAppBrowser(url)` | open articles & external links in-app | `window.open(url, "_blank")` |
| `Android.copyText(text)` | copy Solana address | `navigator.clipboard.writeText` |

Because the check is `window.Android` (a property, so it's *undefined* in any regular browser), the same code path drives both hosts.

---

## How the logic works

### 1. Global state (`main.js`)

- `APP_INFO` — name, version, tagline, Solana wallet, plus placeholders for the download and feedback URLs.
- `POSTS` / `LOADING` — module-level state shared by Home and the grid/skeleton renderers.

### 2. The feed pipeline (`utils/getDailyHackerNews.js`)

This file is intentionally pure-ish and separated from the UI:

1. **Fetch** — pull story IDs from `topstories`, `beststories`, `newstories` concurrently (`Promise.allSettled`, so one dead feed can't kill the rest); details are fetched with **bounded concurrency** (`FETCH_CONCURRENCY: 12`) and a per-request timeout.
2. **Normalize** — keep only valid, non-dead `story` items; attach domain + description; sanitize untrusted content (`stripTags` strips HTML/control characters from title, text, author, and `isSafeUrl` only allows `http(s)://` — everything else falls back to the HN item link, so `javascript:`/`data:` never survive).
3. **Dedupe** — by ID and by normalized title.
4. **Topic-tag** — keyword patterns map titles to buckets like `ai`, `programming`, `security`, `crypto`, …
5. **Score** — weighted blend of *popularity* (log-scaled), *freshness* (decays over a 72 h window), *discussion* (log-scaled comments), and a touch of *randomness*.
6. **Diversify** — greedy selection that penalizes a second story from the same domain or topic, so the day's picks stay varied.
7. **Cache** — the result is cached in `localStorage` with a 5-minute TTL to spare the HN API (and your data).

```js
const SCORE_WEIGHTS = {
  popularity: 0.38, freshness: 0.35, discussion: 0.15, randomness: 0.12,
};
```

### 3. Saved posts (`getDailyHackerNews.js`)

`toggleSavePost` / `getSavedPosts` / `getSavedPostIdSet` read/write `saved_hacker_news_posts` in `localStorage` behind a small `safeStorage` wrapper that swallows privacy-mode `localStorage` errors. On render, the grid builds the ID set **once** and hands it to every card (`savedIds.has(id)`), instead of re-parsing `localStorage` per card.

### 4. Security hardening

- **Content-Security-Policy** (`index.html`) — `default-src 'self'`; scripts are limited to `'self'`, Tailwind, the engine CDN, and two explicitly *hashed* inline snippets — **no `'unsafe-inline'`**, so injected `<script>` tags are blocked outright. `frame-src`/`object-src` are `'none'`, and `connect-src` is pinned to the HN API, the engine CDN, jsDelivr (icons), and the deployed origin.
- **Output escaping** (`postCard.js`) — every HN-supplied value (title, description, timestamp, IDs, URLs) passes through `escapeHTML` before interpolation, so data can't break out of its text or attribute context even if the cache were tampered with.
- **Input sanitizing** (`getDailyHackerNews.js`) — see normalize step above; the cached copy in `localStorage` is already clean.

### 5. Performance notes

- **One listener instead of ~200** (`Home.js`) — card clicks go through a single delegated listener on the persistent `#posts-container`, which survives every `innerHTML` swap.
- **Batch-safe saved state** (`postGrid.js` + `postCard.js`) — `getSavedPostIdSet()` builds a `Set<string>` once per render; cards only do an O(1) `has()` check.
- **Bounded entrance animations** (`Home.js`) — only the first 18 cards animate; below-the-fold cards render instantly.
- **O(1) diverse selection** (`getDailyHackerNews.js`) — chosen stories are removed by swap-with-tail + `pop` instead of `splice`'s O(n) shift.

### 6. Feature behaviors

- **Download banner** (`DownloadBanner.js`) — rendered only when `!window.Android` (i.e. not already inside the app), **once per session** via a `sessionStorage` flag, then animated in with the spring easing. The CTA opens `APP_INFO.downloadUrl` when set, otherwise toasts "coming soon".
- **Check for updates** (`About.js`) — fetches `version.json`, normalizes both versions numerically (`1.0` == `1.0.0`) and toasts the result; shows a spinner on the row while checking.
- **Send feedback** — opens `APP_INFO.feedbackUrl` (in-app browser on Android, new tab on web). Updates for these placeholder URLs are flagged with `TODO` in `main.js`.

---

## Running & building

### Web (dev)

Serve `src/` as a static folder (any static server):

```powershell
# e.g. with a simple Node server
npx serve src
```

> Requires network — the Tailwind CDN and the UI-engine CDN load at runtime.

### Native Android wrapper

The wrapper + packaging CLI (**Corex**) is internal/personal-use software and is **not included in this repo**. The packaged app points the WebView at the deployed site and injects the `window.Android` bridge described above.

### Deploy

The web build deploys at **https://hnly.netlify.app** (Netlify, outside this repo). `src/version.json` must ship with each deploy — bump its `version` field whenever a new build is published so "Check for updates" stays honest.

---

## Feedback & contributing

Feedback, bug reports, feature ideas, and code-improvement suggestions are welcome in the
[**Feedback & feature requests**](https://github.com/Dongadev17/Hnly/issues/1) issue.

This is a small, fast-moving project; the code favors readability and a tiny footprint over abstract frameworks. If you'd like to contribute, start with the `enhancement`-labeled issues.