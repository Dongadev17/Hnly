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

const PostCard = (post) => {
  const saved = isPostSaved(post.id);

  const score = Number(post.score ?? 0);

  const timeAgo = post.time
    ? (() => {
        const diff = Math.max(0, Date.now() - post.time * 1000);
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        return `${days}d ago`;
      })()
    : "";

  return html`
    <article
      class="shrink-0 break-inside-avoid rounded-[24px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
    >
      <div class="flex items-center justify-between text-[11px] text-white/35">
        ${timeAgo ? html`<span>${timeAgo}</span>` : html`<span></span>`}

        <span class="flex items-center gap-1">
          <span class="mdi mdi-arrow-up text-[13px] text-[#ff6600]"></span>
          <span class="font-semibold text-white/55">${score}</span>
        </span>
      </div>

      <h2
        class="mt-2.5 line-clamp-3 text-[17px] font-semibold leading-[1.28] tracking-[-0.02em] text-white"
      >
        ${post.title}
      </h2>

      ${post.description
        ? html`
            <p
              class="mt-2 line-clamp-3 break-words text-[12px] leading-[1.45] text-white/40"
            >
              ${post.description}
            </p>
          `
        : ""}

      <!-- Actions -->
      <div class="mt-4 flex items-center gap-2">
        <button
          type="button"
          id="savePostBtn"
          data-saveid="${post.id}"
          class="ripple-container flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${saved
            ? "bg-white text-black"
            : "bg-[#2c2c2e] text-white/65"}"
          aria-label="${saved ? "Remove from saved" : "Save for later"}"
          title="${saved ? "Remove from saved" : "Save for later"}"
        >
          <span
            class="mdi ${saved
              ? "mdi-bookmark"
              : "mdi-bookmark-outline"} text-[18px]"
          ></span>
        </button>

        <a
          id="postLink"
          data-url="${post.url}"
          class="ripple-container flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#2c2c2e] text-[13px] font-semibold tracking-[-0.01em] text-white/90 transition-all active:scale-[0.98]"
        >
          Read Article
          <span
            class="mdi mdi-arrow-top-right text-[17px] text-white/50"
          ></span>
        </a>
      </div>
    </article>
  `;
};
