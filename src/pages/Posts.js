const Posts = (params, el) => {
  const savedPosts = getSavedPosts();

  // Delegated listener: survives the router's async page injection, binds once.
  afterPageLoad(() => {
    el.addEventListener("click", async (e) => {
      const button = e.target.closest("[data-saved-grid] [data-saveid]");

      if (button) {
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
        return;
      }

      // Toolbar on saved cards: read, comments, share, hide.
      const link = e.target.closest("[data-saved-grid] [data-url]");
      if (link) {
        e.preventDefault();
        const url = link.dataset.url;
        if (!url) return;
        if (link.dataset.postid) {
          const saved = getSavedPosts().find(
            (item) => String(item.id) === String(link.dataset.postid),
          );
          markPostRead(link.dataset.postid, saved || null);
        }
        setTimeout(() => {
          if (typeof Android !== "undefined" && Android.openInBrowser) {
            Android.openInAppBrowser(url);
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }, 250);
        return;
      }

      const commentsBtn = e.target.closest("[data-saved-grid] [data-comments]");
      if (commentsBtn) {
        e.preventDefault();
        e.stopPropagation();
        const post = getSavedPosts().find(
          (item) => String(item.id) === String(commentsBtn.dataset.comments),
        );
        if (post) {
          markPostRead(post.id, post);
          SELECTED_POST = post;
          try {
            sessionStorage.setItem("hnly_selected_post", JSON.stringify(post));
          } catch {}
          window.location.hash = "#comments";
        }
        return;
      }

      const shareBtn = e.target.closest("[data-saved-grid] [data-share]");
      if (shareBtn) {
        e.preventDefault();
        e.stopPropagation();
        const post = getSavedPosts().find(
          (item) => String(item.id) === String(shareBtn.dataset.share),
        );
        if (!post) return;
        const text = `${post.title}\n${post.url}`;
        if (window.Android && Android.shareText) {
          try {
            Android.shareText(text);
          } catch {}
          return;
        }
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
        return;
      }

      const hideBtn = e.target.closest("[data-saved-grid] [data-hide]");
      if (hideBtn) {
        e.preventDefault();
        e.stopPropagation();
        const post = getSavedPosts().find(
          (item) => String(item.id) === String(hideBtn.dataset.hide),
        );
        if (post) hidePost(post);
        hideBtn.closest("article")?.remove();
      }
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
