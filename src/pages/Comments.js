// =====================================================================
// HN comments page
// Shows the story header plus a threaded, lazily-expanding comment list.
// The "story" is carried over from Home via SELECTED_POST (module global)
// with a sessionStorage mirror so a hard refresh keeps context.
// =====================================================================

const COMMENTS_SESSION_KEY = "hnly_selected_post";

const readSelectedPost = () => {
  if (SELECTED_POST) return SELECTED_POST;
  try {
    return JSON.parse(sessionStorage.getItem(COMMENTS_SESSION_KEY)) || null;
  } catch {
    return null;
  }
};

// Comment body text is arbitrary HN-authored HTML — escape everything, then
// treat newlines as line breaks. Nothing is ever injected as markup.
const renderCommentText = (text) =>
  escapeHTML(stripTags(text)).split("\n").join("<br>");

const CommentSkeletonItem = () => html`
  <div class="space-y-2 px-4 py-4">
    <div class="h-2.5 w-24 animate-pulse rounded-full bg-[#2c2c2e]"></div>
    <div class="h-3 w-[92%] animate-pulse rounded-md bg-[#2c2c2e]"></div>
    <div class="h-3 w-[70%] animate-pulse rounded-md bg-[#2c2c2e]"></div>
  </div>
`;

const commentNode = (comment, depth) => {
  const kids = Array.isArray(comment.kids) ? comment.kids : [];
  const kidIds = kids.join(",");

  return html`
    <div data-comment-node class="break-inside-avoid">
      <div class="flex items-center gap-2 text-[11px] text-white/35">
        <span class="mdi mdi-account-circle-outline text-[13px]"></span>
        <span class="font-medium text-white/55">${escapeHTML(comment.by || "deleted")}</span>
        <span>·</span>
        <span>${timeAgo(comment.time)}</span>
        ${comment.score ? html`<span>· ${comment.score} pts</span>` : ""}
      </div>

      <div class="mt-1.5 break-words text-[13.5px] leading-relaxed text-white/80">
        ${renderCommentText(comment.text)}
      </div>

      ${kids.length
        ? html`
            <button
              type="button"
              data-replies-toggle
              data-id="${escapeHTML(comment.id)}"
              data-depth="${depth}"
              data-kids="${kidIds}"
              class="mt-1.5 inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-0.5 text-[11px] font-medium text-white/40 transition-colors hover:text-[#ff6600]"
            >
              <span
                class="mdi mdi-chevron-down text-[14px] transition-transform"
              ></span>
              Reply thread (${kids.length})
            </button>
          `
        : ""}

      <div data-replies></div>
    </div>
  `;
};

const storyHeader = (story, item) => html`
  <div class="px-3">
    <article
      class="break-inside-avoid rounded-[24px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
    >
      <div class="flex items-center justify-between text-[11px] text-white/35">
        <span>${escapeHTML(timeAgo(story.time))}</span>
        <span class="flex items-center gap-1">
          <span class="mdi mdi-arrow-up text-[13px] text-[#ff6600]"></span>
          <span class="font-semibold text-white/55">${Number(story.score) || 0}</span>
        </span>
      </div>

      <h2
        class="mt-2.5 text-[17px] font-semibold leading-[1.28] tracking-[-0.02em] text-white"
      >
        ${escapeHTML(story.title)}
      </h2>

      <div class="mt-3 flex items-center gap-3 text-[11px] text-white/35">
        ${story.author
          ? html`<span class="flex items-center gap-1">
              <span class="mdi mdi-account-circle-outline text-[13px]"></span>
              ${escapeHTML(story.author)}
            </span>`
          : ""}
        <span class="flex items-center gap-1">
          <span class="mdi mdi-comment-outline text-[13px]"></span>
          ${Number(item?.descendants ?? story.comments) || 0} comments
        </span>
      </div>
    </article>
  </div>
`;

const Comments = (params, el) => {
  const Page = html`
    <div class="min-h-screen">
      <!-- Navbar -->
      ${Navbar(CommentsNav)}

      <!-- Thread -->
      <main class="pb-8 pt-2">
        <div id="comments-container">
          <div class="px-4 pt-3">
            ${Array.from({ length: 5 }, () => CommentSkeletonItem()).join("")}
          </div>
        </div>
      </main>
      <br />
    </div>
  `;

  afterPageLoad(async () => {
    const container = el.querySelector("#comments-container");

    // Delegated, lazy thread expansion — replies load only when opened.
    el.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-replies-toggle]");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const node = btn.closest("[data-comment-node]");
      const repliesBox = node?.querySelector("[data-replies]");
      if (!node || !repliesBox) return;

      // Collapse if already expanded
      if (btn.dataset.open === "1") {
        repliesBox.innerHTML = "";
        btn.dataset.open = "0";
        const chevron = btn.querySelector(".mdi");
        if (chevron) chevron.classList.remove("rotate-180");
        return;
      }

      const kids = btn.dataset.kids ? btn.dataset.kids.split(",") : [];
      if (!kids.length) return;

      btn.disabled = true;

      try {
        const items = await Promise.all(kids.map(fetchItem));

        const nextDepth = Math.min(Number(btn.dataset.depth) + 1, 4);
        repliesBox.style.paddingLeft = `${nextDepth * 12}px`;
        repliesBox.style.marginTop = "6px";
        repliesBox.style.borderLeft = "1px solid rgba(255,255,255,0.08)";

        repliesBox.innerHTML = html`
          <div class="space-y-4">
            ${items
              .filter((c) => c && !c.deleted && !c.dead)
              .map((c) => commentNode(c, nextDepth))
              .join("")}
          </div>
        `;

        btn.dataset.open = "1";
        const chevron = btn.querySelector(".mdi");
        if (chevron) chevron.classList.add("rotate-180");
      } catch {
        Toast.show("Couldn't load replies");
      } finally {
        btn.disabled = false;
      }
    });

    const story = readSelectedPost();

    if (!story) {
      container.innerHTML = EmptyState(
        "mdi-comment-question-outline",
        "Story not available",
      );
      return;
    }

    container.innerHTML = html`
      ${storyHeader(story, null)}
      <div class="px-4 pt-3">
        ${Array.from({ length: 5 }, () => CommentSkeletonItem()).join("")}
      </div>
    `;

    try {
      const item = await fetchItem(story.id);
      const kids = Array.isArray(item.kids) ? item.kids : [];

      let body;
      if (!kids.length) {
        body = html`
          <div class="px-4 pt-14 text-center text-[12px] text-white/35">
            No comments yet
          </div>
        `;
      } else {
        const topLevel = await Promise.all(kids.map(fetchItem));
        body = html`
          <div class="px-4 pt-3">
            <div class="space-y-5">
              ${topLevel
                .filter((c) => c && !c.deleted && !c.dead)
                .map((c) => commentNode(c, 0))
                .join("")}
            </div>
          </div>
        `;
      }

      container.innerHTML = html`${storyHeader(story, item)}${body}`;
    } catch (error) {
      console.error("[Comments] Failed to load thread:", error);
      container.innerHTML = html`
        ${storyHeader(story, null)}
        <div
          class="flex flex-col items-center px-4 pt-16 text-center"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-[#1c1c1e]"
          >
            <span class="mdi mdi-comment-alert-outline text-[22px] text-white/40"></span>
          </div>
          <h2 class="mt-4 text-[15px] font-semibold text-white">
            Couldn't load comments
          </h2>
          <p class="mt-1 max-w-[260px] text-[12px] leading-relaxed text-white/35">
            Check your connection and try again.
          </p>
          <button
            id="commentsRetryBtn"
            class="ripple-container mt-4 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black active:scale-95"
          >
            Try Again
          </button>
        </div>
      `;

      container
        .querySelector("#commentsRetryBtn")
        ?.addEventListener("click", () => window.location.reload());
    }
  });

  return Page;
};