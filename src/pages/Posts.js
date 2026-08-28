const Posts = (params, el) => {
  const savedPosts = getSavedPosts();

  // Delegated listener: survives the router's async page injection, binds once.
  afterPageLoad(() => {
    el.addEventListener("click", async (e) => {
      const button = e.target.closest("[data-saved-grid] [data-saveid]");

      if (!button) return;

      e.preventDefault();
      e.stopPropagation();

      const postId = button.dataset.saveid;

      // Read fresh from storage — not from a render-time snapshot
      const post = getSavedPosts().find((item) => String(item.id) === String(postId));

      if (!post) {
        console.warn("Post not found:", postId);
        return;
      }

      toggleSavePost(post);

      const card = button.closest("article");

      if (!card) return;

      button.disabled = true;

      card.style.overflow = "hidden";

      try {
        await card.animate(
          [
            {
              height: `${card.offsetHeight}px`,
              opacity: 1,
              transform: "scale(1)",
            },
            {
              height: `${card.offsetHeight}px`,
              opacity: 0,
              transform: "scale(0.92)",
              offset: 0.45,
            },
            {
              height: "0px",
              opacity: 0,
              transform: "scale(0.92)",
            },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            fill: "forwards",
          },
        ).finished;

        card.remove();

        if (!document.querySelector("#posts-container article")) {
          document.querySelector("#posts-container").innerHTML = EmptyState(
            "mdi-bookmark-remove-outline",
            "No posts saved",
          );
        }
      } catch {}
    });
  });

  return html`
    <div class="min-h-screen">
      <!-- Navbar -->
      ${Navbar(PostsNav)}

      <!-- Posts -->
      <div id="posts-container">${SavedPostGrid(savedPosts)}</div>
      <br />
    </div>
  `;
};
