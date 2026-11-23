/* Dayline for Android, working in the page: Today, Habits, More and Focus behave like the app;
   Calendar, Notes and Statistics show the app's real screens. Nothing is saved. */
(() => {
  const root = document.querySelector("[data-dl-app]");
  if (!root) return;
  // Material Symbols Rounded, cut down to the icons used here (fonts/symbols-rounded.woff2), by code point.
  const ICON = {add:0xe145,arrow_back:0xe5c4,auto_stories:0xe666,bar_chart:0xe26b,battery_full:0xe1a4,calendar_month:0xebcc,calendar_today:0xe935,check:0xe5ca,check_circle:0xe86c,checklist:0xe6b1,chevron_right:0xe409,delete:0xe872,done_all:0xe877,event:0xe24f,expand_more:0xe5cf,fitness_center:0xeb43,flag:0xe153,inbox:0xe156,light_mode:0xe518,local_fire_department:0xea05,menu_book:0xea19,more_horiz:0xe5d3,notifications:0xe7f4,open_in_full:0xf1ce,pause:0xe034,play_arrow:0xe037,remove:0xe15b,repeat:0xe040,replay:0xe042,search:0xe8b6,self_improvement:0xea78,send:0xe163,signal_cellular_alt:0xe202,sticky_note_2:0xf1fc,timer:0xe425,tune:0xe429,upcoming:0xf07e,warning:0xe002,water_drop:0xe798,wifi:0xe63e};
  const ms = (n, fill = false) => `<span class="ms${fill ? " f" : ""}" aria-hidden="true">&#${ICON[n]};</span>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const buzz = (p) => navigator.vibrate && navigator.vibrate(p);
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const now = new Date();
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const PR = { urgent: "var(--urgent)", high: "var(--high)", medium: "var(--medium)", low: "var(--low)" };

  // ---------------- data ----------------
  let nextId = 100;
  const overdue = [{ id: 1, t: "Send the Q4 budget to finance", p: "urgent", date: "Yesterday", tags: ["work"], flag: true }];
  const today = [
    { id: 2, t: "Review landing page copy with the design team", p: "high", time: "11:30 AM", flag: true,
      subs: [{ id: 21, t: "Hero headline" }, { id: 22, t: "Pricing section" }, { id: 23, t: "FAQ answers", done: true }] },
    { id: 3, t: "Book dentist appointment", p: "medium", bell: true, tags: ["errands"] },
    { id: 4, t: "Water the plants", p: "low", repeat: true, tags: ["home"] },
  ];
  const doneToday = [{ id: 5, t: "Morning run", p: "low" }, { id: 6, t: "Pick up dry cleaning", p: "medium" }];
  const habits = [
    { id: "m", name: "Meditate", icon: "self_improvement", c: "#7b3fbf", cd: "#cdaae4", streak: 3, every: "Daily", week: [0, 1, 1], done: false },
    { id: "w", name: "Drink water", icon: "water_drop", c: "#0a97b8", cd: "#6fd3ec", streak: 12, every: "Daily", week: [1, 1, 1], goal: 8, count: 5 },
    { id: "s", name: "Strength training", icon: "fitness_center", c: "#b3640a", cd: "#ffb366", streak: 1, unit: "week", every: "3× a week", week: [1, 0, 1], done: false },
    { id: "j", name: "Journal", icon: "menu_book", c: "#2e8b43", cd: "#7fd69a", streak: 1, every: "Mo We Th Fr", week: [0, 1, 1], done: true },
  ];
  const habitDone = (h) => (h.goal ? h.count >= h.goal : h.done);
  let focusMin = 25;

  // ---------------- shell ----------------
  root.innerHTML = `
  <div class="dl__screen"><div class="dl__ui">
    <div class="dl__status"><span data-clock></span><span class="dl__sicons">${ms("signal_cellular_alt", true)}${ms("wifi", true)}${ms("battery_full", true)}</span></div>
    <i class="dl__cam"></i>
    <div class="dl__pages">
      <section class="dl__page" data-page="today" aria-label="Today"></section>
      <section class="dl__page dl__page--img" data-page="calendar" aria-label="Calendar" hidden><img data-img="calendar" alt="Dayline's calendar: November, with today's tasks under it"></section>
      <section class="dl__page dl__page--img" data-page="notes" aria-label="Notes" hidden><img data-img="notes" alt="Dayline's notes: colour-coded cards with tags"></section>
      <section class="dl__page" data-page="habits" aria-label="Habits" hidden></section>
      <section class="dl__page" data-page="more" aria-label="More" hidden></section>
      <section class="dl__page dl__page--push" data-page="focus" aria-label="Focus timer" hidden></section>
      <section class="dl__page dl__page--push dl__page--img" data-page="stats" aria-label="Statistics" hidden>
        <div class="dl__bar dl__bar--back" style="position:absolute;left:0;right:0;top:0;margin:0;padding:0 calc(8 * var(--dp));z-index:2"><button class="dl__icon" data-back aria-label="Back">${ms("arrow_back")}</button></div>
        <img data-img="stats" alt="Dayline's statistics for the week">
      </section>
    </div>
    <button class="dl__fab" data-fab aria-label="New task">${ms("add")}<span data-fab-label hidden></span></button>
    <div class="dl__snack" role="status"><span data-snack-text></span><button data-undo>Undo</button></div>
    <nav class="dl__nav" role="tablist" aria-label="Dayline">
      ${[["today", "light_mode", "Today"], ["calendar", "calendar_month", "Calendar"], ["notes", "sticky_note_2", "Notes"], ["habits", "self_improvement", "Habits"], ["more", "more_horiz", "More"]]
        .map(([k, i, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === "today"}"><span>${ms(i)}</span>${l}</button>`).join("")}
    </nav>
    <div class="dl__scrim" data-close></div>
    <form class="dl__sheet" data-sheet autocomplete="off">
      <div class="dl__handle"></div>
      <div class="dl__shead"><b>New task</b><button type="button" class="dl__textbtn" data-close>${ms("open_in_full")}Details</button></div>
      <div class="dl__compose">
        <input data-input placeholder="Add a task" aria-label="New task" enterkeyhint="send">
        <button class="dl__send" aria-label="Add">${ms("send", true)}</button>
      </div>
      <div class="dl__chips" data-chips></div>
      <p class="dl__tip">Tip: type “tomorrow”, “!high” or “#tag” as you write.</p>
    </form>
  </div></div>`;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];

  // Clock, and the app's real screens in light or dark
  const clock = () => ($("[data-clock]").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, ""));
  clock(); setInterval(clock, 30000);
  const setImgs = () => $$("[data-img]").forEach((img) => (img.src = `img/demo/${img.dataset.img}-${dark.matches ? "dark" : "light"}.webp`));
  setImgs(); dark.addEventListener?.("change", () => { setImgs(); renderHabits(); });

  // ---------------- navigation ----------------
  let current = "today"; const stack = [];
  function show(page, { push = false } = {}) {
    if (page === current) { $(`[data-page="${page}"]`).scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (push) stack.push(current); else stack.length = 0;
    $$("[data-page]").forEach((p) => (p.hidden = p.dataset.page !== page));
    current = page;
    const tab = ["focus", "stats"].includes(page) ? "more" : page;
    $$("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    const fab = $("[data-fab]"), label = $("[data-fab-label]");
    fab.hidden = !["today", "habits"].includes(page);
    label.hidden = page !== "habits"; label.textContent = "New Habit";
    fab.setAttribute("aria-label", page === "habits" ? "New habit" : "New task");
    buzz(6);
  }
  $$("[data-tab]").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
  root.addEventListener("click", (e) => { if (e.target.closest("[data-back]")) { show(stack.pop() || "more"); } });

  // ---------------- Today ----------------
  const allTasks = () => [...overdue, ...today];
  function taskRow(k, { sub = false, color } = {}) {
    const meta = [];
    if (k.date) meta.push(`<span class="late">${ms("event", true)}${esc(k.date)}</span>`);
    if (k.time) meta.push(`<span>${esc(k.time)}</span>`);
    if (k.subs) meta.push(`<span>${ms("checklist")}${k.subs.filter((s) => s.done).length}/${k.subs.length}</span>`);
    if (k.bell) meta.push(`<span>${ms("notifications", true)}</span>`);
    if (k.repeat) meta.push(`<span>${ms("repeat")}</span>`);
    (k.tags || []).forEach((t) => meta.push(`<span class="tag">#${esc(t)}</span>`));
    const c = color || PR[k.p] || PR.low;
    return `<div class="dl__row" data-row="${k.id}">
      <div class="dl__row-bg done">${ms("check", true)}</div><div class="dl__row-bg del">${ms("delete")}</div>
      <div class="dl__task${sub ? " dl__task--sub" : ""}${k.done ? " is-done" : ""}" data-task="${k.id}">
        <button class="dl__check" style="--c:${c}" aria-label="${k.done ? "Mark not done" : "Complete"}: ${esc(k.t)}">${ms("check")}</button>
        <div class="dl__tbody"><div class="dl__ttitle">${esc(k.t)}</div>${!sub && meta.length ? `<div class="dl__meta">${meta.join("")}</div>` : ""}</div>
        ${k.flag ? ms("flag", true).replace('class="ms f"', `class="ms f dl__flag" style="color:${c}"`) : ""}
      </div></div>
      ${!sub && k.subs ? k.subs.filter((s) => !s.done).map((s) => taskRow(s, { sub: true, color: c })).join("") : ""}`;
  }
  const closed = new Set();
  let showDone = false;
  function renderToday(enterId) {
    const groups = ["urgent", "high", "medium", "low"].map((p) => [p, today.filter((k) => k.p === p)]).filter(([, l]) => l.length);
    const greet = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
    $(`[data-page="today"]`).innerHTML = `
      <div class="dl__bar"><button class="dl__icon" aria-label="Search">${ms("search")}</button><button class="dl__icon" aria-label="Customise">${ms("tune")}</button></div>
      <h3 class="dl__h1">${DAYS[now.getDay()]}</h3>
      <p class="dl__sub">${greet} · ${now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</p>
      <div class="dl__progress" data-progress></div>
      ${overdue.length ? card("overdue", "Overdue", "warning", "var(--error-c)", "var(--overdue)", overdue.length, overdue.map((k) => taskRow(k)).join("")) : ""}
      ${card("today", "Today", "light_mode", "var(--primary-c)", "var(--primary)", today.length,
        groups.map(([p, l]) => `<div class="dl__group" style="color:${PR[p]}"><i></i>${p.toUpperCase()}</div>${l.map((k) => taskRow(k)).join("")}`).join("")
        + `<button class="dl__textbtn" data-add>${ms("add")}Add to today</button>`
        + (doneToday.length ? `<button class="dl__textbtn" data-showdone>${ms("check")}${showDone ? "Hide completed" : `Completed today (${doneToday.length})`}</button>` : "")
        + (showDone ? doneToday.map((k) => taskRow({ ...k, done: true })).join("") : ""))}`;
    renderProgress();
    if (enterId != null) $(`[data-row="${enterId}"]`)?.classList.add("dl__enter");
  }
  function card(key, title, icon, tileBg, tint, count, body) {
    return `<div class="dl__card${closed.has(key) ? " is-closed" : ""}" data-card="${key}">
      <div class="dl__chead" data-toggle="${key}" role="button" tabindex="0" aria-expanded="${!closed.has(key)}">
        <span class="dl__tile" style="background:${tileBg};color:${tint}">${ms(icon, key === "today")}</span>
        <span class="dl__ctitle">${title}</span>
        <span class="dl__badge" style="background:color-mix(in srgb, ${tint} 16%, transparent);color:${tint}">${count}</span>
        ${ms("expand_more").replace('class="ms"', 'class="ms dl__chev"')}
      </div>
      <div class="dl__cbody"><div>${body}</div></div></div>`;
  }
  function renderProgress() {
    const open = allTasks().length, tasksDone = doneToday.length;
    const hDone = habits.filter(habitDone).length;
    const total = open + tasksDone + habits.length, done = tasksDone + hDone, pct = Math.round((done / total) * 100);
    const C = 2 * Math.PI * 50;
    const el = $("[data-progress]"); if (!el) return;
    if (!el.firstChild) {
      el.innerHTML = `<div class="dl__ring"><svg viewBox="0 0 120 120"><circle class="t" cx="60" cy="60" r="50"/><circle class="f" cx="60" cy="60" r="50" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><b></b></div>
        <div><div class="dl__ptitle"></div><div class="dl__pbody"></div>
        <div class="dl__pstats"><span>${ms("timer", true)}${focusMin}m</span><span>${ms("self_improvement")}<i data-h></i></span><span class="warn">${ms("warning")}<i data-o></i></span></div></div>`;
    }
    requestAnimationFrame(() => (el.querySelector(".f").style.strokeDashoffset = String(C * (1 - done / total))));
    el.querySelector("b").textContent = `${pct}%`;
    el.querySelector(".dl__ptitle").textContent = done === total ? "All done!" : `${done} of ${total} done`;
    const parts = [`${open} task${open === 1 ? "" : "s"} left`, `${habits.length - hDone} habit${habits.length - hDone === 1 ? "" : "s"} to go`];
    if (overdue.length) parts.push(`${overdue.length} overdue`);
    el.querySelector(".dl__pbody").textContent = parts.join(" · ");
    el.querySelector("[data-h]").textContent = `${hDone}/${habits.length}`;
    el.querySelector("[data-o]").textContent = overdue.length;
    el.querySelector(".warn").style.display = overdue.length ? "" : "none";
  }
  function find(id) {
    for (const list of [overdue, today]) {
      const i = list.findIndex((k) => k.id === id); if (i >= 0) return { list, i, k: list[i] };
      for (const k of list) { const s = k.subs?.find((x) => x.id === id); if (s) return { parent: k, k: s }; }
    }
    const d = doneToday.findIndex((k) => k.id === id); if (d >= 0) return { done: true, i: d, k: doneToday[d] };
    return null;
  }
  let undo = null, snackTimer;
  function snack(text, fn) {
    undo = fn; $("[data-snack-text]").textContent = text; $("[data-undo]").hidden = !fn;
    $(".dl__snack").classList.add("is-on"); root.classList.add("has-snack");
    clearTimeout(snackTimer); snackTimer = setTimeout(hideSnack, 3500);
  }
  const hideSnack = () => { $(".dl__snack").classList.remove("is-on"); root.classList.remove("has-snack"); };
  $("[data-undo]").addEventListener("click", () => { hideSnack(); undo?.(); undo = null; });

  function complete(id) {
    const f = find(id); if (!f) return;
    const row = $(`[data-task="${id}"]`);
    if (f.done) { // un-complete from the completed list
      doneToday.splice(f.i, 1); today.push({ ...f.k, done: false }); buzz(6); renderToday(f.k.id); return;
    }
    buzz([12, 30, 18]);
    row?.classList.add("is-done");
    if (f.parent) { f.k.done = true; setTimeout(() => renderToday(), 520); return; }
    setTimeout(() => {
      leave(row?.closest(".dl__row"));
      setTimeout(() => {
        f.list.splice(f.list.indexOf(f.k), 1); doneToday.unshift({ ...f.k, done: false });
        renderToday(); bump(); snack("Task completed", () => { doneToday.shift(); f.list.splice(f.i, 0, f.k); renderToday(f.k.id); });
      }, 380);
    }, 420);
  }
  function remove(id) {
    const f = find(id); if (!f || f.parent || f.done) return renderToday();
    leave($(`[data-row="${id}"]`)); buzz(20);
    setTimeout(() => { f.list.splice(f.i, 1); renderToday(); snack("Task deleted", () => { f.list.splice(f.i, 0, f.k); renderToday(f.k.id); }); }, 380);
  }
  const leave = (row) => { if (!row) return; row.style.height = row.offsetHeight + "px"; row.classList.add("dl__leave"); };
  const bump = () => $$(".dl__badge").forEach((b) => { b.classList.add("bump"); setTimeout(() => b.classList.remove("bump"), 300); });

  const todayPage = $(`[data-page="today"]`);
  todayPage.addEventListener("click", (e) => {
    const chk = e.target.closest(".dl__check");
    if (chk) return complete(+chk.closest("[data-task]").dataset.task);
    const t = e.target.closest("[data-toggle]");
    if (t) { const k = t.dataset.toggle; closed.has(k) ? closed.delete(k) : closed.add(k); t.closest(".dl__card").classList.toggle("is-closed"); t.setAttribute("aria-expanded", String(!closed.has(k))); buzz(6); return; }
    if (e.target.closest("[data-add]")) return openSheet();
    if (e.target.closest("[data-showdone]")) { showDone = !showDone; renderToday(); }
  });
  todayPage.addEventListener("keydown", (e) => { const t = e.target.closest("[data-toggle]"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); t.click(); } });

  // Swipe right to complete, left to delete (with undo), as in the app.
  let drag = null;
  todayPage.addEventListener("pointerdown", (e) => {
    const task = e.target.closest(".dl__task"); if (!task || e.target.closest(".dl__check") || task.classList.contains("dl__task--sub")) return;
    drag = { task, x: e.clientX, y: e.clientY, dx: 0, on: false, id: e.pointerId };
  });
  todayPage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3) { drag.on = true; drag.task.classList.add("is-dragging"); drag.task.setPointerCapture?.(e.pointerId); } else if (Math.abs(dy) > 10) { drag = null; return; } else return; }
    drag.dx = dx; drag.task.style.transform = `translateX(${dx}px)`;
    const row = drag.task.closest(".dl__row"), w = row.offsetWidth;
    row.querySelector(".done").style.opacity = dx > 0 ? Math.min(1, dx / (w * 0.3)) : 0;
    row.querySelector(".del").style.opacity = dx < 0 ? Math.min(1, -dx / (w * 0.3)) : 0;
    if (!drag.passed && Math.abs(dx) > w * 0.35) { drag.passed = true; buzz(10); } else if (drag.passed && Math.abs(dx) < w * 0.35) drag.passed = false;
  });
  const endDrag = () => {
    if (!drag) return; const d = drag; drag = null;
    d.task.classList.remove("is-dragging");
    if (!d.on) return;
    const w = d.task.offsetWidth, id = +d.task.dataset.task;
    if (d.dx > w * 0.35) { d.task.style.transform = `translateX(${w}px)`; complete(id); }
    else if (d.dx < -w * 0.35) { d.task.style.transform = `translateX(${-w}px)`; remove(id); }
    else { d.task.style.transform = ""; const r = d.task.closest(".dl__row"); r.querySelectorAll(".dl__row-bg").forEach((b) => (b.style.opacity = 0)); }
  };
  todayPage.addEventListener("pointerup", endDrag); todayPage.addEventListener("pointercancel", endDrag);

  // ---------------- Quick add (natural typing) ----------------
  const WD = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  function parse(text) {
    const out = { date: "Today", prio: null, tags: [] }; let s = " " + text + " ";
    s = s.replace(/\s!(urgent|u|high|h|medium|med|m|low|l)\b/i, (_, p) => { p = p.toLowerCase()[0]; out.prio = { u: "urgent", h: "high", m: "medium", l: "low" }[p]; return " "; });
    s = s.replace(/\s#([\p{L}\p{N}_/-]+)/gu, (_, t) => { out.tags.push(t.toLowerCase()); return " "; });
    s = s.replace(/\s(today|tonight|tomorrow|tmrw)\b/i, (_, d) => { out.date = /^to(day|night)$/i.test(d) ? "Today" : "Tomorrow"; return " "; });
    s = s.replace(new RegExp(`\\s(?:on\\s)?(${WD.join("|")})\\b`, "i"), (_, d) => { out.date = d[0].toUpperCase() + d.slice(1).toLowerCase(); return " "; });
    out.title = s.replace(/\s+/g, " ").trim(); return out;
  }
  const input = $("[data-input]"), chips = $("[data-chips]");
  // Chips are updated in place, so only a chip that's new animates in; the rest stay still while you type.
  function renderChips() {
    const p = parse(input.value);
    const want = [["date", ms("calendar_today") + esc(p.date)]];
    if (p.prio) want.push(["prio", ms("flag", true).replace('class="ms f"', `class="ms f" style="color:${PR[p.prio]}"`) + p.prio[0].toUpperCase() + p.prio.slice(1)]);
    p.tags.forEach((t, i) => want.push([`tag${i}`, `#${esc(t)}`]));
    const have = new Map([...chips.children].map((el) => [el.dataset.k, el]));
    want.forEach(([k, html], i) => {
      let el = have.get(k);
      if (!el) { el = document.createElement("span"); el.className = "dl__chip"; el.dataset.k = k; }
      if (el._html !== html) { el.innerHTML = html; el._html = html; }
      if (chips.children[i] !== el) chips.insertBefore(el, chips.children[i] || null);
      have.delete(k);
    });
    have.forEach((el) => el.remove());
  }
  function openSheet() { $("[data-sheet]").inert = false; root.classList.add("is-adding"); renderChips(); setTimeout(() => input.focus({ preventScroll: true }), 120); buzz(8); }
  function closeSheet() { root.classList.remove("is-adding"); input.blur(); $("[data-sheet]").inert = true; }
  $("[data-sheet]").inert = true;
  input.addEventListener("input", renderChips);
  $$("[data-close]").forEach((b) => b.addEventListener("click", closeSheet));
  $("[data-sheet]").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = parse(input.value); if (!p.title) { input.focus(); return; }
    const k = { id: nextId++, t: p.title, p: p.prio || "medium", tags: p.tags };
    input.value = ""; closeSheet(); buzz(12);
    if (p.date === "Today") { today.push(k); show("today"); renderToday(k.id); bump(); }
    else snack(`Added to ${p.date}`, null);
  });
  $("[data-fab]").addEventListener("click", () => (current === "habits" ? snack("Make your own habits in the app", null) : openSheet()));

  // ---------------- Habits ----------------
  const todayIdx = (now.getDay() + 6) % 7; // Monday first
  function renderHabits() {
    const page = $(`[data-page="habits"]`), y = page.scrollTop;
    const done = habits.filter(habitDone).length;
    page.innerHTML = `
      <div class="dl__bar"></div>
      <h3 class="dl__h1">Habits</h3>
      <p class="dl__sub">${done} of ${habits.length} done today</p>
      <div class="dl__days">${"MTWTFSS".split("").map((d, i) => `<span class="${i === todayIdx ? "on" : ""}">${d}</span>`).join("")}</div>
      ${habits.map((h) => {
        const c = dark.matches ? h.cd : h.c, isDone = habitDone(h);
        const dots = Array.from({ length: 7 }, (_, d) => {
          let cls = "";
          if (d < todayIdx) cls = h.week[(d + 7 - todayIdx) % 3] ? "on" : "";
          else if (d === todayIdx) cls = isDone ? "on now" : h.goal && h.count > 0 ? "part now" : "now";
          return `<i class="dl__dot ${cls}">${ms("check")}</i>`;
        }).join("");
        const streak = h.streak + (isDone && !h.unit ? 1 : 0);
        const action = h.goal
          ? `<div class="dl__counter"><button class="dl__minus" data-minus="${h.id}" aria-label="One less" ${h.count ? "" : "disabled"}>${ms("remove")}</button><b>${h.count}/${h.goal}</b>`
            + `<button class="dl__hbtn" data-plus="${h.id}" aria-label="${isDone ? `Done: ${h.goal} of ${h.goal}, tap to undo one` : "One more"}">${ms(isDone ? "check" : "add")}</button></div>`
          : `<button class="dl__hbtn" data-habit="${h.id}" aria-pressed="${isDone}" aria-label="${isDone ? "Undo" : "Check in"} ${h.name}">${ms("check")}</button>`;
        return `<div class="dl__habit${isDone ? " is-done" : ""}" style="--hc:${c}">
          <div class="dl__hrow"><span class="dl__htile">${ms(h.icon, true)}</span>
            <div><div class="dl__hname">${h.name}</div><div class="dl__hstreak">${ms("local_fire_department", true)}${streak} ${h.unit || "day"}${streak === 1 ? "" : "s"} · ${h.every}</div></div>
            ${action}</div>
          <div class="dl__week">${dots}</div></div>`;
      }).join("")}`;
    page.scrollTop = y;
    renderProgress();
  }
  $(`[data-page="habits"]`).addEventListener("click", (e) => {
    const b = e.target.closest("[data-habit],[data-plus],[data-minus]"); if (!b) return;
    const h = habits.find((x) => x.id === (b.dataset.habit || b.dataset.plus || b.dataset.minus));
    const was = habitDone(h);
    if (b.dataset.habit) h.done = !h.done;
    if (b.dataset.plus) h.count = was ? h.goal - 1 : Math.min(h.goal, h.count + 1);
    if (b.dataset.minus) h.count = Math.max(0, h.count - 1);
    buzz(!was && habitDone(h) ? [14, 40, 22] : 6);
    renderHabits();
    const sel = b.dataset.habit ? `[data-habit="${h.id}"]` : b.dataset.plus ? `[data-plus="${h.id}"]` : `[data-minus="${h.id}"]`;
    $(sel)?.focus({ preventScroll: true });
  });

  // ---------------- More ----------------
  const tile = (icon, bg, fg) => `<span class="dl__tile" style="background:${bg};color:${fg}">${ms(icon, true)}</span>`;
  const item = (key, icon, bg, fg, title, sub) => `<button class="dl__item" data-go="${key}">${tile(icon, bg, fg)}<span><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span>${ms("chevron_right")}</button>`;
  $(`[data-page="more"]`).innerHTML = `
    <div class="dl__bar"></div>
    <h3 class="dl__h1">More</h3>
    <p class="dl__sub">Everything else in Dayline</p>
    <div class="dl__label">Writing</div>
    <div class="dl__list">${item("app", "auto_stories", "var(--tertiary-c, color-mix(in srgb, var(--tertiary) 16%, transparent))", "var(--tertiary)", "Journal", "Reflect on your day")}</div>
    <div class="dl__label">Tasks</div>
    <div class="dl__list">
      ${item("app", "inbox", "var(--primary-c)", "var(--primary)", "Inbox", "2 to sort")}
      ${item("app", "upcoming", "var(--primary-c)", "var(--primary)", "Upcoming", "4 scheduled")}
      ${item("app", "check_circle", "var(--primary-c)", "var(--primary)", "All tasks", "12 open")}
      ${item("app", "done_all", "var(--primary-c)", "var(--primary)", "Completed", "40 done")}
    </div>
    <div class="dl__label">Productivity</div>
    <div class="dl__list">
      ${item("focus", "timer", "color-mix(in srgb, var(--tertiary) 16%, transparent)", "var(--tertiary)", "Focus timer", "")}
      ${item("stats", "bar_chart", "color-mix(in srgb, var(--tertiary) 16%, transparent)", "var(--tertiary)", "Statistics", "")}
    </div>`;
  $(`[data-page="more"]`).addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]"); if (!b) return;
    if (b.dataset.go === "app") return snack("That one's in the app", null);
    show(b.dataset.go, { push: true });
  });

  // ---------------- Focus ----------------
  const FULL = 25 * 60; let left = FULL, timer = null;
  const C2 = 2 * Math.PI * 120;
  $(`[data-page="focus"]`).innerHTML = `
    <div class="dl__bar dl__bar--back"><button class="dl__icon" data-back aria-label="Back">${ms("arrow_back")}</button></div>
    <h3 class="dl__h1">Focus</h3>
    <p class="dl__sub">Session 1 of 4 · ${focusMin}m focused today</p>
    <div class="dl__focus" data-focus>
      <div class="dl__fring"><svg viewBox="0 0 270 270"><circle class="t" cx="135" cy="135" r="120"/><circle class="f" data-fring cx="135" cy="135" r="120" stroke-dasharray="${C2}" stroke-dashoffset="0"/></svg>
        <div class="dl__ftime"><b data-ftime>25:00</b><small data-fstate>Focus</small></div></div>
      <button class="dl__chip" style="margin-top:calc(20 * var(--dp))">${ms("check_circle")}<span data-ftask></span></button>
      <div class="dl__fbtns"><button class="dl__btn dl__btn--tonal" data-freset>${ms("replay")}Reset</button><button class="dl__btn dl__btn--filled" data-fgo>${ms("play_arrow", true)}Start</button></div>
    </div>`;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const paint = () => { $("[data-ftime]").textContent = fmt(left); $("[data-fring]").style.strokeDashoffset = String(C2 * (1 - left / FULL)); };
  const fgo = $("[data-fgo]");
  function setRunning(on) {
    $("[data-focus]").classList.toggle("is-running", on);
    fgo.innerHTML = on ? `${ms("pause", true)}Pause` : `${ms("play_arrow", true)}${left < FULL ? "Resume" : "Start"}`;
    $("[data-fstate]").textContent = on ? "Focusing" : left < FULL ? "Paused" : "Focus";
  }
  fgo.addEventListener("click", () => {
    if (timer) { clearInterval(timer); timer = null; setRunning(false); buzz(8); return; }
    $("[data-ftask]").textContent = (allTasks()[0] || { t: "Your next task" }).t;
    timer = setInterval(() => { left = Math.max(0, left - 1); paint(); if (!left) { clearInterval(timer); timer = null; left = FULL; focusMin += 25; buzz([60, 80, 60]); setRunning(false); $("[data-fstate]").textContent = "Break time"; paint(); renderProgress(); } }, 1000);
    setRunning(true); buzz(12);
  });
  $("[data-freset]").addEventListener("click", () => { clearInterval(timer); timer = null; left = FULL; paint(); setRunning(false); buzz(6); });
  $("[data-ftask]").textContent = (allTasks()[0] || { t: "Your next task" }).t;

  renderToday(); renderHabits(); paint();
})();
