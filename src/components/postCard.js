const PostCardSkeleton = () => html`
  <article
    class="w-full first:lg:col-span-2 last:lg:col-span-2 break-inside-avoid rounded-[24px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
    aria-hidden="true"
  >
    <div class="flex items-center justify-between">
      <div class="h-2.5 w-14 animate-pulse rounded-full bg-[#2c2c2e]"></div>
      <div class="h-2.5 w-10 animate-pulse rounded-full bg-[#2c2c2e]"></div>
    </div>

    <div class="mt-3.5 space-y-2">
      <div class="h-4.5 w-[94%] animate-pulse rounded-md bg-[#2c2c2e]"></div>
      <div class="h-4.5 w-[72%] animate-pulse rounded-md bg-[#2c2c2e]"></div>
    </div>

    <div class="mt-3 space-y-2">
      <div class="h-3 w-[88%] animate-pulse rounded-md bg-[#2c2c2e]"></div>
      <div class="h-3 w-[54%] animate-pulse rounded-md bg-[#2c2c2e]"></div>
    </div>

    <div class="mt-4 flex gap-2">
      <div class="h-10 w-10 animate-pulse rounded-full bg-[#2c2c2e]"></div>
      <div class="h-10 flex-1 animate-pulse rounded-full bg-[#2c2c2e]"></div>
    </div>
  </article>
`;

const PostCard = (post, savedIds = new Set(), readIds = new Set()) => {
  const id = String(post.id);
  const saved = savedIds.has(id);
  const read = readIds.has(id);

  const score = Number(post.score ?? 0);
  const commentCount = Math.max(0, Number(post.comments) || 0);
  const age = post.time ? timeAgo(post.time) : "";
  const why = Array.isArray(post._why) ? post._why : [];

  return html`
    <article
      class="shrink-0 break-inside-avoid rounded-[24px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
    >
      <div class="flex items-center justify-between text-[11px] text-white/35">
        <span class="flex min-w-0 items-center gap-1.5">
          ${age ? html`<span>${escapeHTML(age)}</span>` : html`<span></span>`}
          ${read
            ? html`<span
                class="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/45"
                >Read</span
              >`
            : ""}
        </span>

        <span class="flex shrink-0 items-center gap-2.5">
          <span class="flex items-center gap-1">
            <span class="mdi mdi-arrow-up text-[13px] text-[#ff6600]"></span>
            <span class="font-semibold text-white/55">${score}</span>
          </span>

          ${why.length
            ? html`<button
                type="button"
                data-why
                aria-label="Why this story?"
                title="Why this story?"
                class="ripple-container flex h-6 w-6 items-center justify-center rounded-full transition-colors active:scale-90"
              >
                <span class="mdi mdi-information-outline text-[14px]"></span>
              </button>`
            : ""}
        </span>
      </div>

      <h2
        data-story-title
        class="mt-2.5 line-clamp-3 text-[17px] font-semibold leading-[1.28] tracking-[-0.02em] ${read
          ? "text-white/55"
          : "text-white"}"
      >
        ${escapeHTML(post.title)}
      </h2>

      ${post.description
        ? html`
            <p
              class="mt-2 line-clamp-3 break-words text-[12px] leading-[1.45] ${read
                ? "text-white/25"
                : "text-white/40"}"
            >
              ${escapeHTML(post.description)}
            </p>
          `
        : ""}

      ${why.length
        ? html`
            <div
              data-why-panel
              class="mt-3 hidden rounded-[14px] border border-white/10 bg-[#2c2c2e]/60 p-3"
            >
              <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ff6600]">
                <span class="mdi mdi-lightbulb-on-outline text-[13px]"></span>
                Why this story?
              </div>
              <ul class="mt-2 space-y-1.5">
                ${why.map((reason) =>
                  html`<li class="flex items-start gap-2 text-[12px] leading-relaxed text-white/65">
                    <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#ff6600]"></span>
                    <span>${escapeHTML(reason)}</span>
                  </li>`.split("\n").map((l) => l.trim()).filter(Boolean).join(" "), // keeps the mapped html compact
                ).join("")}
              </ul>
            </div>
          `
        : ""}

      <!-- Actions -->
      <div class="mt-4">
        <a
          id="postLink"
          data-url="${escapeHTML(post.url)}"
          data-postid="${escapeHTML(id)}"
          class="ripple-container flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#2c2c2e] text-[13px] font-semibold tracking-[-0.01em] text-white/90 transition-all active:scale-[0.98]"
        >
          Read Article
          <span
            class="mdi mdi-arrow-top-right text-[17px] text-white/50"
          ></span>
        </a>

        <div class="mt-2 grid grid-cols-4 gap-2">
          <button
            type="button"
            data-saveid="${escapeHTML(id)}"
            class="ripple-container flex h-10 items-center justify-center rounded-full transition-all active:scale-95 ${saved
              ? "bg-white text-black"
              : "bg-[#2c2c2e] text-white/65"}"
            aria-label="${saved ? "Remove from saved" : "Save for later"}"
            title="${saved ? "Remove from saved" : "Save for later"}"
          >
            <span
              class="mdi ${saved
                ? "mdi-bookmark"
                : "mdi-bookmark-outline"} text-[17px]"
            ></span>
          </button>

          <button
            type="button"
            data-comments="${escapeHTML(id)}"
            class="ripple-container relative flex h-10 items-center justify-center rounded-full bg-[#2c2c2e] text-white/65 transition-all active:scale-95"
            aria-label="Open comments"
            title="Open comments"
          >
            <span class="mdi mdi-comment-outline text-[17px]"></span>
            ${commentCount > 0
              ? html`<span
                  class="absolute right-1 top-1 min-w-[16px] rounded-full bg-[#ff6600] px-1 text-center text-[8px] font-bold leading-[16px] text-white"
                  >${commentCount > 99 ? "99+" : commentCount}</span
                >`
              : ""}
          </button>

          <button
            type="button"
            data-share="${escapeHTML(id)}"
            class="ripple-container flex h-10 items-center justify-center rounded-full bg-[#2c2c2e] text-white/65 transition-all active:scale-95"
            aria-label="Share post"
            title="Share post"
          >
            <span class="mdi mdi-share-variant text-[17px]"></span>
          </button>

          <button
            type="button"
            data-hide="${escapeHTML(id)}"
            class="ripple-container flex h-10 items-center justify-center rounded-full bg-[#2c2c2e] text-white/65 transition-all active:scale-95"
            aria-label="Hide post"
            title="Hide post"
          >
            <span class="mdi mdi-eye-off-outline text-[17px]"></span>
          </button>
        </div>
      </div>
    </article>
  `;
};
