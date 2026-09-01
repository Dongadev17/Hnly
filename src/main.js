const APP_INFO = {
  name: "Hnly",
  version: window?.Android ? Android.getAppVersion() : "1.0.5", //Android.version : "1.0.0",
  tagline: "Your daily dose of tech stories",
  // Replace with your real Solana wallet address
  solanaWallet: "3dAhZLRCc25nGetgiQDH3DmigTzgiL3Sf5frtPkhAvLZ",
  // TODO: Replace with the real APK / GitHub release download URL
  downloadUrl:
    "https://github.com/Dongadev17/Hnly/releases/download/v1.0.4/Hnly.apk",
  // TODO: Replace with the real GitHub Issues URL (or another feedback link)
  feedbackUrl: "https://github.com/Dongadev17/Hnly/issues/1",
};

let POSTS = [];
let LOADING = true;
// The story being viewed in the Comments page (set from Home/Search).
let SELECTED_POST = null;

const r = new Router("#app", {
  onSecondDataRouteClick: () => {},
});
const { afterPageLoad } = utils();

r.add("home", Home, { cache: false })
  .add("posts", Posts, { cache: false })
  .add("comments", Comments, { cache: false })
  .add("search", Search, { cache: false })
  .add("about", About, { cache: true })
  .add("stats", Stats, { cache: false })
  .add("privacy", Privacy, { cache: true })
  .add("terms", Terms, { cache: true })
  .start("home");

// Register the service worker (app-shell + asset caching) for offline support.
// Guarded so it degrades cleanly in insecure/non-supporting contexts.
if ("serviceWorker" in navigator) {
  try {
    const swUrl = "sw.js";
    if (window.isSecureContext || window.location.hostname === "localhost") {
      (async () => {
        try {
          const reg = await navigator.serviceWorker.register(swUrl);
          console.log("[SW] registered", reg.scope);
        } catch (err) {
          console.warn("[SW] registration failed:", err);
        }
      })();
    }
  } catch {
    // non-browser / WebView without SW — ignore
  }
}
