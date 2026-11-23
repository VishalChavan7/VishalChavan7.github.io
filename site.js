/* Dayline site: the working phone, live release info, and quiet motion. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const REPO = "VishalChavan7/Dayline";

  // ---------- Nav hairline once you scroll ----------
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  $$("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));

  // ---------- Reveal on scroll ----------
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        e.target.querySelectorAll("[data-reveal-bars]").forEach((b) => b.classList.add("is-in"));
        io.unobserve(e.target);
      }), { rootMargin: "0px 0px -12% 0px" })
    : null;
  $$(".reveal, [data-reveal-bars]").forEach((el) => (io ? io.observe(el) : el.classList.add("is-in")));

  // ---------- Latest versions, sizes and direct downloads from GitHub ----------
  const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;
  fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, { headers: { Accept: "application/vnd.github+json" } })
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      const live = list.filter((r) => !r.draft && !r.prerelease);
      const pick = (mac) => live.find((r) => (mac ? r.tag_name.startsWith("mac-v") : /^v\d/.test(r.tag_name)));
      [["android", pick(false), /\.apk$/i], ["mac", pick(true), /\.zip$/i]].forEach(([kind, rel, ext]) => {
        if (!rel) return;
        const asset = rel.assets.find((a) => ext.test(a.name));
        $$(`[data-ver="${kind}"]`).forEach((e) => (e.textContent = rel.tag_name.replace(/^(mac-)?v/, "")));
        if (asset) {
          $$(`[data-size="${kind}"]`).forEach((e) => (e.textContent = mb(asset.size)));
          $$(`[data-dl="${kind}"]`).forEach((a) => (a.href = asset.browser_download_url));
        } else {
          $$(`[data-dl="${kind}"]`).forEach((a) => (a.href = rel.html_url));
        }
      });
    })
    .catch(() => {});

  // ---------- Light / dark swap ----------
  const swap = $("[data-swap]");
  if (swap) {
    const imgs = $$("img", swap);
    $$("[data-mode]").forEach((b) => b.addEventListener("click", () => {
      const on = +b.dataset.mode;
      imgs.forEach((img, i) => img.classList.toggle("is-off", i !== on));
      $$("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
  }

  // ================= The phone =================
  const phone = $(".phone");
  if (!phone) return;
  const buzz = (ms = 8) => navigator.vibrate && navigator.vibrate(ms);

  // Clock, weekday and greeting in your own time.
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hm = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
  $("[data-clock]").textContent = hm(now);
  setInterval(() => ($("[data-clock]").textContent = hm(new Date())), 30000);
  $("[data-weekday]").textContent = days[now.getDay()];
  const h = now.getHours();
  $("[data-greeting]").textContent = `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"} · ${now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;

  // Tabs
  const tabs = $$("[data-tab]");
  const views = $$("[data-view]");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    views.forEach((v) => (v.hidden = v.dataset.view !== t.dataset.tab));
    buzz(6);
  }));

  // ----- Tasks -----
  const PRIO = { high: "#e8710a", medium: "#1757d0", low: "#8a8b93" };
  const tasks = [
    { t: "Review the landing page copy", p: "high", meta: ["11:30 AM", "#work"], done: false },
    { t: "Book dentist appointment", p: "medium", meta: ["#errands"], done: false },
    { t: "30 minutes of reading", p: "low", meta: ["Repeats daily"], done: true },
    { t: "Send the Q4 budget to finance", p: "high", meta: ["Due today", "#work"], soon: true, done: false },
    { t: "Water the plants", p: "low", meta: ["#home"], done: false },
  ];
  const list = $("[data-tasks]");
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function renderTasks(newIndex = -1) {
    list.innerHTML = tasks.map((k, i) => `
      <div class="task${k.done ? " is-done" : ""}${i === newIndex ? " is-new" : ""}" role="checkbox" aria-checked="${k.done}" tabindex="0" data-i="${i}" style="--prio:${PRIO[k.p]}">
        <span class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
        <span><span class="task__title">${esc(k.t)}</span>
        ${k.meta.length ? `<span class="task__meta">${k.meta.map((m) => `<span class="${m.startsWith("#") ? "tag" : k.soon && /Due/.test(m) ? "soon" : ""}">${esc(m)}</span>`).join("")}</span>` : ""}</span>
      </div>`).join("");
    updateRing();
  }
  function toggle(i) {
    tasks[i].done = !tasks[i].done;
    buzz(tasks[i].done ? 14 : 6);
    renderTasks();
  }
  list.addEventListener("click", (e) => { const el = e.target.closest(".task"); if (el) toggle(+el.dataset.i); });
  list.addEventListener("keydown", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    const el = e.target.closest(".task"); if (!el) return;
    e.preventDefault(); toggle(+el.dataset.i);
    list.querySelector(`[data-i="${el.dataset.i}"]`)?.focus();
  });

  // ----- Habits (count toward the ring too, as in the app) -----
  const habits = [
    { name: "Meditate", icon: "🧘", c: "#7b3fbf", streak: 3, week: [0, 1, 1, 1], done: false },
    { name: "Drink water", icon: "💧", c: "#0a8fb0", streak: 12, week: [1, 1, 1, 1], done: false },
    { name: "Strength training", icon: "🏋️", c: "#b3640a", streak: 7, week: [1, 0, 1, 0], done: true },
  ];
  const hl = $("[data-habits]");
  function renderHabits() {
    const today = (now.getDay() + 6) % 7; // Monday first
    hl.innerHTML = habits.map((x, i) => {
      const dots = Array.from({ length: 7 }, (_, d) => {
        const on = d < today ? x.week[d % x.week.length] : d === today ? x.done : false;
        return `<i class="${on ? "on" : ""}${d === today ? " today" : ""}"></i>`;
      }).join("");
      return `<div class="habit${x.done ? " is-done" : ""}" style="--hc:${x.c}">
        <span class="habit__icon" aria-hidden="true">${x.icon}</span>
        <span class="habit__body"><span class="habit__name">${x.name}</span><br><span class="habit__streak">🔥 ${x.streak + (x.done ? 1 : 0)} days · Daily</span>
        <span class="habit__week" aria-hidden="true">${dots}</span></span>
        <button class="habit__tick" type="button" data-h="${i}" aria-pressed="${x.done}" aria-label="${x.done ? "Undo" : "Check in"} ${x.name}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
      </div>`;
    }).join("");
    const n = habits.filter((x) => x.done).length;
    $("[data-habits-sub]").textContent = `${n} of ${habits.length} done today`;
    updateRing();
  }
  hl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-h]"); if (!b) return;
    const x = habits[+b.dataset.h]; x.done = !x.done; buzz(x.done ? 18 : 6);
    renderHabits();
    hl.querySelector(`[data-h="${b.dataset.h}"]`)?.focus();
  });

  function updateRing() {
    const total = tasks.length + habits.length;
    const done = tasks.filter((k) => k.done).length + habits.filter((x) => x.done).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    $("[data-ring]").style.strokeDashoffset = String(213.6 * (1 - done / total));
    $("[data-pct]").textContent = `${pct}%`;
    $("[data-done]").textContent = `${done} of ${total} done`;
    const left = tasks.filter((k) => !k.done).length, hLeft = habits.filter((x) => !x.done).length;
    $("[data-left]").textContent = left + hLeft === 0 ? "All done. Enjoy the evening." : `${left} task${left === 1 ? "" : "s"} left · ${hLeft} habit${hLeft === 1 ? "" : "s"} to go`;
    $("[data-count]").textContent = left;
  }

  // ----- Quick capture with natural typing -----
  const WD = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  function parse(text) {
    const out = { title: text, date: null, prio: null, tags: [] };
    let s = " " + text + " ";
    s = s.replace(/\s!(high|h|medium|med|m|low|l)\b/i, (_, p) => { p = p[0].toLowerCase(); out.prio = p === "h" ? "high" : p === "m" ? "medium" : "low"; return " "; });
    s = s.replace(/\s#([\p{L}\p{N}_/-]+)/gu, (_, t) => { out.tags.push("#" + t.toLowerCase()); return " "; });
    s = s.replace(/\s(today|tonight|tomorrow|tmrw)\b/i, (_, d) => { out.date = /^to(day|night)$/i.test(d) ? "Today" : "Tomorrow"; return " "; });
    if (!out.date) s = s.replace(new RegExp(`\\s(?:on\\s)?(${WD.join("|")}|${WD.map((w) => w.slice(0, 3)).join("|")})\\b`, "i"), (_, d) => {
      const i = WD.findIndex((w) => w.startsWith(d.toLowerCase().slice(0, 3)));
      out.date = WD[i][0].toUpperCase() + WD[i].slice(1); return " ";
    });
    out.title = s.replace(/\s+/g, " ").trim();
    return out;
  }
  const input = $("#capture"), chips = $("[data-chips]");
  input.addEventListener("input", () => {
    const p = parse(input.value);
    const c = [];
    if (p.date) c.push(`📅 ${p.date}`);
    if (p.prio) c.push(`⚑ ${p.prio[0].toUpperCase() + p.prio.slice(1)}`);
    p.tags.forEach((t) => c.push(t));
    chips.innerHTML = c.map((x) => `<span>${esc(x)}</span>`).join("");
  });
  $("[data-capture]").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = parse(input.value);
    if (!p.title) { input.focus(); return; }
    const meta = [];
    if (p.date && p.date !== "Today") meta.push(p.date);
    meta.push(...p.tags);
    const task = { t: p.title, p: p.prio || "medium", meta, done: false };
    // A task for another day lands in Upcoming; show where it went.
    if (p.date && p.date !== "Today") meta.unshift("→ Upcoming");
    tasks.unshift(task);
    if (tasks.length > 7) tasks.splice(7);
    input.value = ""; chips.innerHTML = "";
    buzz(10);
    renderTasks(0);
  });

  // ----- Focus timer (counts for real; a session is 25 minutes) -----
  const FULL = 25 * 60;
  let left = FULL, timer = null;
  const ring = $("[data-focus-ring]"), time = $("[data-focus-time]"), state = $("[data-focus-state]"), go = $("[data-focus-go]"), box = $("[data-focus]");
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  function paint() {
    time.textContent = fmt(left);
    ring.style.strokeDashoffset = String(603.2 * (1 - left / FULL));
  }
  go.addEventListener("click", () => {
    if (timer) {
      clearInterval(timer); timer = null;
      go.textContent = "Resume"; state.textContent = "Paused"; box.classList.remove("is-running");
    } else {
      timer = setInterval(() => {
        left = Math.max(0, left - 1); paint();
        if (left === 0) { clearInterval(timer); timer = null; state.textContent = "Done. Take a break"; go.textContent = "Again"; box.classList.remove("is-running"); left = FULL; buzz([30, 60, 30]); }
      }, 1000);
      go.textContent = "Pause"; state.textContent = "Focusing"; box.classList.add("is-running");
      const next = tasks.find((k) => !k.done);
      if (next) $("[data-focus-task]").textContent = next.t;
    }
    buzz(12);
  });

  renderTasks();
  renderHabits();
  paint();
})();
