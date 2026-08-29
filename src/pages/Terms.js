const TERMS_SECTIONS = () => [
  {
    title: "Acceptance of terms",
    body: `By using ${APP_INFO.name}, you agree to these terms. If you disagree with any part of them, please stop using the app.`,
  },
  {
    title: "The service",
    body: `${APP_INFO.name} is an independent, open web client for Hacker News. It is free to use, is not affiliated with, endorsed by, or connected to Y Combinator or Hacker News, and displays content hosted by Hacker News and Algolia.`,
  },
  {
    title: "No accounts required",
    body: `${APP_INFO.name} has no login and no backend account system. Use of the app is anonymous, and content you save is stored locally on your own device.`,
  },
  {
    title: "Acceptable use",
    body: `You agree not to misuse ${APP_INFO.name}, attempt to disrupt its operation, scrape or download its content at abusive volumes, or use it to violate any applicable law.`,
  },
  {
    title: "Availability",
    body: `${APP_INFO.name} is provided "as is" and may change, be interrupted, or be discontinued at any time without notice. Features may be added, altered, or removed.`,
  },
  {
    title: "Third-party content",
    body: `Stories and comments come from third parties and are the responsibility of their authors. ${APP_INFO.name} does not endorse the content shown and is not responsible for its accuracy, legality, or availability.`,
  },
  {
    title: "Limitation of liability",
    body: `To the fullest extent permitted by law, ${APP_INFO.name} is provided without warranties of any kind, and we are not liable for any damages arising from its use or the content it displays.`,
  },
  {
    title: "Open source",
    body: `${APP_INFO.name} is an open-source project. You may use, study, modify, and share its source code under the terms of its license.`,
  },
  {
    title: "Changes to these terms",
    body: `We may update these terms from time to time. Updated terms will be posted on this page and take effect when published. Continued use of ${APP_INFO.name} means you accept them.`,
  },
  {
    title: "Contact",
    body: `Questions about these terms or your rights are welcome. Reach out through the feedback link on the About page.`,
  },
];

const Terms = (params, el) => {
  const Page = html`
    <div class="min-h-screen">
      ${Navbar(TermsNav)}

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

        ${LegalCardList(TERMS_SECTIONS())}
      </main>
    </div>
  `;

  return Page;
};