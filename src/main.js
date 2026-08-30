const APP_INFO = {
  name: "Hnly",
  version: window?.Android ? Android.getAppVersion() : "1.0.0", //Android.version : "1.0.0",
  tagline: "Your daily dose of tech stories",
  // Replace with your real Solana wallet address
  solanaWallet: "8nosMJPbhitDwzCirUDMeePLJy4jYTibT3A2wxAZhHXX",
  // TODO: Replace with the real APK / GitHub release download URL
  downloadUrl: "https://hnly.netlify.app/hnly.apk",
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
  .add("about", About, { cache: false })
  .add("privacy", Privacy, { cache: false })
  .add("terms", Terms, { cache: false })
  .start("home") 