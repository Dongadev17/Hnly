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
      const updateSheet = new BottomSheet({
        content: html`
          <div class="pb-4 pt-2 text-center">
            <img
              src="assets/logo.png"
              alt="${APP_INFO.name}"
              class="mx-auto h-[76px] w-[76px] rounded-[22px] shadow-[0_10px_28px_rgba(0,0,0,0.5)]"
            />

            <div
              class="mt-3.5 inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/50"
            >
              <span
                class="mdi mdi-shield-check-outline text-[12px] text-[#ff6600]"
              ></span>
              v${latest}
            </div>

            <h2
              class="mt-3 text-[22px] font-bold uppercase tracking-[-0.026em] text-white"
            >
              Update available
            </h2>

            <p
              class="mx-auto mt-1.5 max-w-[300px] text-[15px] leading-relaxed text-white/55"
            >
              A fresh version of ${APP_INFO.name} is ready. Smoother, faster,
              and better than ever.
            </p>

            <div class="mt-6 grid gap-2.5">
              <button
                id="updateBtn"
                class="ripple-container flex h-[50px] items-center justify-center gap-2 rounded-full bg-[#ff6600] text-[16px] font-semibold text-white shadow-[0_8px_22px_rgba(255,102,0,0.35)] transition-all active:scale-[0.97]"
              >
                <span class="mdi mdi-download text-[18px]"></span>
                Update now
              </button>
              <button
                id="laterBtn"
                class="ripple-container flex h-[50px] items-center justify-center rounded-full bg-[#2c2c2e] text-[16px] font-semibold text-white/90 transition-all active:scale-[0.97]"
              >
                Later
              </button>
            </div>
          </div>
        `,
      });

      setTimeout(() => {
        updateSheet.show().then((sh) => {
          const updateBtn = sh.querySelector("#updateBtn");
          const laterBtn = sh.querySelector("#laterBtn");

          laterBtn.addEventListener("click", () => {
            updateSheet.dismiss();
          });

          updateBtn.addEventListener("click", () => {
            updateSheet.dismiss().then(() => {
              setTimeout(() => {
                if (window.Android) {
                  openExternalLink(APP_INFO.downloadUrl);
                }
              }, 250);
            });
          });
        });
      }, 1500);
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
      }
    });
  });

  return html`
    <div class="min-h-screen">
      <!-- Navbar -->
      ${Navbar(AboutNav)}

      <main class="px-3 pb-10 pt-5">
        <!-- Section: App -->
        <h3
          class="px-4 pb-1.5 pt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/35"
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

            <span class="flex-1 text-[15px] font-semibold text-white">
              Check for updates
            </span>

            <span
              class="update-icon mdi mdi-chevron-right shrink-0 text-[18px] text-white/30"
            ></span>
          </button>

          <button
            type="button"
            data-route="stats"
            class="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#3478f6]"
            >
              <span class="mdi mdi-chart-line text-[16px] text-white"></span>
            </span>

            <span class="flex-1 text-[15px] font-semibold text-white">
              Reading stats
            </span>

            <span
              class="mdi mdi-chevron-right shrink-0 text-[18px] text-white/30"
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

            <span class="flex-1 text-[15px] font-semibold text-white">
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

            <span class="flex-1 text-[15px] font-semibold text-white">
              Version
            </span>

            <span class="text-[15px] text-white/40">
              v${APP_INFO.version}
            </span>
          </div>
        </section>

        <!-- Section: Legal -->
        <h3
          class="px-4 pb-1.5 pt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/35"
        >
          Legal
        </h3>

        <section
          class="divide-y divide-white/10 overflow-hidden rounded-[18px] bg-[#1c1c1e] shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        >
          <button
            type="button"
            data-route="privacy"
            class="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#2c2c2e]"
            >
              <span
                class="mdi mdi-shield-lock-outline text-[16px] text-white/60"
              ></span>
            </span>

            <span class="flex-1 text-[15px] font-semibold text-white">
              Privacy Policy
            </span>

            <span
              class="mdi mdi-chevron-right shrink-0 text-[18px] text-white/30"
            ></span>
          </button>

          <button
            type="button"
            data-route="terms"
            class="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#2c2c2e]"
            >
              <span
                class="mdi mdi-file-document-outline text-[16px] text-white/60"
              ></span>
            </span>

            <span class="flex-1 text-[15px] font-semibold text-white">
              Terms &amp; Conditions
            </span>

            <span
              class="mdi mdi-chevron-right shrink-0 text-[18px] text-white/30"
            ></span>
          </button>
        </section>

        <!-- Section: Donate -->
        <h3
          class="px-4 pb-1.5 pt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/35"
        >
          Donate
        </h3>

        <section
          class="overflow-hidden rounded-[18px] bg-[#1c1c1e] shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        >
          <div class="px-4 py-4">
            <div class="flex items-center gap-2">
              <span class="mdi mdi-heart text-[18px] text-[#ff6600]"></span>
              <h4 class="text-[15px] font-semibold text-white">
                Support development
              </h4>
            </div>

            <p class="mt-2 text-[13px] leading-relaxed text-white/55">
              ${APP_INFO.name} is free and has no ads. If you enjoy it, you can
              support development via the Solana network.
            </p>

            <div
              class="mt-4 flex p-1 rounded-full pl-3.5 shadow-lg border-y border-[#222] bg-[#181818] items-center gap-3"
            >
              <code
                class="!select-all min-w-0 flex-1 truncate text-[11px] tracking-tight text-white/70"
              >
                ${APP_INFO.solanaWallet}
              </code>

              <button
                type="button"
                id="copyWalletBtn"
                class="ripple-container flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-black transition-all active:scale-95"
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
      </main>
    </div>
  `;
};
