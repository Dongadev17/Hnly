const TOPIC_LABELS = {
  all: "All",
  other: "Other",
  algeriaTech: "Algeria Tech",
  ai: "AI",
  programming: "Programming",
  security: "Security",
  hardware: "Hardware",
  startups: "Startups",
  science: "Science",
  web: "Web",
  openSource: "Open Source",
  databases: "Databases",
  crypto: "Crypto",
  society: "Society",
};
const TOPIC_ORDER = () => [
  "all",
  "algeriaTech",
  ...getTopics().filter((key) => key !== "algeriaTech"),
];

const renderTopicChips = (active) => html`
  <div
    data-topic-scroll
    class="scrollbar-hide flex gap-1.5 overflow-x-auto pb-2"
  >
    ${TOPIC_ORDER()
      .map(
        (key) => html`
          <button
            type="button"
            data-topic="${key}"
            class="shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors active:scale-95 ${key ===
            active
              ? "bg-white text-black font-semibold opacity-100"
              : "bg-[#2c2c2e] text-white/60 opacity-60 font-medium"}"
          >
            ${TOPIC_LABELS[key] ?? key}
          </button>
        `,
      )
      .join("")}
  </div>
`;

// Personalized re-ranking — pure render-time, local-only. The user picks up to
// 3 topics in a bottom sheet (hnly_personalize_topics) to see more of; those
// get a strong boost. Read/saved topics add a smaller boost and hidden topics
// a penalty. HN feed only (not Search or Algeria).
const HOME_PERSONALIZE_LABEL = "Personalize";
const PERSONALIZE_MAX = 3;
const PERSONALIZE_TOPIC_BOOST = 5;

// Active when the user has saved at least one "see more of" topic.
const getPersonalizePref = () => getPersonalizeTopics().length > 0;

// Baseline topic signals from saved / read / hidden history (does NOT include
// the explicit user picks — those are added separately by personalizePosts).
const topicAffinity = () => {
  const affinity = new Map(); // topic -> signed signal

  const savedPosts = getSavedPosts();
  savedPosts.forEach((post) => {
    if (post._topic) {
      affinity.set(post._topic, (affinity.get(post._topic) || 0) + 1);
    }
  });

  getReadEvents().forEach((ev) => {
    if (ev.topic) {
      affinity.set(ev.topic, (affinity.get(ev.topic) || 0) + 2);
    }
  });

  const hidden = safeStorage.get(HN_CONFIG.HIDDEN_POSTS_KEY) || [];
  hidden.forEach((entry) => {
    if (entry?.topic) {
      affinity.set(entry.topic, (affinity.get(entry.topic) || 0) - 4);
    }
  });

  return affinity;
};

const personalizePosts = (visible) => {
  const personalTopics = getPersonalizeTopics();
  if (!personalTopics.length) return visible;

  const affinity = topicAffinity();

  // Stable sort: same affinity keeps the editorial order.
  return [...visible]
    .map((post) => ({ post, aff: affinity.get(post._topic) || 0 }))
    .map((x) => {
      if (personalTopics.includes(x.post._topic)) {
        x.aff += PERSONALIZE_TOPIC_BOOST;
      }
      return x;
    })
    .sort((a, b) => b.aff - a.aff)
    .map((x) => x.post);
};

const Home = (params, el) => {
  const topicSearch = params.topic;
  const Page = html`
    <div class="min-h-screen">
      <!-- Navbar -->
      ${Navbar(HomeNav)}

      <!-- Download the app banner (web visitors only, once per session) -->
      ${getDownloadBanner()}

      <!-- Content -->
      <main class="px-3 pb-8 pt-4">
        <!-- Topic / feed chips -->
        <div id="filterBar">${renderTopicChips(topicSearch || "all")}</div>

        <!-- Personalize toggle (Home "All" feed only) -->
        <div
          id="personalizeWrap"
          class="overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style="${(topicSearch || "all") === "all"
            ? "max-height:60px;opacity:1;transform:translateY(0);pointer-events:auto"
            : "max-height:0;opacity:0;transform:translateY(-4px);pointer-events:none"}"
        >
          <button
            id="personalizeToggle"
            type="button"
            class="mb-1.5 flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-[12px] transition-colors active:scale-95 ${getPersonalizePref()
              ? "bg-white text-black font-semibold opacity-100"
              : "bg-[#2c2c2e] text-white/60 opacity-60 font-medium"}"
            aria-pressed="${getPersonalizePref() ? "true" : "false"}"
          >
            <span class="mdi mdi-tune-variant text-[13px]"></span>
            ${HOME_PERSONALIZE_LABEL}
          </button>
        </div>

        <div id="hiddenBar"></div>

        <div id="offlineBar" class="hidden"></div>

        <div id="posts-container" class="pt-1.5">${PostGrid()}</div>
      </main>
      <br />
    </div>
  `;

  afterPageLoad(async () => {
    const container = el.querySelector("#posts-container");
    const refreshBtn = el.querySelector("#refreshBtn");
    const refreshIcon = el.querySelector("#refreshIcon");
    const filterBar = el.querySelector("#filterBar");
    const personalizeToggle = el.querySelector("#personalizeToggle");
    const personalizeWrap = el.querySelector("#personalizeWrap");
    const hiddenBar = el.querySelector("#hiddenBar");
    
    if (!topicSearch) {
      r.navigateTo("home", { params: { topic: "all" }, forceReload: true });
    }

    let activeTopic = topicSearch || "all";
    let showingHidden = false;
    let algeriaTechPosts = [];
    let algeriaTechLoading = false;

    const shareStory = async (post) => {
      const text = `${post.title}\n\n${post.url}`;

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
        } catch {
          // user cancelled or unsupported — fall through
        }
      }

      try {
        await navigator.clipboard.writeText(text);
        Toast.show("Story copied — share it anywhere");
      } catch {
        Toast.show("Couldn't share this story");
      }
    };

    const findPost = (postId) =>
      POSTS.find((item) => String(item.id) === String(postId)) ||
      algeriaTechPosts.find((item) => String(item.id) === String(postId)) ||
      getSavedPosts().find((item) => String(item.id) === String(postId));

    const openStoryComments = (postId) => {
      const post = findPost(postId);

      if (!post) {
        console.warn("Post not found:", postId);
        Toast.show("Story not available");
        return;
      }

      markPostRead(postId, post);
      SELECTED_POST = post;

      try {
        sessionStorage.setItem("hnly_selected_post", JSON.stringify(post));
      } catch {}

      r.navigateTo("comments");
    };

    const renderHiddenBar = (count) => {
      if (!count) return "";
      return html` <div
        class="mb-2 flex items-center justify-between rounded-[14px] bg-[#1c1c1e] px-3 py-2"
      >
        <span class="text-[11px] text-white/40">
          ${count} hidden ${showingHidden ? "· showing" : ""}
        </span>
        <button
          id="showHiddenBtn"
          type="button"
          class="text-[12px] font-semibold text-[#ff6600]"
        >
          ${showingHidden ? "Restore" : "Show"}
        </button>
      </div>`;
    };

    // Offline banner — appears when the feed is served from a local snapshot.
    const offlineBar = el.querySelector("#offlineBar");
    const showOfflineBar = (snapshot) => {
      if (!offlineBar || !snapshot) return;
      const when = snapshot.timestamp
        ? timeAgo(Math.floor(snapshot.timestamp / 1000))
        : "";
      offlineBar.classList.remove("hidden");
      offlineBar.innerHTML = html`
        <div
          class="mt-1 mb-2 flex items-center gap-2 rounded-[14px] border border-white/10 bg-[#2c2c2e]/60 px-3 py-2"
        >
          <span class="mdi mdi-wifi-off text-[15px] text-[#ff6600]"></span>
          <span class="text-[11px] text-white/45">
            Offline · showing saved${when ? ` from ${when}` : ""}
          </span>
        </div>
      `;
    };

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
      const hid = getHiddenIdSet();

      let visible;
      if (activeTopic === "algeriaTech") {
        visible = algeriaTechPosts.filter((post) => !hid.has(String(post.id)));
      } else {
        visible = POSTS.filter((post) => {
          if (activeTopic !== "all" && post._topic !== activeTopic) {
            return false;
          }
          if (!showingHidden && hid.has(String(post.id))) return false;
          return true;
        });
        if (getPersonalizePref()) visible = personalizePosts(visible);
      }

      container.innerHTML = PostGrid(visible);
      filterBar.innerHTML = renderTopicChips(activeTopic);
      hiddenBar.innerHTML = renderHiddenBar(hid.size);
      animateCardsIn();
      centerActiveChip();
    };

    const loadAlgeriaTech = async () => {
      if (algeriaTechLoading) return;
      algeriaTechLoading = true;
      try {
        algeriaTechPosts = await getAlgeriaTechPosts();
        if (activeTopic === "algeriaTech") renderPosts();
        if (activeTopic === "algeriaTech") showAlgeriaNotice();
      } catch (error) {
        console.error("[Home] Failed to load Algeria Tech posts:", error);
        algeriaTechPosts = [];
        if (activeTopic === "algeriaTech") renderPosts();
      } finally {
        algeriaTechLoading = false;
      }
    };

    const ALGERIA_NOTICE_KEY = "hnly_algeria_notice";

    // Shows a one-time-only sheet reminding the user the Algeria Tech tab is
    // curated exclusively for local Algerians. Persists a flag so it never
    // reappears across sessions on the same device.
    const showAlgeriaNotice = () => {
      if (safeStorage.get(ALGERIA_NOTICE_KEY)) return;
      safeStorage.set(ALGERIA_NOTICE_KEY, "1");

      const sheet = new BottomSheet({
        content: html`
          <div class="px-2 pt-2 pb-6 text-center">
            <div
              class="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#ff6600]/10"
            >
              <span
                class="mdi mdi-flag-variant text-[30px] text-[#ff6600]"
              ></span>
            </div>

            <h2
              class="mt-3.5 text-[22px] font-bold uppercase tracking-[-0.026em] text-white"
            >
              Algeria-Only Tech Feed
            </h2>

            <p
              class="mx-auto mt-1.5 max-w-[300px] text-[15px] leading-relaxed text-white/55"
            >
              This tab is curated for local Algerians only, stories focused on
              Algeria's tech scene. News that isn't about Algeria won't appear
              here.
            </p>

            <div class="mt-6">
              <button
                id="algeriaNoticeOkBtn"
                class="ripple-container flex h-[50px] w-full items-center justify-center rounded-full bg-[#ff6600] text-[16px] font-semibold text-white shadow-[0_8px_22px_rgba(255,102,0,0.35)] transition-all active:scale-[0.97]"
              >
                I understand
              </button>
            </div>
          </div>
        `,
      });

      setTimeout(() => {
        sheet.show().then((sh) => {
          sh.querySelector("#algeriaNoticeOkBtn").addEventListener(
            "click",
            () => sheet.dismiss(),
          );
        });
      }, 400);
    };

    // Keeps the selected topic chip centered in the horizontal chip bar
    // after any re-render, so a far-right topic never lands out of view.
    const centerActiveChip = () => {
      const scroller = filterBar.querySelector("[data-topic-scroll]");
      const active = scroller?.querySelector(`[data-topic="${activeTopic}"]`);
      if (!scroller || !active) return;
      const offset =
        active.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left;
      scroller.scrollTo({
        left: Math.max(
          0,
          offset - (scroller.clientWidth - active.offsetWidth) / 2,
        ),
        behavior: "smooth",
      });
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
        const post = findPost(postId);

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

      const commentsBtn = e.target.closest("[data-comments]");

      if (commentsBtn) {
        e.preventDefault();
        e.stopPropagation();
        openStoryComments(commentsBtn.dataset.comments);
        return;
      }

      const shareBtn = e.target.closest("[data-share]");

      if (shareBtn) {
        e.preventDefault();
        e.stopPropagation();
        const post = findPost(shareBtn.dataset.share);
        if (post) shareStory(post);
        return;
      }

      const hideBtn = e.target.closest("[data-hide]");

      if (hideBtn) {
        e.preventDefault();
        e.stopPropagation();
        const post = findPost(hideBtn.dataset.hide);
        if (post) hidePost(post);
        renderPosts();
        return;
      }

      const whyBtn = e.target.closest("[data-why]");

      if (whyBtn) {
        e.preventDefault();
        e.stopPropagation();
        const panel = whyBtn
          .closest("article")
          ?.querySelector("[data-why-panel]");
        if (panel) panel.classList.toggle("hidden");
        return;
      }

      const link = e.target.closest("[data-url]");

      if (link) {
        e.preventDefault();

        const url = link.dataset.url;
        const postId = link.dataset.postid;

        if (!url) return;

        if (postId) {
          markPostRead(postId, findPost(postId));

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

    filterBar.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-topic]");
      if (!chip) return;
      activeTopic = chip.dataset.topic;
      syncPersonalizeVisibility();
      history.pushState(
        null,
        "",
        `#home?topic=${encodeURIComponent(activeTopic)}`,
      );
      if (activeTopic === "algeriaTech") {
        loadAlgeriaTech();
      } else {
        renderPosts();
      }
    });

    personalizeToggle.addEventListener("click", () => {
      openPersonalizeSheet();
    });

    // Hnly personalizes the "All" feed only, so the button only makes sense
    // when the "All" topic chip is active. Animate it away for other topics.
    const syncPersonalizeVisibility = () => {
      const show = activeTopic === "all";
      const wrapped = () => {
        personalizeWrap.style.maxHeight = "0px";
        personalizeWrap.style.opacity = "0";
        personalizeWrap.style.transform = "translateY(-4px)";
        personalizeWrap.style.pointerEvents = "none";
      };
      const shown = () => {
        personalizeWrap.style.maxHeight = "60px";
        personalizeWrap.style.opacity = "1";
        personalizeWrap.style.transform = "translateY(0)";
        personalizeWrap.style.pointerEvents = "auto";
      };
      if (show) shown();
      else wrapped();
    };
    syncPersonalizeVisibility();

    // Reflects the saved "see more of" topics onto the pill's active styling.
    const syncPersonalizePill = () => {
      const on = getPersonalizePref();
      personalizeToggle.setAttribute("aria-pressed", on ? "true" : "false");
      personalizeToggle.classList.toggle("bg-white", on);
      personalizeToggle.classList.toggle("text-black", on);
      personalizeToggle.classList.toggle("font-semibold", on);
      personalizeToggle.classList.toggle("opacity-100", on);
      personalizeToggle.classList.toggle("bg-[#2c2c2e]", !on);
      personalizeToggle.classList.toggle("text-white/60", !on);
      personalizeToggle.classList.toggle("opacity-60", !on);
    };

    // Bottom sheet: pick up to PERSONALIZE_MAX topics to see more of, then Save.
    const openPersonalizeSheet = () => {
      let selected = [...getPersonalizeTopics()];
      const topicsOrdered = getTopics();

      const topicChip = (key) => {
        const active = selected.includes(key);
        return html`
          <button
            type="button"
            data-personalize-topic="${key}"
            class="ripple-container shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors active:scale-95 ${active
              ? "bg-white text-black font-semibold opacity-100"
              : "bg-[#2c2c2e] text-white/60 opacity-60 font-medium"}"
            aria-pressed="${active ? "true" : "false"}"
          >
            ${TOPIC_LABELS[key] ?? key}
          </button>
        `;
      };

      const renderChips = () =>
        topicsOrdered.map(topicChip).join("");

      const sheet = new BottomSheet({
        content: html`
          <div class="px-2 pt-2 pb-6">
            <h2
              class="text-[22px] font-bold tracking-[-0.026em] text-white"
            >
              Personalize
            </h2>
            <p class="mt-1 text-[13px] text-white/55">
              Pick up to ${PERSONALIZE_MAX} topics to see more of in your feed.
            </p>

            <div
              data-personalize-count
              class="mt-3 text-[12px] font-medium text-white/40"
            >
              ${selected.length}/${PERSONALIZE_MAX} selected
            </div>

            <div data-personalize-chips class="mt-2.5 flex flex-wrap gap-2">
              ${renderChips()}
            </div>

            <div class="mt-6">
              <button
                id="personalizeSaveBtn"
                class="ripple-container flex h-[50px] w-full items-center justify-center rounded-full bg-[#ff6600] text-[16px] font-semibold text-white shadow-[0_8px_22px_rgba(255,102,0,0.35)] transition-all active:scale-[0.97]"
              >
                Save
              </button>
              <button
                id="personalizeCancelBtn"
                class="ripple-container mt-2.5 flex h-[50px] w-full items-center justify-center rounded-full bg-[#2c2c2e] text-[16px] font-semibold text-white/90 transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
            </div>
          </div>
        `,
      });

      setTimeout(() => {
        sheet.show().then((sh) => {
          const chipsBox = sh.querySelector("[data-personalize-chips]");
          const countBox = sh.querySelector("[data-personalize-count]");

          const rerender = () => {
            chipsBox.innerHTML = renderChips();
            countBox.textContent =
              `${selected.length}/${PERSONALIZE_MAX} selected`;
          };

          chipsBox.addEventListener("click", (e) => {
            const chip = e.target.closest("[data-personalize-topic]");
            if (!chip) return;
            const key = chip.dataset.personalizeTopic;
            const idx = selected.indexOf(key);
            if (idx !== -1) {
              selected.splice(idx, 1);
            } else {
              if (selected.length >= PERSONALIZE_MAX) {
                Toast.show(`Pick up to ${PERSONALIZE_MAX} topics`);
                return;
              }
              selected.push(key);
            }
            rerender();
          });

          sh.querySelector("#personalizeCancelBtn").addEventListener("click", () => {
            sheet.dismiss();
          });

          sh.querySelector("#personalizeSaveBtn").addEventListener("click", () => {
            safeStorage.set(HN_CONFIG.PERSONALIZE_TOPICS_KEY, selected);
            sheet.dismiss().then(() => {
              syncPersonalizePill();
              Toast.show(
                selected.length
                  ? "Personalized — more of your picks up top"
                  : "Personalization cleared",
              );
              if (activeTopic !== "algeriaTech") renderPosts();
            });
          });
        });
      }, 150);
    };

    hiddenBar.addEventListener("click", (e) => {
      if (!e.target.closest("#showHiddenBtn")) return;
      showingHidden = !showingHidden;
      renderPosts();
    });

    // ------------------------------------------
    // Refresh
    // ------------------------------------------

    refreshBtn.addEventListener("click", async () => {
      if (LOADING) return;

      LOADING = true;
      refreshIcon.classList.add("mdi-spin");

      try {
        container.innerHTML = PostGrid();

        if (activeTopic === "algeriaTech") {
          algeriaTechPosts = await getAlgeriaTechPosts({ forceRefresh: true });
        } else {
          POSTS = await getDailyHackerNews(320, {
            forceRefresh: true,
          });
        }

        LOADING = false;

        renderPosts();
      } catch (error) {
        LOADING = false;

        console.error("[Home] Refresh failed:", error);

        // Offline / network-failure fallback: show the last successful snapshot.
        const offline =
          activeTopic === "algeriaTech"
            ? safeStorage.get(HN_CONFIG.OFFLINE_ALGERIA_KEY)
            : safeStorage.get(HN_CONFIG.OFFLINE_FEED_KEY);
        if (offline && Array.isArray(offline.posts) && offline.posts.length > 0) {
          if (activeTopic === "algeriaTech") {
            algeriaTechPosts = offline.posts;
          } else {
            POSTS = offline.posts;
          }
          showOfflineBar(offline);
          renderPosts();
          return;
        }

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
              class="mt-1 max-w-[260px] text-[13px] leading-relaxed text-white/35"
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
      }
    });

    // ------------------------------------------
    // Initial load
    // ------------------------------------------

    try {
      if (activeTopic === "algeriaTech") {
        algeriaTechPosts = await getAlgeriaTechPosts();
        LOADING = false;
        renderPosts();
        showAlgeriaNotice();
      } else {
        POSTS = await getDailyHackerNews(320);
        LOADING = false;
        renderPosts();
      }
    } catch (error) {
      LOADING = false;

      console.error("[Home] Failed to load posts:", error);

      // Offline / network-failure fallback: show the last successful snapshot.
      const offline =
        activeTopic === "algeriaTech"
          ? safeStorage.get(HN_CONFIG.OFFLINE_ALGERIA_KEY)
          : safeStorage.get(HN_CONFIG.OFFLINE_FEED_KEY);
      if (
        offline &&
        Array.isArray(offline.posts) &&
        offline.posts.length > 0
      ) {
        if (activeTopic === "algeriaTech") {
          algeriaTechPosts = offline.posts;
          showAlgeriaNotice();
        } else {
          POSTS = offline.posts;
        }
        showOfflineBar(offline);
        renderPosts();
        return;
      }

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
            class="mt-1 max-w-[260px] text-[13px] leading-relaxed text-white/35"
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
