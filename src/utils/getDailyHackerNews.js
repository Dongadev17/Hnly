// JavaScript (ES2022+, browser environment — assumes an optional global `Toast.show(msg)`)

/* ============================================================
 * Configuration
 * ============================================================ */
const HN_CONFIG = {
  CACHE_KEY: "daily_hacker_news_v2", // v2: posts now carry _topic/_feeds/_rank/_why
  SAVED_POSTS_KEY: "saved_hacker_news_posts",
  READ_POSTS_KEY: "hnly_read_posts",
  HIDDEN_POSTS_KEY: "hnly_hidden_posts",
  CACHE_TTL_MS: 5 * 60 * 1000, // how long a cached result is considered fresh
  FEEDS: ["topstories", "beststories", "newstories"],
  MAX_CANDIDATES: 180, // cap on how many story IDs we fetch details for
  FETCH_TIMEOUT_MS: 8000,
  FETCH_CONCURRENCY: 12, // max parallel item requests when fetching story details
  FRESHNESS_WINDOW_HOURS: 72, // stories older than this get ~0 freshness score
  SCORE_WEIGHTS: {
    popularity: 0.38,
    freshness: 0.35,
    discussion: 0.15,
    randomness: 0.12,
  },
  DIVERSITY: {
    domainBonus: 0.22,
    domainPenalty: 0.12,
    topicBonus: 0.2,
    topicPenalty: 0.1,
  },
};

const TOPIC_PATTERNS = {
  ai: [
    "ai",
    "artificial intelligence",
    "llm",
    "gpt",
    "gemini",
    "claude",
    "machine learning",
    "deep learning",
    "neural",
    "agent",
    "agents",
    "transformer",
    "inference",
  ],
  programming: [
    "javascript",
    "typescript",
    "python",
    "rust",
    "golang",
    "java",
    "c++",
    "c#",
    "programming",
    "compiler",
    "runtime",
    "library",
    "framework",
    "api",
    "sdk",
    "developer",
  ],
  security: [
    "security",
    "hack",
    "hacked",
    "vulnerability",
    "vulnerabilities",
    "malware",
    "ransomware",
    "exploit",
    "privacy",
    "breach",
    "password",
    "authentication",
  ],
  hardware: [
    "cpu",
    "gpu",
    "processor",
    "chip",
    "hardware",
    "nvidia",
    "amd",
    "intel",
    "apple silicon",
    "arm",
    "server",
    "datacenter",
    "computer",
    "laptop",
    "phone",
  ],
  startups: [
    "startup",
    "founder",
    "funding",
    "venture",
    "vc",
    "acquisition",
    "acquired",
    "company",
    "business",
    "ipo",
  ],
  science: [
    "science",
    "physics",
    "biology",
    "chemistry",
    "space",
    "nasa",
    "astronomy",
    "quantum",
    "research",
    "experiment",
    "scientist",
  ],
  web: [
    "web",
    "browser",
    "chrome",
    "firefox",
    "html",
    "css",
    "frontend",
    "backend",
    "website",
    "internet",
    "http",
  ],
  openSource: [
    "open source",
    "github",
    "linux",
    "free software",
    "self-hosted",
    "opensource",
  ],
  databases: [
    "database",
    "postgres",
    "postgresql",
    "mysql",
    "sqlite",
    "mongodb",
    "redis",
    "sql",
    "storage",
  ],
  crypto: [
    "bitcoin",
    "ethereum",
    "crypto",
    "blockchain",
    "web3",
    "token",
    "wallet",
  ],
  society: [
    "government",
    "law",
    "legal",
    "policy",
    "education",
    "school",
    "university",
    "society",
    "politics",
  ],
};

/* ============================================================
 * Safe localStorage wrapper
 * Centralizes try/catch so callers don't repeat it everywhere.
 * ============================================================ */
const safeStorage = {
  /** @param {string} key @returns {any|null} parsed value, or null on miss/error */
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn(`[Storage] Failed to read "${key}":`, error);
      return null;
    }
  },
  /** @param {string} key @param {any} value @returns {boolean} success */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[Storage] Failed to write "${key}":`, error);
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Storage] Failed to remove "${key}":`, error);
    }
  },
};

/**
 * Fetches JSON from a URL with a timeout, aborting the request if it hangs.
 * @param {string} url
 * @param {number} timeout - ms before aborting
 * @returns {Promise<any>}
 */
const fetchJSON = async (url, timeout = HN_CONFIG.FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Fetches a single HN item by ID (story, comment, …).
 * @param {number|string} id
 * @returns {Promise<object>}
 */
const fetchItem = (id) =>
  fetchJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);

/**
 * Fetches and merges story IDs from all configured HN feeds.
 * Uses allSettled so one dead feed doesn't take down the others.
 * @returns {Promise<{ ids: number[], feedMap: Map<number, Set<string>> }>}
 *   `ids` (deduped, capped, in merge order) and `feedMap` (story id → the
 *   feeds it appeared in, used for the "why this story" reasons).
 */
const fetchStoryIds = async () => {
  const results = await Promise.allSettled(
    HN_CONFIG.FEEDS.map((feed) =>
      fetchJSON(`https://hacker-news.firebaseio.com/v0/${feed}.json`),
    ),
  );

  const ids = [];
  const feedMap = new Map();

  results.forEach((result, i) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      const feed = HN_CONFIG.FEEDS[i];
      result.value.forEach((id) => {
        if (!ids.includes(id)) ids.push(id);
        if (!feedMap.has(id)) feedMap.set(id, new Set());
        feedMap.get(id).add(feed);
      });
    } else if (result.status === "rejected") {
      console.warn(`[HN] ${HN_CONFIG.FEEDS[i]} failed:`, result.reason);
    }
  });

  return { ids: ids.slice(0, HN_CONFIG.MAX_CANDIDATES), feedMap };
};

/**
 * Runs an async mapper over items with a bounded concurrency, resolving to
 * allSettled-style results ({ status, value | reason }) in input order.
 * @param {readonly unknown[]} items
 * @param {number} limit
 * @param {(item: unknown) => Promise<any>} fn
 * @returns {Promise<{status: "fulfilled", value: any} | {status: "rejected", reason: any}[]>}
 */
const mapSettled = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (next < items.length) {
        const index = next++;
        try {
          results[index] = {
            status: "fulfilled",
            value: await fn(items[index]),
          };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    },
  );

  await Promise.all(workers);
  return results;
};

/**
 * Fetches story details for a list of IDs and normalizes them into a
 * consistent post shape. Invalid, deleted, dead, or non-story items are dropped.
 * Requests run with bounded concurrency (HN_CONFIG.FETCH_CONCURRENCY) to
 * avoid hammering the API with hundreds of parallel connections.
 * @param {number[]} ids
 * @param {Map<number, Set<string>>} [feedMap] story id → feeds it appeared in
 * @returns {Promise<object[]>}
 */
const fetchStories = async (ids, feedMap = new Map()) => {
  const results = await mapSettled(ids, HN_CONFIG.FETCH_CONCURRENCY, (id) =>
    fetchJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`),
  );

  const posts = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const story = result.value;
    if (
      !story ||
      story.type !== "story" ||
      story.deleted ||
      story.dead ||
      !story.title
    ) {
      continue;
    }
    const post = normalizeStory(story);
    post._feeds = Array.from(feedMap.get(story.id) || []);
    posts.push(post);
  }
  return posts;
};

/**
 * Stops HTML-like content and control characters that a story payload may
 * smuggle in. Defense in depth — templates also escape on render.
 * @param {unknown} value
 * @returns {string} plain text
 */
const HTML_TAG_RE = new RegExp("</?[a-zA-Z][^>]*>", "g");
const CONTROL_KEEP = (code) => code === 9 || code === 10 || code === 13 || code >= 32;
const stripTags = (value) =>
  String(value ?? "")
    .replace(HTML_TAG_RE, "")
    .split("")
    .filter((ch) => CONTROL_KEEP(ch.charCodeAt(0)))
    .join("")
    .trim();

// HN/API text ships HTML-entity-encoded (&amp;, &#x27;, &#x2F;, &#x27;, …).
// escapeHTML decodes these exactly once before escaping, so double-encoded
// values render cleanly instead of showing &amp;#x2F;. Decode-then-escape
// also makes escapeHTML idempotent: escapeHTML(escapeHTML(x)) === escapeHTML(x),
// so stale cached/saved copies self-heal on the next render.
const NAMED_ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
const decodeEntities = (value) =>
  String(value ?? "").replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g,
    (match, dec, hex, named) => {
      if (named) return NAMED_ENTITY_MAP[named] ?? match;
      const code = dec ? parseInt(dec, 10) : parseInt(hex, 16);
      if (
        Number.isFinite(code) &&
        code >= 0 &&
        code <= 0x10ffff &&
        (code < 0xd800 || code > 0xdfff)
      ) {
        return String.fromCodePoint(code);
      }
      return match;
    },
  );

/**
 * HTML-escapes untrusted text so it can't break out of its text/attribute
 * context regardless of how the template helper interpolates it. Decodes
 * HN/API HTML entities first, then escapes — safe to apply repeatedly.
 * @param {unknown} value
 * @returns {string}
 */
const escapeHTML = (value) =>
  decodeEntities(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

/**
 * Formats a Unix timestamp as a short relative time ("3h ago").
 * @param {number} secs
 * @returns {string}
 */
const timeAgo = (secs) => {
  const diff = Math.max(0, Date.now() - secs * 1000);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * Only http/https URLs may open from the app; anything else (javascript:,
 * data:, vbscript:, …) is rejected.
 * @param {unknown} url
 * @returns {boolean}
 */
const isSafeUrl = (url) => {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Converts a raw HN item into the app's canonical post shape.
 * Data is sanitized here (plain text + safe schemes) so the cached copy in
 * localStorage is clean too.
 * @param {object} story - raw HN API item
 * @returns {object} normalized post
 */
const normalizeStory = (story) => {
  const fallbackUrl = `https://news.ycombinator.com/item?id=${story.id}`;
  const url = isSafeUrl(story.url) ? String(story.url) : fallbackUrl;

  let domain = "news.ycombinator.com";
  try {
    const host = new URL(url).hostname;
    domain = (host.startsWith("www.") ? host.slice(4) : host).toLowerCase();
  } catch {
    // malformed URL — keep the HN fallback domain
  }

  return {
    id: String(story.id),
    title: stripTags(story.title).slice(0, 300),
    url,
    description: story.text ? stripTags(story.text).slice(0, 500) : "",
    image: null,
    source: "Hacker News",
    author: story.by ? stripTags(story.by).slice(0, 80) : null,
    score: Number(story.score) || 0,
    comments: Number(story.descendants) || 0,
    time: Number(story.time) || 0,
    category: "Technology",
    _domain: domain,
  };
};

/**
 * Removes duplicate posts by ID and by normalized title.
 * @param {object[]} posts
 * @returns {object[]}
 */
const deduplicatePosts = (posts) => {
  const seenIds = new Set();
  const seenTitles = new Set();

  return posts.filter((post) => {
    const titleKey = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (seenIds.has(post.id) || seenTitles.has(titleKey)) return false;
    seenIds.add(post.id);
    seenTitles.add(titleKey);
    return true;
  });
};

/**
 * Infers a broad topic from a title, since HN has no categories.
 * @param {string} title
 * @returns {string} topic key, or "other" if nothing matches
 */
const getTopic = (title) => {
  const text = title.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_PATTERNS)) {
    if (keywords.some((keyword) => text.includes(keyword))) return topic;
  }
  return "other";
};

/** Mutates posts in place, adding `_topic`. @param {object[]} posts */
const tagTopics = (posts) => {
  posts.forEach((post) => (post._topic = getTopic(post.title)));
};

/**
 * Scores posts on popularity, freshness, discussion volume, and a small
 * random factor so the daily picks aren't perfectly deterministic.
 * @param {object[]} posts
 * @returns {object[]} same posts with `_baseScore` attached
 */
const scorePosts = (posts) => {
  const now = Math.floor(Date.now() / 1000);
  const w = HN_CONFIG.SCORE_WEIGHTS;

  return posts.map((post) => {
    const ageHours = Math.max(0, (now - post.time) / 3600);
    const freshness = Math.max(
      0,
      1 - ageHours / HN_CONFIG.FRESHNESS_WINDOW_HOURS,
    );
    const popularity = Math.log10((post.score || 0) + 1) / 4;
    const discussion = Math.log10((post.comments || 0) + 1) / 4;
    const randomness = Math.random() * w.randomness;

    post._baseScore =
      popularity * w.popularity +
      freshness * w.freshness +
      discussion * w.discussion +
      randomness;
    return post;
  });
};

/**
 * Greedily selects `count` posts, penalizing repeated domains/topics so the
 * result set is diverse rather than dominated by one site or subject.
 * @param {object[]} scoredPosts - posts with `_baseScore`, sorted or unsorted
 * @param {number} count
 * @returns {object[]}
 */
const selectDiverse = (scoredPosts, count) => {
  const { domainBonus, domainPenalty, topicBonus, topicPenalty } =
    HN_CONFIG.DIVERSITY;
  const maxPerDomain = Math.max(1, Math.ceil(count / 3));
  const maxPerTopic = Math.max(1, Math.ceil(count / 2));

  const remaining = [...scoredPosts].sort(
    (a, b) => b._baseScore - a._baseScore,
  );
  const domainCounts = new Map();
  const topicCounts = new Map();
  const selected = [];

  while (selected.length < count && remaining.length > 0) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const post = remaining[i];
      const domainCount = domainCounts.get(post._domain) || 0;
      const topicCount = topicCounts.get(post._topic) || 0;

      if (domainCount >= maxPerDomain || topicCount >= maxPerTopic) continue;

      let diversityScore = post._baseScore;
      diversityScore +=
        domainCount === 0 ? domainBonus : -domainCount * domainPenalty;
      diversityScore +=
        topicCount === 0 ? topicBonus : -topicCount * topicPenalty;

      if (diversityScore > bestScore) {
        bestScore = diversityScore;
        bestIndex = i;
      }
    }

    // Diversity caps blocked every candidate — fall back to the top remaining post.
    if (bestIndex === -1) bestIndex = 0;

    // O(1) removal: swap the chosen entry with the tail, then pop (avoids
    // splice's O(n) left-shift on every pick).
    const chosen = remaining[bestIndex];
    remaining[bestIndex] = remaining[remaining.length - 1];
    remaining.pop();

    // Human-readable "why this story?" justification, shown on the card.
    const reasons = [];
    if (chosen._rank) reasons.push(`#${chosen._rank} overall on HN right now`);
    if (chosen.score || chosen.comments) {
      reasons.push(`${chosen.score} points · ${chosen.comments} comments`);
    }
    if (chosen.time) reasons.push(`Posted ${timeAgo(chosen.time)}`);
    if (chosen._feeds && chosen._feeds.length > 1) {
      reasons.push(`Heats up ${chosen._feeds.length} HN feeds at once`);
    }
    chosen._why = reasons.slice(0, 3);

    selected.push(chosen);
    domainCounts.set(
      chosen._domain,
      (domainCounts.get(chosen._domain) || 0) + 1,
    );
    topicCounts.set(chosen._topic, (topicCounts.get(chosen._topic) || 0) + 1);
  }

  return selected;
};

/**
 * Fetches, ranks, and returns a diverse daily selection of Hacker News posts.
 * Results are cached for HN_CONFIG.CACHE_TTL_MS to avoid hammering the API.
 * @param {number} nbOfPosts - how many posts to return (default 10)
 * @param {{forceRefresh?: boolean}} [options]
 * @returns {Promise<object[]>}
 * @throws {Error} if no valid stories could be retrieved
 */
const getDailyHackerNews = async (
  nbOfPosts = 10,
  { forceRefresh = false } = {},
) => {
  const count = Number.isInteger(nbOfPosts) && nbOfPosts > 0 ? nbOfPosts : 10;

  // --- Cache lookup ---
  if (!forceRefresh) {
    const cached = safeStorage.get(HN_CONFIG.CACHE_KEY);
    if (cached && Array.isArray(cached.posts) && cached.posts.length > 0) {
      const age = Date.now() - cached.timestamp;
      if (age < HN_CONFIG.CACHE_TTL_MS) {
        Toast.show("Using cached posts");
        return cached.posts.slice(0, count);
      }
      safeStorage.remove(HN_CONFIG.CACHE_KEY);
    }
  }

  // --- Fetch + build candidate pool ---
  const { ids: candidateIds, feedMap } = await fetchStoryIds();
  if (candidateIds.length === 0) {
    throw new Error("Unable to retrieve Hacker News story IDs");
  }

  let posts = await fetchStories(candidateIds, feedMap);
  if (posts.length === 0) {
    throw new Error("No valid Hacker News stories found");
  }

  // --- Process: dedupe -> tag -> score -> rank -> diversify ---
  posts = deduplicatePosts(posts);
  tagTopics(posts);
  posts = scorePosts(posts);

  // Rank by raw score before diversity adjustments so "why this story?" can
  // quote how a pick placed in the full candidate pool.
  posts.sort((a, b) => b._baseScore - a._baseScore);
  posts.forEach((post, index) => {
    post._rank = index + 1;
    if (!Array.isArray(post._feeds)) post._feeds = [];
  });

  const selected = selectDiverse(posts, count);

  // Keep enriched fields (topic/rank/feeds/why) for the UI; drop scoring math.
  const finalPosts = selected.map(({ _baseScore, ...post }) => post);

  safeStorage.set(HN_CONFIG.CACHE_KEY, {
    timestamp: Date.now(),
    posts: finalPosts,
  });

  return finalPosts;
};

/* ============================================================
 * Saved posts
 * ============================================================ */

/** @returns {object[]} list of saved posts, newest first */
const getSavedPosts = () => safeStorage.get(HN_CONFIG.SAVED_POSTS_KEY) || [];

/**
 * @returns {Set<string>} all saved post IDs, read once so bulk rendering
 * doesn't re-parse the whole saved list per card.
 */
const getSavedPostIdSet = () =>
  new Set(getSavedPosts().map((post) => String(post.id)));

/**
 * Adds or removes a post from the saved list.
 * @param {object} post - must have an `id`
 * @returns {boolean} true if the post is now saved, false if it was removed
 */
const toggleSavePost = (post) => {
  if (!post?.id) {
    console.warn("Post has no id:", post);
    return false;
  }

  const savedPosts = getSavedPosts();
  const index = savedPosts.findIndex(
    (item) => String(item.id) === String(post.id),
  );

  let saved;
  if (index !== -1) {
    savedPosts.splice(index, 1);
    saved = false;
  } else {
    savedPosts.unshift({ ...post, id: String(post.id), savedAt: Date.now() });
    saved = true;
  }

  safeStorage.set(HN_CONFIG.SAVED_POSTS_KEY, savedPosts);
  return saved;
};

/* ============================================================
 * Read / hidden state
 * ============================================================ */

/** @returns {Set<string>} all read post IDs */
const getReadIdSet = () => new Set(safeStorage.get(HN_CONFIG.READ_POSTS_KEY) || []);

/**
 * Marks a post as read (idempotent).
 * @param {string|number} id
 */
const markPostRead = (id) => {
  const ids = getReadIdSet();
  ids.add(String(id));
  safeStorage.set(HN_CONFIG.READ_POSTS_KEY, [...ids]);
};

/** @returns {Set<string>} all hidden post IDs */
const getHiddenIdSet = () =>
  new Set(
    (safeStorage.get(HN_CONFIG.HIDDEN_POSTS_KEY) || []).map((entry) =>
      String(entry.id ?? entry),
    ),
  );

/**
 * Adds a post to the hidden list.
 * @param {string|number} id
 */
const hidePost = (id) => {
  const list = safeStorage.get(HN_CONFIG.HIDDEN_POSTS_KEY) || [];
  const entry = { id: String(id), hiddenAt: Date.now() };
  safeStorage.set(HN_CONFIG.HIDDEN_POSTS_KEY, [
    ...list.filter((item) => String(item.id ?? item) !== String(id)),
    entry,
  ]);
};

/** @returns {string[]} topic keys for the filter chips ("All" is implied) */
const getTopics = () => Object.keys(TOPIC_PATTERNS);
