const Home = (params, el) => {
  const Page = html`
    <div class="min-h-screen">
      <!-- Navbar -->
      ${Navbar(HomeNav)}

      <!-- Download the app banner (web visitors only, once per session) -->
      ${getDownloadBanner()}

      <!-- Content -->
      <main class="px-3 pb-8 pt-2">
        <div id="posts-container">${PostGrid()}</div>
      </main>
      <br />
    </div>
  `;

  afterPageLoad(async () => {
    const container = el.querySelector("#posts-container");
    const refreshBtn = el.querySelector("#refreshBtn");
    const refreshIcon = el.querySelector("#refreshIcon");

    // ------------------------------------------
    // Download banner (web visitors only)
    // ------------------------------------------

    const banner = el.querySelector("#downloadBanner");

    if (banner) {
      animateDownloadBanner(banner);
      bindDownloadBanner(banner);

      try {
        sessionStorage.setItem(DOWNLOAD_BANNER_KEY, "1");
      } catch {}
    }

    // ------------------------------------------
    // Render posts
    // ------------------------------------------

    const renderPosts = () => {
      container.innerHTML = PostGrid();
      animateCardsIn();
    };

    // Staggered entrance for post cards (home page only). Only the first
    // viewport-worthy batch animates; the rest appear instantly to avoid
    // spawning one Web Animations layer per card below the fold.
    const animateCardsIn = () => {
      const MAX_ANIMATED = 18;

      container.querySelectorAll("article").forEach((card, i) => {
        if (i >= MAX_ANIMATED) return;

        card.animate(
          [
            { opacity: 0, transform: "translateY(18px) scale(0.98)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          {
            duration: 380,
            delay: Math.min(i * 30, 420),
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards",
          },
        );
      });
    };

    // ------------------------------------------
    // Post events (single delegated listener)
    // The container survives every innerHTML swap, so this binds once and
    // drives all current & future cards without per-card listeners.
    // ------------------------------------------

    container.addEventListener("click", (e) => {
      const saveBtn = e.target.closest("[data-saveid]");

      if (saveBtn) {
        e.preventDefault();
        e.stopPropagation();

        const postId = saveBtn.dataset.saveid;
        const post = POSTS.find((item) => String(item.id) === String(postId));

        if (!post) {
          console.warn("Post not found:", postId);
          return;
        }

        const saved = toggleSavePost(post);

        // Update only this button
        saveBtn.classList.toggle("bg-white", saved);
        saveBtn.classList.toggle("text-black", saved);
        saveBtn.classList.toggle("bg-[#2c2c2e]", !saved);
        saveBtn.classList.toggle("text-white/65", !saved);

        const icon = saveBtn.querySelector(".mdi");

        if (icon) {
          icon.classList.toggle("mdi-bookmark", saved);
          icon.classList.toggle("mdi-bookmark-outline", !saved);
        }

        saveBtn.setAttribute(
          "aria-label",
          saved ? "Remove from saved" : "Save for later",
        );

        saveBtn.setAttribute(
          "title",
          saved ? "Remove from saved" : "Save for later",
        );

        Toast.show(saved ? "Post saved!" : "Post removed!");
        return;
      }

      const link = e.target.closest("[data-url]");

      if (link) {
        e.preventDefault();

        const url = link.dataset.url;

        if (!url) return;

        setTimeout(() => {
          if (typeof Android !== "undefined" && Android.openInBrowser) {
            Android.openInAppBrowser(url);
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }, 250);
      }
    });

    // ------------------------------------------
    // Refresh
    // ------------------------------------------

    refreshBtn.addEventListener("click", async () => {
      if (LOADING) return;

      LOADING = true;
      refreshBtn.setAttribute("disabled", LOADING);
      refreshIcon.classList.add("mdi-spin");

      try {
        container.innerHTML = PostGrid();

        POSTS = await getDailyHackerNews(100, {
          forceRefresh: true,
        });

        if (POSTS && POSTS.length) {
          localStorage.removeItem("daily_hacker_news");
        }

        LOADING = false;

        renderPosts();
      } catch (error) {
        LOADING = false;

        console.error("[Home] Refresh failed:", error);

        container.innerHTML = html`
          <div
            class="flex flex-col items-center justify-center px-6 py-20 text-center"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full bg-[#1c1c1e]"
            >
              <span
                class="mdi mdi-alert-circle-outline text-[22px] text-white/40"
              ></span>
            </div>

            <h2 class="mt-4 text-[15px] font-semibold text-white">
              Couldn't refresh
            </h2>

            <p
              class="mt-1 max-w-[260px] text-[12px] leading-relaxed text-white/35"
            >
              Check your connection and try again.
            </p>

            <button
              id="retryBtn"
              class="ripple-container mt-4 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black active:scale-95"
            >
              Try Again
            </button>
          </div>
        `;

        container
          .querySelector("#retryBtn")
          ?.addEventListener("click", () => refreshBtn.click());
      } finally {
        refreshIcon.classList.remove("mdi-spin");
        refreshBtn.setAttribute("disabled", LOADING);
      }
    });

    // ------------------------------------------
    // Initial load
    // ------------------------------------------

    try {
      POSTS = await getDailyHackerNews(100);
      LOADING = false;

      renderPosts();
    } catch (error) {
      LOADING = false;

      console.error("[Home] Failed to load posts:", error);

      container.innerHTML = html`
        <div
          class="flex flex-col items-center justify-center px-6 py-20 text-center"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-[#1c1c1e]"
          >
            <span class="mdi mdi-wifi-off text-[21px] text-white/40"></span>
          </div>

          <h2 class="mt-4 text-[15px] font-semibold text-white">
            Unable to load news
          </h2>

          <p
            class="mt-1 max-w-[260px] text-[12px] leading-relaxed text-white/35"
          >
            We couldn't retrieve today's Hacker News stories.
          </p>

          <button
            id="retryBtn"
            class="ripple-container mt-4 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black active:scale-95"
          >
            Try Again
          </button>
        </div>
      `;

      container
        .querySelector("#retryBtn")
        ?.addEventListener("click", () => refreshBtn.click());
    }
  });

  return Page;
};
