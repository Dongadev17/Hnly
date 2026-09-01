const HomeNav = html`
  <h1 class="text-[28px] font-bold tracking-[-0.033em] text-white">Hnly</h1>
  <div class="flex items-center gap-2">
    <div
      class="bg-[#212121] flex items-center border-y border-[#333333] rounded-full"
    >
      <button id="refreshBtn">
        <span
          id="refreshIcon"
          class="ripple-container text-2xl mdi mdi-refresh bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-l-full"
        ></span>
      </button>
      <button data-route="search">
        <span
          class="ripple-container text-2xl mdi mdi-magnify bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-r-full"
        ></span>
      </button>
    </div>
    <div
      class="bg-[#212121] flex items-center border-y border-[#333333] rounded-full"
    >
      <button data-route="posts">
        <span
          class="ripple-container text-2xl mdi mdi-archive bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-l-full"
        ></span>
      </button>
      <button data-route="about">
        <span
          class="ripple-container text-2xl mdi mdi-information-outline bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-r-full"
        ></span>
      </button>
    </div>
  </div>
`;

const PostsNav = html`
  <button data-route="home">
    <span
      class="ripple-container text-2xl mdi mdi-keyboard-backspace bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-full"
    ></span>
  </button>
  <h1 class="text-[22px] font-bold tracking-[-0.026em] text-white">
    Saved posts
  </h1>
  <div class="w-10"></div>
`;

const CommentsNav = html`
  <button data-route="home">
    <span
      class="ripple-container text-2xl mdi mdi-keyboard-backspace bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-full"
    ></span>
  </button>
  <h1 class="text-[22px] font-bold tracking-[-0.026em] text-white">Comments</h1>
  <div class="w-10"></div>
`;

const SearchNav = html`
  <button data-route="home">
    <span
      class="ripple-container text-2xl mdi mdi-keyboard-backspace bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-full"
    ></span>
  </button>
  <h1 class="text-[22px] font-bold tracking-[-0.026em] text-white">Search</h1>
  <div class="w-10"></div>
`;

const AboutNav = html`
  <button data-route="home">
    <span
      class="ripple-container text-2xl mdi mdi-keyboard-backspace bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-full"
    ></span>
  </button>
  <h1 class="text-[22px] font-bold tracking-[-0.026em] text-white">About</h1>
  <div class="w-10"></div>
`;

const StatsNav = html`
  <button data-route="about">
    <span
      class="ripple-container text-2xl mdi mdi-keyboard-backspace bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-full"
    ></span>
  </button>
  <h1 class="text-[22px] font-bold tracking-[-0.026em] text-white">
    Reading Stats
  </h1>
  <div class="w-10"></div>
`;

const PolicyNav = html`
  <button data-route="about">
    <span
      class="ripple-container text-2xl mdi mdi-keyboard-backspace bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-full"
    ></span>
  </button>
  <h1 class="text-[22px] font-bold tracking-[-0.026em] text-white">
    Privacy Policy
  </h1>
  <div class="w-10"></div>
`;

const TermsNav = html`
  <button data-route="about">
    <span
      class="ripple-container text-2xl mdi mdi-keyboard-backspace bg-[#212121] border-y border-[#333333] pt-2 pb-1.5 px-3 rounded-full"
    ></span>
  </button>
  <h1 class="text-[22px] font-bold tracking-[-0.026em] text-white">
    Terms &amp; Conditions
  </h1>
  <div class="w-10"></div>
`;

const Navbar = (navHTML) => {
  return html`<nav
    class="sticky top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black via-black/60 to-transparent p-3.5"
  >
    ${navHTML}
  </nav>`;
};
