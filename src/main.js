const APP_INFO = {
  name: "Hnly",
  version: window?.Android ? Android.getAppVersion() : "1.0.0", //Android.version : "1.0.0",
  tagline: "Your daily dose of tech stories",
  // Replace with your real Solana wallet address
  solanaWallet: "8nosMJPbhitDwzCirUDMeePLJy4jYTibT3A2wxAZhHXX",
  // TODO: Replace with the real APK / GitHub release download URL
  downloadUrl: "",
  // TODO: Replace with the real GitHub Issues URL (or another feedback link)
  feedbackUrl: "https://github.com/Dongadev17/Hnly/issues/1",
};

let POSTS = [];
let LOADING = true;

const r = new Router("#app", {
  onSecondDataRouteClick: () => {},
});
const { afterPageLoad } = utils();

r.add("home", Home, { cache: false })
  .add("posts", Posts, { cache: false })
  .add("about", About, { cache: false })
  .start("home");
