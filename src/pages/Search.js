// =====================================================================
// HN search page (Algolia API — no backend required)
// Debounced live search over stories, rendered with the standard card.
// =====================================================================

const ALGOLIA_ENDPOINT = "https://hn.algolia.com/api/v1/search";
const SEARCH_PAGE_SIZE = 20;

const hitToPost = (hit) => {
  const hnFallback = `https://news.ycombinator.com/item?id=${hit.objectID}`;
  const url =
    (hit.url && isSafeUrl(hit.url) && hit.url) ||
    (hit.story_url && isSafeUrl(hit.story_url) && hit.story_url) ||
    hnFallback;

  let domain = "news.ycombinator.com";
  try {
    const host = new URL(url).hostname;
    domain = (host.startsWith("www.") ? host.slice(4) : host).toLowerCase();
  } catch {}

  return {
    id: String(hit.objectID),
    title: stripTags(hit.title || hit.story_title || "(untitled)").slice(0, 300),
    url,
    description: hit.story_text ? stripTags(hit.story_text).slice(0, 500) : "",
    image: null,
    source: "Hacker News",
    author: hit.author ? stripTags(hit.author).slice(0, 80) : null,
    score: Number(hit.points) || 0,
    comments: Number(hit.num_comments) || 0,
    time: Number(hit.created_at_i) || 0,
    category: "Technology",
    _domain: domain,
  };
};

const SearchState = () => ({
  results: [],
  query: "",
  page: 0,
  nbPages: 0,
  loading: false,
});

const renderSearchResultGrid = (posts) => {
  const savedIds = getSavedPostIdSet();
  const readIds = getReadIdSet();

  return posts.length
    ? html`<div class="columns columns-1 md:columns-2 lg:columns-3 xl:columns-4 space-y-3 gap-x-3">
        ${posts
          .map((post) => PostCard(post, savedIds, readIds))
          .join("")}
      </div>`
    : html`<div class="px-4 pt-16 text-center text-[12px] text-white/35">
        No results found
      </div>`;
};

const renderLoadMore = (total) => html`
  <button
    id="searchMoreBtn"
    type="button"
    class="ripple-container mt-5 flex h-11 w-full items-center justify-center rounded-full bg-[#2c2c2e] text-[13px] font-semibold text-white/85 active:scale-[0.98]"
  >
    Load more${total ? html` <span class="text-white/40">(${total})</span>` : ""}
  </button>
`;

const runSearch = async (state, query, page, onDone) => {
  const url = `${ALGOLIA_ENDPOINT}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${SEARCH_PAGE_SIZE}&page=${page}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Algolia HTTP ${res.status}`);

  const data = await res.json();

  const hits = Array.isArray(data.hits) ? data.hits : [];
  const posts = hits.map(hitToPost);
  state.page = page;
  state.nbPages = Number(data.nbPages) || 0;

  if (page === 0) {
    state.results = posts;
  } else {
    state.results.push(...posts);
  }

  onDone();
};

const Search = (params, el) => {
  const state = SearchState();

  const Page = html`
    <div class="min-h-screen">
      ${Navbar(SearchNav)}

      <main class="px-3 pb-8 pt-2">
        <div class="flex items-center gap-2 rounded-full bg-[#1c1c1e] px-4 py-3">
          <span class="mdi mdi-magnify text-[18px] text-white/40"></span>
          <input
            id="searchInput"
            type="search"
            placeholder="Search stories…"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/30"
          />
          <button
            id="searchClearBtn"
            type="button"
            class="hidden text-[13px] font-medium text-white/40 hover:text-white/70"
          >
            Clear
          </button>
        </div>

        <div id="searchResults" class="mt-3"></div>
      </main>
      <br />
    </div>
  `;

  afterPageLoad(() => {
    const resultsBox = el.querySelector("#searchResults");
    const input = el.querySelector("#searchInput");
    const clearBtn = el.querySelector("#searchClearBtn");

    const render = (withMoreMarker) => {
      resultsBox.innerHTML = html`
        ${state.loading
          ? html`<div class="px-4 pt-16 text-center text-[12px] text-white/35">
              Searching…
            </div>`
          : state.query
            ? renderSearchResultGrid(state.results) + (withMoreMarker && state.page + 1 < state.nbPages ? renderLoadMore(state.results.length) : "")
            : html`<div class="px-4 pt-16 text-center text-[12px] text-white/35">
                Type to search over Hacker News stories
              </div>`}
      `;
    };

    let debounceTimer;

    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const query = input.value.trim();
      state.query = query;
      clearBtn.classList.toggle("hidden", !query);

      debounceTimer = setTimeout(async () => {
        if (!query) {
          state.results = [];
          state.page = 0;
          state.nbPages = 0;
          render(false);
          return;
        }

        state.loading = true;
        render(false);

        try {
          await runSearch(state, query, 0, () => {
            state.loading = false;
            render(true);
          });
        } catch {
          state.loading = false;
          resultsBox.innerHTML = html`
            <div class="flex flex-col items-center px-4 pt-16 text-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#1c1c1e]">
                <span class="mdi mdi-magnify-close text-[22px] text-white/40"></span>
              </div>
              <h2 class="mt-4 text-[15px] font-semibold text-white">
                Search failed
              </h2>
              <p class="mt-1 max-w-[260px] text-[12px] leading-relaxed text-white/35">
                Check your connection and try again.
              </p>
            </div>
          `;
        }
      }, 350);
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.classList.add("hidden");
      input.dispatchEvent(new Event("input"));
      input.focus();
    });

    resultsBox.addEventListener("click", async (e) => {
      const moreBtn = e.target.closest("#searchMoreBtn");
      const saveBtn = e.target.closest("[data-saveid]");
      const shareBtn = e.target.closest("[data-share]");
      const hideBtn = e.target.closest("[data-hide]");
      const commentsBtn = e.target.closest("[data-comments]");
      const link = e.target.closest("[data-url]");

      if (moreBtn) {
        moreBtn.disabled = true;
        try {
          await runSearch(state, state.query, state.page + 1, () => render(true));
        } catch {
          Toast.show("Couldn't load more results");
        } finally {
          moreBtn.disabled = false;
        }
        return;
      }

      if (saveBtn) {
        e.preventDefault();
        e.stopPropagation();
        const post = state.results.find(
          (p) => String(p.id) === String(saveBtn.dataset.saveid),
        );
        if (post) {
          const saved = toggleSavePost(post);
          saveBtn.classList.toggle("bg-white", saved);
          saveBtn.classList.toggle("text-black", saved);
          saveBtn.classList.toggle("bg-[#2c2c2e]", !saved);
          saveBtn.classList.toggle("text-white/65", !saved);
          const icon = saveBtn.querySelector(".mdi");
          if (icon) {
            icon.classList.toggle("mdi-bookmark", saved);
            icon.classList.toggle("mdi-bookmark-outline", !saved);
          }
          saveBtn.setAttribute("aria-label", saved ? "Remove from saved" : "Save for later");
          saveBtn.setAttribute("title", saved ? "Remove from saved" : "Save for later");
          Toast.show(saved ? "Post saved!" : "Post removed!");
        }
        return;
      }

      if (commentsBtn) {
        e.preventDefault();
        e.stopPropagation();
        const post = state.results.find(
          (p) => String(p.id) === String(commentsBtn.dataset.comments),
        );
        if (post) {
          markPostRead(post.id);
          SELECTED_POST = post;
          try {
            sessionStorage.setItem("hnly_selected_post", JSON.stringify(post));
          } catch {}
          window.location.hash = "#comments";
        }
        return;
      }

      if (shareBtn) {
        e.preventDefault();
        e.stopPropagation();
        const post = state.results.find(
          (p) => String(p.id) === String(shareBtn.dataset.share),
        );
        if (post) {
          const text = `${post.title}\n${post.url}`;
          if (navigator.share) {
            try {
              await navigator.share({ title: post.title, text, url: post.url });
              return;
            } catch {}
          }
          try {
            await navigator.clipboard.writeText(text);
            Toast.show("Story copied — share it anywhere");
          } catch {
            Toast.show("Couldn't share this story");
          }
        }
        return;
      }

      if (hideBtn) {
        e.preventDefault();
        e.stopPropagation();
        hidePost(hideBtn.dataset.hide);
        const card = hideBtn.closest("article");
        if (card) card.remove();
        return;
      }

      if (link) {
        e.preventDefault();
        const url = link.dataset.url;
        const postId = link.dataset.postid;
        if (!url) return;
        if (postId) {
          markPostRead(postId);
          const card = link.closest("article");
          if (card) {
            card
              .querySelector("[data-story-title]")
              ?.classList.replace("text-white", "text-white/55");
          }
        }
        setTimeout(() => {
          if (typeof Android !== "undefined" && Android.openInBrowser) {
            Android.openInAppBrowser(url);
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }, 250);
      }
    });

    input.focus();
    render(false);
  });

  return Page;
};