// JavaScript (ES2022+, browser environment — assumes an optional global `Toast.show(msg)`)

/* ============================================================
 * Configuration
 * ============================================================ */
const HN_CONFIG = {
  CACHE_KEY: "daily_hacker_news",
  SAVED_POSTS_KEY: "saved_hacker_news_posts",
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
 * Fetches and merges story IDs from all configured HN feeds.
 * Uses allSettled so one dead feed doesn't take down the others.
 * @returns {Promise<number[]>} deduped, capped list of candidate story IDs
 */
const fetchStoryIds = async () => {
  const results = await Promise.allSettled(
    HN_CONFIG.FEEDS.map((feed) =>
      fetchJSON(`https://hacker-news.firebaseio.com/v0/${feed}.json`),
    ),
  );

  const ids = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      ids.push(...result.value);
    } else if (result.status === "rejected") {
      console.warn(`[HN] ${HN_CONFIG.FEEDS[i]} failed:`, result.reason);
    }
  });

  return [...new Set(ids)].slice(0, HN_CONFIG.MAX_CANDIDATES);
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
 * @returns {Promise<object[]>}
 */
const fetchStories = async (ids) => {
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
    posts.push(normalizeStory(story));
  }
  return posts;
};

/**
 * Converts a raw HN item into the app's canonical post shape.
 * @param {object} story - raw HN API item
 * @returns {object} normalized post
 */
const normalizeStory = (story) => {
  const url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;

  let domain = "news.ycombinator.com";
  try {
    domain = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    // malformed URL — keep the HN fallback domain
  }

  return {
    id: String(story.id),
    title: String(story.title).trim(),
    url,
    description: story.text
      ? String(story.text)
          .replace(/<[^>]*>/g, "")
          .slice(0, 500)
      : "",
    image: null,
    source: "Hacker News",
    author: story.by || null,
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

    selected.push(remaining.splice(bestIndex, 1)[0]);
    const chosen = selected[selected.length - 1];
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
  const candidateIds = await fetchStoryIds();
  if (candidateIds.length === 0) {
    throw new Error("Unable to retrieve Hacker News story IDs");
  }

  let posts = await fetchStories(candidateIds);
  if (posts.length === 0) {
    throw new Error("No valid Hacker News stories found");
  }

  // --- Process: dedupe -> tag -> score -> diversify ---
  posts = deduplicatePosts(posts);
  tagTopics(posts);
  posts = scorePosts(posts);
  const selected = selectDiverse(posts, count);

  // Strip internal-only fields before returning/caching
  const finalPosts = selected.map(
    ({ _domain, _topic, _baseScore, ...post }) => post,
  );

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
 * @param {string|number} postId
 * @returns {boolean} whether the given post is currently saved
 */
const isPostSaved = (postId) =>
  getSavedPosts().some((post) => String(post.id) === String(postId));

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
