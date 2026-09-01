const DOWNLOAD_BANNER_KEY = "hnly_download_banner_seen";

// Returns the banner markup, or "" when it should not be shown this session.
const getDownloadBanner = () => {
  if (window.Android) return "";

  try {
    if (sessionStorage.getItem(DOWNLOAD_BANNER_KEY)) return "";
  } catch {}

  return DownloadBanner();
};

const DownloadBanner = () => html`
  <div
    id="downloadBanner"
    class="mx-3 mt-0.5 hidden sticky top-16 z-50"
    role="complementary"
    aria-label="Download the ${APP_INFO.name} app"
  >
    <button
      type="button"
      data-download
      class="ripple-container flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-white/10 p-2 pr-2 pl-2.5 text-left backdrop-blur-md transition-transform active:scale-[0.98]"
    >
      <img
        src="assets/logo.png"
        alt="${APP_INFO.name} icon"
        class="h-11 w-11 shrink-0 rounded-[12px]"
      />

      <div class="min-w-0 flex-1">
        <p
          class="truncate text-[13px] font-semibold tracking-[-0.02em] text-white"
        >
          ${APP_INFO.name}
        </p>
        <p class="truncate text-[11px] text-white/45">
          Faster, ad-free &amp; offline
        </p>
      </div>

      <span
        class="flex shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-black"
      >
        <span class="mdi mdi-download text-[13px]"></span>
        Download
      </span>
    </button>
  </div>
`;

// Apple-style springy drop-in: slides from above with a soft settle + fade.
const animateDownloadBanner = (el) => {
  if (!el) return;

  el.classList.remove("hidden");

  el.animate(
    [
      { opacity: 0, transform: "translateY(-18px) scale(0.98)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    {
      duration: 650,
      delay: 150,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "backwards",
    },
  );
};

const bindDownloadBanner = (el) => {
  const button = el?.querySelector("[data-download]");
  if (!button) return;

  button.addEventListener("click", () => {
    if (!APP_INFO.downloadUrl) {
      Toast.show("Download link coming soon");
      return;
    }

    window.open(APP_INFO.downloadUrl, "_blank", "noopener,noreferrer");
  });
};