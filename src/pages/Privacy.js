const PRIVACY_SECTIONS = () => [
  {
    title: "Privacy by design",
    body: `${APP_INFO.name} is built to be privacy-first. There are no accounts, no profiles, and no way for us to know who you are. Your reading activity never leaves your device.`,
  },
  {
    title: "What we collect",
    body: `Nothing that identifies you. ${APP_INFO.name} does not collect names, email addresses, or any personal information. Everything you save, hide, or mark as read is stored only in your browser's local storage on your own device.`,
  },
  {
    title: "Third-party services",
    body: `${APP_INFO.name} talks to trusted third parties to do its job: the official Hacker News API (via Firebase) for stories and comments, and Algolia for search. Requests to these services may include your IP address, as their servers need it to respond. We do not control what they log.`,
  },
  {
    title: "Analytics",
    body: `${APP_INFO.name} uses a privacy-friendly analytics script that does not use cookies and does not collect personal data. If you have "Do Not Track" enabled in your browser, analytics are skipped entirely (the collect-dnt flag is on). No cross-site tracking, ever.`,
  },
  {
    title: "Your data stays yours",
    body: `Your saved posts, hidden posts, and read history live only in your browser. Clearing your site data removes them permanently. There is no server-side copy, and ${APP_INFO.name} cannot retrieve them for you or anyone else.`,
  },
  {
    title: "External links",
    body: `Stories and comments link to sites outside ${APP_INFO.name}. Once you leave, the privacy practices of the destination site apply. ${APP_INFO.name} never tracks where you go or what you do elsewhere.`,
  },
  {
    title: "Changes to this policy",
    body: `If this policy changes, it will be reflected here. Continued use of ${APP_INFO.name} after a change means you accept the updated policy.`,
  },
];

const LegalCardList = (sections) => html`
  <div class="space-y-3">
    ${sections
      .map(
        (s) => html`
          <section
            class="overflow-hidden rounded-[18px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          >
            <h4 class="text-[15px] font-semibold text-white">${s.title}</h4>
            <p class="mt-1.5 text-[13px] leading-relaxed text-white/55">
              ${s.body}
            </p>
          </section>
        `,
      )
      .join("")}
  </div>
`;

const Privacy = (params, el) => {
  const Page = html`
    <div class="min-h-screen">
      ${Navbar(PolicyNav)}

      <main class="px-3 pb-10 pt-2">
        <div class="px-4 pb-5 pt-3">
          <p class="text-[13px] leading-relaxed text-white/55">
            Last updated: ${new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        ${LegalCardList(PRIVACY_SECTIONS())}
      </main>
    </div>
  `;

  return Page;
};