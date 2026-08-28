// Numeric, left-to-right version compare: "1.0" vs "1.0.0" is treated as equal.
const compareVersions = (a, b) => {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }

  return 0;
};

const openExternalLink = (url) => {
  if (!url) {
    Toast.show("Link coming soon");
    return;
  }

  if (window.Android && Android.openInAppBrowser) {
    Android.openInAppBrowser(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const checkForUpdates = async (button) => {
  const icon = button.querySelector(".update-icon");

  button.disabled = true;
  icon.classList.replace("mdi-chevron-right", "mdi-loading");
  icon.classList.add("mdi-spin");

  try {
    const res = await fetch("version.json", { cache: "no-store" });
    if (!res.ok) throw new Error("update endpoint unavailable");

    const { version } = await res.json();
    const latest = String(version || "").trim();
    if (!latest) throw new Error("invalid version payload");

    if (compareVersions(latest, APP_INFO.version) > 0) {
      Toast.show(`New version available: v${latest}`);
    } else {
      Toast.show("You're on the latest version");
    }
  } catch {
    Toast.show("Couldn't check for updates");
  } finally {
    button.disabled = false;
    icon.classList.replace("mdi-loading", "mdi-chevron-right");
    icon.classList.remove("mdi-spin");
  }
};

const copyWallet = async () => {
  try {
    if (window.Android) {
      await Android.copyText(APP_INFO.solanaWallet, APP_INFO.solanaWallet);
    } else {
      await navigator.clipboard.writeText(APP_INFO.solanaWallet);
    }

    Toast.show("Solana address copied");
  } catch {
    Toast.show("Couldn't copy — long-press to copy");
  }
};

const About = (params, el) => {
  afterPageLoad(() => {
    el.addEventListener("click", (e) => {
      const copyBtn = e.target.closest("#copyWalletBtn");
      if (copyBtn) {
        e.preventDefault();
        e.stopPropagation();
        copyWallet();
        return;
      }

      const updateBtn = e.target.closest("#updateBtn");
      if (updateBtn) {
        e.preventDefault();
        e.stopPropagation();
        checkForUpdates(updateBtn);
        return;
      }

      const feedbackBtn = e.target.closest("#feedbackBtn");
      if (feedbackBtn) {
        e.preventDefault();
        e.stopPropagation();
        openExternalLink(APP_INFO.feedbackUrl);
        return;
      }

      const koFiBtn = e.target.closest("#koFiBtn");
      if (koFiBtn) {
        e.preventDefault();
        e.stopPropagation();
        openExternalLink(APP_INFO.koFiUrl);
      }
    });
  });

  return html`
    <div class="min-h-screen">
      <!-- Navbar -->
      ${Navbar(AboutNav)}

      <!-- App hero -->
      <div class="flex flex-col items-start px-6 pt-8 text-center">
        <h2 class="mt-3.5 text-[22px] font-bold tracking-[-0.03em] text-white">
          ${APP_INFO.name}
        </h2>

        <p
          class="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-white/45"
        >
          ${APP_INFO.tagline}
        </p>
      </div>

      <main class="px-3 pb-10 pt-8">
        <!-- Section: App -->
        <h3
          class="px-4 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/35"
        >
          App
        </h3>

        <section
          class="divide-y divide-white/10 overflow-hidden rounded-[18px] bg-[#1c1c1e] shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        >
          <button
            type="button"
            id="updateBtn"
            class="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#ff6600]"
            >
              <span
                class="mdi mdi-cloud-download-outline text-[16px] text-white"
              ></span>
            </span>

            <span class="flex-1 text-[15px] font-medium text-white">
              Check for updates
            </span>

            <span
              class="update-icon mdi mdi-chevron-right shrink-0 text-[18px] text-white/30"
            ></span>
          </button>

          <button
            type="button"
            id="feedbackBtn"
            class="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#3478f6]"
            >
              <span
                class="mdi mdi-message-text-outline text-[16px] text-white"
              ></span>
            </span>

            <span class="flex-1 text-[15px] font-medium text-white">
              Send feedback
            </span>

            <span
              class="mdi mdi-chevron-right shrink-0 text-[18px] text-white/30"
            ></span>
          </button>

          <div class="flex min-h-[48px] items-center gap-3 px-4 py-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#2c2c2e]"
            >
              <span
                class="mdi mdi-information-outline text-[16px] text-white/60"
              ></span>
            </span>

            <span class="flex-1 text-[15px] font-medium text-white">
              Version
            </span>

            <span class="text-[15px] text-white/40">
              v${APP_INFO.version}
            </span>
          </div>

          <div class="flex min-h-[48px] items-center gap-3 px-4 py-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#2c2c2e]"
            >
              <span
                class="mdi mdi-shield-check-outline text-[16px] text-white/60"
              ></span>
            </span>

            <span class="flex-1 text-[15px] font-medium text-white">
              Privacy
            </span>

            <span class="text-[15px] text-white/40">No tracking</span>
          </div>
        </section>

        <!-- Section: Donate -->
        <h3
          class="px-4 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/35"
        >
          Donate
        </h3>

        <section
          class="overflow-hidden rounded-[18px] bg-[#1c1c1e] shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        >
          <div class="px-4 py-4">
            <div class="flex items-center gap-2">
              <span class="mdi mdi-heart text-[18px] text-[#ff6600]"></span>
              <h4 class="text-[13px] font-semibold text-white">
                Support development
              </h4>
            </div>

            <p class="mt-2 text-[13px] leading-relaxed text-white/55">
              ${APP_INFO.name} is free and has no ads. If you enjoy it, you can
              support development via Ko-fi or the Solana network.
            </p>

            <button
              type="button"
              id="koFiBtn"
              class="ripple-container mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#212121] text-sm font-semibold text-white transition-all active:scale-[0.98]"
            >
              <span class="mdi mdi-coffee-outline text-lg text-[#ff6600]"></span>
              Support me on Ko-fi
            </button>

            <div class="mt-4 flex items-center gap-3">
              <span class="h-px flex-1 bg-white/10"></span>
              <span
                class="text-[11px] uppercase tracking-[0.08em] text-white/30"
                >or</span
              >
              <span class="h-px flex-1 bg-white/10"></span>
            </div>

            <div
              class="mt-4 flex items-center justify-between gap-3 rounded-full bg-[#2c2c2e] py-2 pl-4 pr-2"
            >
              <code
                class="!select-all min-w-0 flex-1 truncate text-[11px] tracking-tight text-white/70"
              >
                ${APP_INFO.solanaWallet}
              </code>

              <button
                type="button"
                id="copyWalletBtn"
                class="ripple-container flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[12px] font-semibold text-black transition-all active:scale-95"
              >
                <span class="mdi mdi-content-copy text-[14px]"></span>
                Copy
              </button>
            </div>

            <p class="mt-2.5 flex items-start gap-2 text-[11px] text-white/30">
              <span class="mdi mdi-information-outline text-lg"></span>
              <span
                >Solana (SOL) only — double-check the address before
                sending</span
              >
            </p>
          </div>
        </section>

        <p
          class="px-4 pb-2 pt-6 text-center text-[11px] text-white/25"
        >
          © ${new Date().getFullYear()} ${APP_INFO.name}. All rights reserved.
        </p>
      </main>
      <br />
    </div>
  `;
};
