/* ============================================================
 * Reading Stats — local, private, zero-backend
 * ============================================================ */

const STATS_CLEAR_KEY = "hnly_stats_cleared";

// dayKey is defined in getDailyHackerNews.js (global).

const parseDay = (day) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const computeStats = (events) => {
  const totalReads = events.length;
  if (totalReads === 0) return null;

  // Reads per local calendar day.
  const dayCounts = new Map();
  const topicCounts = new Map();
  events.forEach((ev) => {
    if (ev.day) dayCounts.set(ev.day, (dayCounts.get(ev.day) || 0) + 1);
    if (ev.topic) {
      const label = (TOPIC_LABELS?.[ev.topic] ?? ev.topic) || "";
      if (label) topicCounts.set(label, (topicCounts.get(label) || 0) + 1);
    }
  });

  const activeDays = dayCounts.size;
  const today = dayKey(Date.now());

  // --- Streaks ---
  let currentStreak = 0;
  // Anchor today or yesterday so a zero-read today doesn't kill the streak.
  let anchor = today;
  if (!dayCounts.has(today)) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    anchor = dayKey(y.getTime());
    if (!dayCounts.has(anchor)) anchor = null;
  }
  if (anchor) {
    let cursor = parseDay(anchor);
    while (dayCounts.has(dayKey(cursor.getTime()))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  let bestStreak = 0;
  let run = 0;
  let prev = null;
  [...dayCounts.keys()]
    .sort()
    .forEach((day) => {
      if (prev) {
        const a = parseDay(prev);
        const b = parseDay(day);
        const diff = Math.round((b - a) / 86400000);
        run = diff === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      bestStreak = Math.max(bestStreak, run);
      prev = day;
    });

  // --- 14-day activity bars ---
  const bars = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    bars.push({
      key,
      count: dayCounts.get(key) || 0,
      label: d.toLocaleDateString("en-US", { weekday: "narrow" }),
    });
  }
  const barMax = Math.max(1, ...bars.map((b) => b.count));

  // --- Top topics ---
  const topics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // --- Reads today ---
  const todayReads = dayCounts.get(today) || 0;

  return {
    totalReads,
    activeDays,
    currentStreak,
    bestStreak,
    todayReads,
    avgPerDay: activeDays > 0 ? totalReads / activeDays : 0,
    bars,
    barMax,
    topics,
  };
};

const Stats = (params, el) => {
  const events = getReadEvents();
  const stats = computeStats(events);

  const statsContent = () => {
    if (!stats) {
      return EmptyState(
        "mdi-chart-line-variant",
        "No reading history yet",
      );
    }

    return html`
      <div class="space-y-3">
        <!-- Hero -->
        <div class="grid grid-cols-2 gap-3">
          <div
            class="rounded-[18px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          >
            <p class="text-[12px] font-semibold text-white/40">Today</p>
            <p class="mt-1.5 text-[34px] font-bold tracking-[-0.033em] text-white">
              ${stats.todayReads}
            </p>
          </div>

          <div
            class="rounded-[18px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          >
            <p class="text-[12px] font-semibold text-white/40">Streak</p>
            <div class="mt-1.5 flex items-baseline gap-1.5">
              <p class="text-[34px] font-bold tracking-[-0.033em] text-white">
                ${stats.currentStreak}
              </p>
              ${stats.currentStreak > 0
                ? html`<span class="mdi mdi-fire text-[18px] text-[#ff6600]"></span>`
                : ""}
            </div>
          </div>
        </div>

        <!-- Secondary stats -->
        <div
          class="rounded-[18px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        >
          <div class="flex items-center justify-around text-center">
            <div>
              <p class="text-[20px] font-bold text-white">
                ${stats.totalReads}
              </p>
              <p class="text-[11px] font-medium text-white/40">Total reads</p>
            </div>
            <div class="h-8 w-px bg-white/10"></div>
            <div>
              <p class="text-[20px] font-bold text-white">
                ${stats.bestStreak}
              </p>
              <p class="text-[11px] font-medium text-white/40">Best streak</p>
            </div>
            <div class="h-8 w-px bg-white/10"></div>
            <div>
              <p class="text-[20px] font-bold text-white">
                ${stats.avgPerDay < 10 ? stats.avgPerDay.toFixed(1) : Math.round(stats.avgPerDay)}
              </p>
              <p class="text-[11px] font-medium text-white/40">Avg / day</p>
            </div>
          </div>
        </div>

        <!-- 14-day activity -->
        <div
          class="rounded-[18px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        >
          <h4 class="text-[15px] font-semibold text-white">Last 14 days</h4>
          <div class="mt-3 flex items-end gap-1.5" style="height:96px">
            ${stats.bars
              .map(
                (b) => html`
                  <div class="flex flex-1 flex-col items-center justify-end h-full">
                    <span class="text-[10px] text-white/40 mb-0.5">
                      ${b.count || ""}
                    </span>
                    <div
                      class="w-full rounded-t-[6px] ${b.count > 0 ? "bg-[#ff6600]" : "bg-white/5"}"
                      style="height:${b.count > 0 ? Math.max(8, (b.count / stats.barMax) * 100) : 2}%"
                    ></div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>

        <!-- Top topics -->
        ${stats.topics.length
          ? html`
              <div
                class="rounded-[18px] bg-[#1c1c1e] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
              >
                <h4 class="text-[15px] font-semibold text-white">
                  Top topics
                </h4>
                <div class="mt-3 space-y-2.5">
                  ${stats.topics
                    .map(([label, count]) => {
                      const pct =
                        stats.topics.length > 0
                          ? Math.round(
                              (count / stats.topics[0][1]) * 100,
                            )
                          : 0;
                      return html`
                        <div class="flex items-center gap-2">
                          <span
                            class="w-[76px] shrink-0 truncate text-[12px] font-medium text-white/55"
                            >${label}</span
                          >
                          <div
                            class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5"
                          >
                            <div
                              class="h-full rounded-full bg-[#ff6600]"
                              style="width:${pct}%"
                            ></div>
                          </div>
                          <span
                            class="text-[11px] font-semibold text-white/40"
                            >${count}</span
                          >
                        </div>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            `
          : ""}

        <!-- Clear stats -->
        <button
          type="button"
          id="clearStatsBtn"
          class="mt-2 w-full rounded-full bg-white/5 py-3 text-[13px] font-semibold text-white/40 transition-colors active:bg-white/10"
        >
          Clear reading history
        </button>
      </div>
    `;
  };

  const Page = html`
    <div class="min-h-screen">
      ${Navbar(StatsNav)}

      <main class="px-3 pb-10 pt-2">
        <div id="statsContent">${statsContent()}</div>
      </main>
    </div>
  `;

  afterPageLoad(() => {
    el.addEventListener("click", (e) => {
      const clearBtn = e.target.closest("#clearStatsBtn");
      if (clearBtn) {
        e.preventDefault();
        e.stopPropagation();
        const sheet = new BottomSheet({
          content: html`
            <div class="px-2 pt-2 pb-6 text-center">
              <h2
                class="text-[18px] font-semibold tracking-[-0.022em] text-white"
              >
                Clear reading history?
              </h2>
              <p class="mt-2 text-[13px] text-white/55">
                This removes all reading stats and cannot be undone.
              </p>
              <div class="mt-6 grid gap-2.5">
                <button
                  id="clearStatsConfirm"
                  class="ripple-container flex h-[50px] items-center justify-center rounded-full bg-[#ff3b30] text-[16px] font-semibold text-white transition-all active:scale-[0.97]"
                >
                  Clear
                </button>
                <button
                  id="clearStatsCancel"
                  class="ripple-container flex h-[50px] items-center justify-center rounded-full bg-[#2c2c2e] text-[16px] font-semibold text-white/90 transition-all active:scale-[0.97]"
                >
                  Cancel
                </button>
              </div>
            </div>
          `,
        });

        setTimeout(() => {
          sheet.show().then((sh) => {
            sh.querySelector("#clearStatsConfirm")?.addEventListener("click", () => {
              safeStorage.set(HN_CONFIG.READ_EVENTS_KEY, []);
              sheet.dismiss().then(() => {
                const box = el.querySelector("#statsContent");
                if (box) box.innerHTML = computeStats([]) === null ? EmptyState("mdi-chart-line-variant", "No reading history yet") : "";
              });
            });
            sh.querySelector("#clearStatsCancel")?.addEventListener("click", () => {
              sheet.dismiss();
            });
          });
        }, 100);
      }
    });
  });

  return Page;
};
