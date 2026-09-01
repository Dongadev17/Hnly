# Hnly

A curated daily Hacker News feed — ranked every day by popularity, freshness, and discussion, then balanced across topics so no single site or subject dominates your feed. Dark, iOS-flavored UI built to run **both as a web app and inside a mobile WebView wrapper**.

> **Why reading this repo is quick and readable** — there's no framework, no bundler, no build step in the normal web workflow. The whole app is a small set of browser scripts that load in a strict order, and its "engine" is small and external. See [Architecture](#architecture) and [How the code is organized](#how-the-code-is-organized).

---

## Highlights

- **One UI, two hosts** — the exact same `src/` runs in a browser and inside the native Android WebView. A tiny JS bridge (`window.Android`) upgrades the experience when running packaged.
- **Zero-dependency web stack** — plain ES2022+ JavaScript, [Tailwind CSS (CDN)](https://tailwindcss.com/), Material Design Icons, and the Montserrat font.
- **Smart daily feed** — merges HN `topstories`, `beststories`, and `newstories`, deduplicates, infers topics, scores each story, and selects a diverse set (no domain/topic monopolies) while reserving up to `MIN_PER_TOPIC` (20) stories for every topic so no topic tab is left nearly empty.
- **Algeria Tech tab** — a dedicated feed of **Algeria-only** stories pulled from the `algeriatech.news` WordPress REST API filtered by the Algeria tag (id 119), rendered with HN-only UI (scores, comments) hidden.
- **"Why this story?"** — every card explains its selection: rank, engagement, age, and diversity reasons are surfaced inline.
- **Topic tabs** — filter the feed by bucket (`AI`, `Security`, `Web`, …) with one-tap chips above the list.
- **Read · hide · save · share** — each card carries a toolbar: save for later, open the in-app comments, use the native share sheet (or clipboard fallback), or hide a story.
- **In-app comments** — full HN comment threads load inside the app, with lazily-expanding replies.
- **Live search** — debounced search across all of Hacker News via the Algolia API, rendered with the same cards.
- **Cached & offline-friendly** — the daily selection is cached in `localStorage` (5 min TTL); saved posts persist locally too. A **service worker** caches the app shell + CDN assets, and persistent feed/comment snapshots keep Home and saved comments readable offline.
- **Reading stats** — a local-only stats page (today's reads, streak, 14-day activity, top topics) built from per-read events that never leave the device.
- **Personalized re-ranking** — pick up to 3 topics to "see more of" in a bottom sheet, plus affinity from the topics you save/read/hide — all computed locally and applied to the "All" feed.
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
        ├── pages   Home · Comments · Search · Posts · About · Privacy · Terms   (route entry points)
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
│   ├── main.js                    # APP_INFO, global POSTS/LOADING state, router setup, SW registration
│   ├── style.css                  # Global styles (font, selection, disabled)
│   ├── sw.js                      # Service worker — app-shell + CDN asset caching (offline)
│   ├── version.json               # Latest deployed version (used by "Check for updates")
│   ├── assets/logo.png            # App icon used in the UI
│   ├── components/                # Reusable HTML-building functions
│   │   ├── Navbar.js              # Navbar shell + per-page nav content
│   │   ├── DownloadBanner.js      # "Get the app" banner (web visitors, once per session)
│   │   ├── postCard.js            # Story card: toolbar, read state, "why" panel (+ skeleton)
│   │   └── postGrid.js            # Grid w/ saved+read Sets, skeleton, empty-state renderers
│   ├── pages/                     # One function per route
│   │   ├── Home.js                # Feed: topic tabs, hidden bar, refresh, personalize sheet, offline fallback
│   │   ├── Comments.js            # In-app HN thread: story header + lazily-expanding replies (+ offline cache)
│   │   ├── Search.js              # Live Algolia story search (debounced, load-more)
│   │   ├── Posts.js               # Saved posts + animated removal + toolbar actions
│   │   ├── About.js               # iOS-style settings page + actions
│   │   ├── Stats.js               # Reading stats (streak, 14-day activity, top topics) — local-only
│   │   ├── Privacy.js             # Privacy Policy (legal card list, reachable from About)
│   │   └── Terms.js               # Terms & Conditions (shares the legal card list)
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
  .add("comments", Comments, { cache: false })
  .add("search", Search, { cache: false })
  .add("about", About, { cache: false })
  .add("stats", Stats, { cache: false })
  .add("privacy", Privacy, { cache: false })
  .add("terms", Terms, { cache: false })
```

- Each page is a **function** `(params, el) => …` that returns a template string and receives the mounted element.
- `{ cache: false }` forces re-render on every visit — so Home re-animates its cards, Comments re-reads the selected story, and About always reflects the latest version.
- Navbar buttons use `data-route` to navigate (the engine wires them up).
- Comments and Search read the inline story from the `SELECTED_POST` module global (Home/Search/Posts set it before navigating), mirrored to `sessionStorage` (`hnly_selected_post`) so a hard refresh keeps context.

### Templates

Statically-oriented HTML is written with `html` (a tagged template from the engine). Dynamic lists are built with `.map()` + `.join("")`:

```js
const PostGrid = (posts = POSTS) => {
  const savedIds = getSavedPostIdSet(); // read once per render
  const readIds = getReadIdSet();
  return html`
    ${posts.length
      ? html`<div class="columns …">
          ${posts.map((post) => PostCard(post, savedIds, readIds)).join("")}
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
- `SELECTED_POST` — the story currently open in the Comments page; set by Home/Search/Posts before navigating to `#comments`, mirrored to `sessionStorage` so it survives a hard refresh.

### 2. The feed pipeline (`utils/getDailyHackerNews.js`)

This file is intentionally pure-ish and separated from the UI:

1. **Fetch** — pull story IDs from `topstories`, `beststories`, and `newstories` concurrently (`Promise.allSettled`, so one dead feed can't kill the rest); details are fetched with **bounded concurrency** (`FETCH_CONCURRENCY: 12`) and a per-request timeout. Each story remembers its source feeds as `_feeds`.
2. **Normalize** — keep only valid, non-dead `story` items; attach domain + description; sanitize untrusted content (`stripTags` strips HTML/control characters from title, text, author, and `isSafeUrl` only allows `http(s)://` — everything else falls back to the HN item link, so `javascript:`/`data:` never survive).
3. **Dedupe** — by ID and by normalized title.
4. **Topic-tag** — keyword patterns map titles to buckets like `ai`, `programming`, `security`, `crypto`, … (stored as `_topic`).
5. **Score** — weighted blend of *popularity* (log-scaled), *freshness* (decays over a 72 h window), *discussion* (log-scaled comments), and a touch of *randomness*. Stories are then ranked (`_rank`).
6. **Select (floor + diversify)** — two phases. A **floor pass** first reserves up to `MIN_PER_TOPIC` (20) of the best-scored stories for **every** topic, so a topic tab is never left nearly empty (best-effort: a topic with fewer matching stories that day just yields what it has, and the pool was raised to `MAX_CANDIDATES: 320` to make 20×11 reachable). A **top-up pass** then fills the rest with greedy domain/topic diversity that penalizes a second story from the same domain or topic. Each pick records *why* it won (`_why`: rank, engagement, age, diversity) — that's the "Why this story?" panel on the card.
7. **Cache** — the full selected set is cached in `localStorage` with a 5-minute TTL to spare the HN API (and your data). The cache key was bumped to `daily_hacker_news_v3` when per-topic flooring was introduced, so stale pre-feature entries are ignored.

**A separate Algeria feed** (`algeriaTech`) lives in the same file but is a different pipeline: `getAlgeriaTechPosts()` calls the `algeriatech.news` WordPress REST API filtered by the dedicated **Algeria** tag (id 119) so only stories genuinely about Algeria come back — the generic RSS feed was dropped because every article embedded a "Relevance for Algeria" block that caused false-positive keyword matches. Posts are tagged `_topic: "algeriaTech"`, marked `_source: "algeriatech"`, cached under `algeria_news_v3` (5 min TTL), and rendered with HN-only UI (scores, comments) hidden.

```js
const SCORE_WEIGHTS = {
  popularity: 0.38, freshness: 0.35, discussion: 0.15, randomness: 0.12,
};
```

### 3. Saved posts (`getDailyHackerNews.js`)

`toggleSavePost` / `getSavedPosts` / `getSavedPostIdSet` read/write `saved_hacker_news_posts` in `localStorage` behind a small `safeStorage` wrapper that swallows privacy-mode `localStorage` errors. On render, the grid builds the ID set **once** and hands it to every card (`savedIds.has(id)`), instead of re-parsing `localStorage` per card.

### 4. Read & hidden state (`getDailyHackerNews.js`)

Opening a story's comments or article marks it read (`markPostRead`) and stores the ID in `hnly_read_posts`; hiding a story (`hidePost`) stores it in `hnly_hidden_posts`. `getReadIdSet()` / `getHiddenIdSet()` return `Set<string>`s that cards use for read-dimming and the Home hidden-bar. Home's "Show" toggle reveals hidden cards; this is all local-first state — nothing is sent anywhere.

**Stats & personalization events (`getDailyHackerNews.js`)** — `markPostRead` also writes `hnly_read_events` (`{id, t, day, topic, domain}`, at most one per post per day, newest ~600 kept, 180-day horizon; legacy `hnly_read_posts` ids are backfilled as a single "today" event). These feed both the **Reading Stats** page (streak, 14-day bars, top topics) and the **Personalize** sheet: `topicAffinity()` boosts topics you've saved (1) or read (2) and penalizes topics you've hidden (4), while the up-to-3 explicit picks in `hnly_personalize_topics` get a stronger boost (+5); `personalizePosts` then stably re-sorts the filtered feed. `hidePost` accepts a full post so hidden entries carry `_topic`/`_domain`.

**Offline data layer (`getDailyHackerNews.js` + `sw.js`)** — three local snapshots support offline reading: `hnly_offline_feed` (persistent mirror of the last successful HN fetch) and `hnly_offline_algeria` (Algeria, both written only on network success), plus `hnly_offline_comments` (`{storyId: {t, story, nodes}}`, newest 12 kept) written through after each successful Comments load. When a fetch fails, Home falls back to the feed/Algeria snapshot (with an "Offline · showing saved" bar) and Comments falls back to its cached thread (with a "cached" header). `sw.js` pre-caches the app shell + CDN assets on install and cleans up old versions on activate; data/analytics hosts are network-only so they fail cleanly offline.

### 5. Security hardening

- **Content-Security-Policy** (`index.html`) — `default-src 'self'`; scripts are limited to `'self'`, Tailwind, the engine CDN, and two explicitly *hashed* inline snippets — **no `'unsafe-inline'`**, so injected `<script>` tags are blocked outright. `frame-src`/`object-src` are `'none'`, and `connect-src` is pinned to the HN API, the Algolia search API, the engine CDN, jsDelivr (icons), and the deployed origin.
- **Output escaping** (`utils/getDailyHackerNews.js`) — every HN-supplied value (title, description, timestamp, IDs, URLs, author, comment text) passes through one shared `escapeHTML` before interpolation, so data can't break out of its text or attribute context even if the cache were tampered with.
- **Input sanitizing** (`getDailyHackerNews.js`) — see normalize step above; the cached copy in `localStorage` is already clean.

### 6. Performance notes

- **One listener instead of ~200** (`Home.js`) — card clicks go through a single delegated listener on the persistent `#posts-container`, which survives every `innerHTML` swap. Search and Posts use the same delegated pattern.
- **Batch-safe saved/read state** (`postGrid.js` + `postCard.js`) — `getSavedPostIdSet()` and `getReadIdSet()` build `Set`s once per render; cards only do O(1) `has()` checks.
- **Bounded entrance animations** (`Home.js`) — only the first 18 cards animate; below-the-fold cards render instantly.
- **Lazy comments** (`Comments.js`) — replies are fetched only when their "Reply thread" toggle is expanded, and nesting is capped at 4 levels deep.
- **O(1) diverse selection** (`getDailyHackerNews.js`) — chosen stories are removed by swap-with-tail + `pop` instead of `splice`'s O(n) shift.

### 7. Feature behaviors

- **Download banner** (`DownloadBanner.js`) — rendered only when `!window.Android` (i.e. not already inside the app), **once per session** via a `sessionStorage` flag, then animated in with the spring easing. The CTA opens `APP_INFO.downloadUrl` when set, otherwise toasts "coming soon".
- **Check for updates** (`About.js`) — fetches `version.json`, normalizes both versions numerically (`1.0` == `1.0.0`) and toasts the result; shows a spinner on the row while checking.
- **Send feedback** — opens `APP_INFO.feedbackUrl` (in-app browser on Android, new tab on web). Updates for these placeholder URLs are flagged with `TODO` in `main.js`.
- **Topic tabs & hidden bar** (`Home.js`) — chips above the feed filter by `_topic`; the hidden bar shows how many stories are hidden and toggles them back.
- **Toolbar** (`postCard.js`) — every card: ℹ️ "Why this story?" (`data-why`), Read Article (marks read + dims the title), and a bookmark/comments/share/hide row. Save/share/hide/comments all work from Home, Search, and Saved without per-card listeners.
- **In-app comments** (`Comments.js`) — the selected story is rendered as a header card and its thread is fetched from the Algolia-adjacent Firebase item API; top-level comments show immediately and replies expand lazily. All comment text is escaped; `data-replies-toggle` drives collapse/expand.
- **Reading Stats** (`Stats.js`) — renders an iOS-style list of today's reads, current/best streak, avg-per-day, a 14-day activity bar chart (`#ff6600` accent, no libraries), and top topics by reads; a destructive "Clear reading history" action is confirmed via `BottomSheet`. All numbers come from local `hnly_read_events`.
- **Personalize** (`Home.js`) — a `mdi-tune-variant` pill, shown only while the **"All"** topic is selected, opens a bottom sheet where you pick up to 3 topics to "see more of" (stored in `hnly_personalize_topics`). When at least one is saved, the "All" feed is re-sorted by topic affinity derived from the explicit picks (strong boost) plus saves/reads (small boost) and hides (penalty), using a stable sort so engineering rank still breaks ties. The pill animates in/out as you switch topic chips and is never shown for the Algeria feed.
- **Offline** (`sw.js` + Home/Comments) — the service worker (`sw.js`) caches the shell (`./`, `index.html`, `style.css`, `version.json`, `logo.png`) and revalidates CDN assets (engine, Tailwind, fonts, MDI) with stale-while-revalidate; cross-origin data/analytics stays network-only. On failed fetches, Home loads `hnly_offline_feed`/`hnly_offline_algeria` with an offline bar, and Comments loads `hnly_offline_comments` with a "cached" header.
- **Search** (`Search.js`) — queries `https://hn.algolia.com/api/v1/search?tags=story` (350 ms debounce, 20 hits per page, "Load more"), maps hits to the post shape, and reuses `PostCard` — so search results get the exact same toolbar and read/dim behavior as the feed.

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