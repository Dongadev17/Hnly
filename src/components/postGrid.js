const EmptyState = (icon, title) =>
  html`<div
    class="flex flex-col items-center justify-center px-6 pt-72 text-center"
  >
    <div
      class="flex h-14 w-14 items-center justify-center rounded-full bg-[#1c1c1e]"
    >
      <span class="mdi ${icon} text-[26px] text-white/40"></span>
    </div>
    <p class="mt-4 text-[15px] font-medium text-white/70">${title}</p>
  </div>`;

const PostSkeletonGrid = (count = 7) =>
  html`<div
    class="p-1 grid lg:grid-cols-3 gap-3"
  >
    ${Array.from({ length: count }, (_, index) => PostCardSkeleton()).join(
      "",
    )}
  </div>`;

const SavedPostGrid = (posts) =>
  posts.length
    ? html`<div
        data-saved-grid
        class="p-1.5 columns columns-1 md:columns-2 lg:columns-3 xl:columns-4 space-y-3 gap-x-3"
      >
        ${posts.map(PostCard).join("")}
      </div>`
    : EmptyState("mdi-bookmark-remove-outline", "No posts saved");

const PostGrid = () =>
  html`${LOADING
    ? PostSkeletonGrid()
    : POSTS.length
      ? html`<div
          class="columns columns-1 md:columns-2 lg:columns-3 xl:columns-4 space-y-3 gap-x-3"
        >
          ${POSTS.map(PostCard).join("")}
        </div>`
      : EmptyState("mdi-newspaper-variant-outline", "No stories found")}`;
