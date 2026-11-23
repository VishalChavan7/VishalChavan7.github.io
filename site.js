/* Dayline site: the working phone, live release info, and quiet motion. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const REPO = "VishalChavan7/Dayline";

  // ---------- Pictures: fetched early, shown with a fade ----------
  // Every picture further down starts downloading as soon as the page itself has loaded, so they're ready
  // before you scroll to them. Any that aren't ready yet fade in once decoded rather than blinking in.
  const pics = $$("main img, footer img").filter((img) => !img.closest("[data-dl-app]"));
  pics.forEach((img) => {
    if (img.complete && img.naturalWidth) return;
    img.classList.add("is-loading");
    const show = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => img.classList.remove("is-loading"));
    img.addEventListener("load", show, { once: true });
    img.addEventListener("error", () => img.classList.remove("is-loading"), { once: true });
  });
  const warm = () => pics.forEach((img) => { if (img.loading === "lazy") img.loading = "eager"; });
  if (document.readyState === "complete") setTimeout(warm, 300);
  else addEventListener("load", () => setTimeout(warm, 300), { once: true });

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
  $$(".reveal, [data-reveal-bars], .site-footer").forEach((el) => (io ? io.observe(el) : el.classList.add("is-in")));

  // ---------- Smooth scrolling (Lenis), off for people who prefer less motion ----------
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let lenis = null;
  if (window.Lenis && !still.matches) {
    lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true, anchors: false });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    lenis.on("scroll", onScroll);
  }
  // In-page links glide to their section (and leave room for the sticky bar).
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"], a[href^="./#"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = a.getAttribute("href").replace(/^\.\//, "");
    const target = id === "#" ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (target.tagName === "DETAILS") target.open = true;
    // Land exactly where a plain #link would: the target's scroll-margin if it has one, else just under the nav.
    const gap = parseFloat(getComputedStyle(target).scrollMarginTop) || nav.offsetHeight + 12;
    // Where it sits in the page, ignoring transforms (a section still waiting to fade in is shifted down a little)
    let y = 0; for (let e = target; e; e = e.offsetParent) y += e.offsetTop;
    const top = Math.max(0, y - gap);
    if (lenis) lenis.scrollTo(top, { duration: 1.2 });
    else scrollTo({ top, behavior: still.matches ? "auto" : "smooth" });
    history.replaceState(null, "", id);
  });

  // ---------- Magnetic buttons ----------
  // Each button sits on a soft spring and leans toward the pointer when it comes near. Buttons side by side
  // collide instead of overlapping: they push apart and bounce back off each other, then settle.
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  if (finePointer.matches && !still.matches) {
    const magnets = $$(".button, .cta").map((el) => ({ el, label: $(".label", el), x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, r: null }));
    const STIFF = 0.045, FRICTION = 0.86, BOUNCE = 0.85, GAP = 3;
    let px = -1e4, py = -1e4, running = false, last = 0;
    const clamp = (v, max) => Math.max(-max, Math.min(max, v));
    const groups = [...new Set(magnets.map((m) => m.el.parentElement))].map((p) => magnets.filter((m) => m.el.parentElement === p)).filter((g) => g.length > 1);

    function targets() {
      magnets.forEach((m) => {
        const b = m.el.getBoundingClientRect();
        m.r = { l: b.left - m.x, t: b.top - m.y, w: b.width, h: b.height }; // where the button sits at rest
        m.tx = m.ty = 0;
        if (b.bottom < -80 || b.top > innerHeight + 80) return;
        const dx = px - (m.r.l + m.r.w / 2), dy = py - (m.r.t + m.r.h / 2);
        if (Math.abs(dx) < m.r.w / 2 + 36 && Math.abs(dy) < m.r.h / 2 + 30) {
          const pull = m.el.classList.contains("cta") ? 0.12 : 0.16;
          m.tx = clamp(dx * pull, 10); m.ty = clamp(dy * pull * 1.2, 7);
        }
      });
    }
    function collide(a, b) {
      const al = a.r.l + a.x, at = a.r.t + a.y, bl = b.r.l + b.x, bt = b.r.t + b.y;
      const ox = Math.min(al + a.r.w, bl + b.r.w) - Math.max(al, bl) + GAP;
      const oy = Math.min(at + a.r.h, bt + b.r.h) - Math.max(at, bt) + GAP;
      if (ox <= 0 || oy <= 0) return;
      // push apart along the shallower overlap, then trade momentum with a lively bounce
      const alongX = ox < oy, n = alongX ? Math.sign(bl - al) || 1 : Math.sign(bt - at) || 1;
      const k = alongX ? "x" : "y", v = alongX ? "vx" : "vy", o = alongX ? ox : oy;
      a[k] -= n * o / 2; b[k] += n * o / 2;
      const closing = (a[v] - b[v]) * n;
      if (closing > 0) {
        // The first real hit bounces them apart with a little extra kick; touches right after that are soft,
        // so they settle against each other instead of rattling.
        const now = performance.now(), fresh = closing > 0.3 && now - (a.hit || 0) > 600 && now - (b.hit || 0) > 600;
        const j = fresh ? (1 + BOUNCE) * closing / 2 + closing * 0.7 : 1.2 * closing / 2;
        if (fresh) a.hit = b.hit = now;
        a[v] -= n * j; b[v] += n * j;
      }
    }
    function step(now) {
      const dt = Math.min(2.5, (now - last) / 16.67 || 1); last = now;
      targets();
      let moving = false;
      for (const m of magnets) {
        m.vx = (m.vx + (m.tx - m.x) * STIFF * dt) * Math.pow(FRICTION, dt);
        m.vy = (m.vy + (m.ty - m.y) * STIFF * dt) * Math.pow(FRICTION, dt);
        m.x += m.vx * dt; m.y += m.vy * dt;
      }
      groups.forEach((g) => { for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) collide(g[i], g[j]); });
      for (const m of magnets) {
        const rest = Math.abs(m.x) < 0.05 && Math.abs(m.y) < 0.05 && Math.abs(m.vx) < 0.05 && Math.abs(m.vy) < 0.05 && !m.tx && !m.ty;
        if (rest) { m.x = m.y = m.vx = m.vy = 0; m.el.style.translate = ""; if (m.label) m.label.style.translate = ""; continue; }
        moving = true;
        m.el.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
        if (m.label) m.label.style.translate = `${(m.x * 0.35).toFixed(2)}px ${(m.y * 0.35).toFixed(2)}px`;
      }
      if (moving) requestAnimationFrame(step); else running = false;
    }
    const kick = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } };
    addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; kick(); }, { passive: true });
    addEventListener("scroll", kick, { passive: true });
    document.addEventListener("pointerleave", () => { px = py = -1e4; kick(); });
  }

  // ---------- The apps, playing in the Mac and the phone ----------
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const players = $$("[data-video]").map((video) => ({ video, device: video.closest(".device") }));
  const small = matchMedia("(max-width: 760px)"); // phones don't show the video at all, so don't download it
  function loadVideos() {
    if (small.matches) return;
    const mode = dark.matches ? "dark" : "light";
    players.forEach(({ video, device }) => {
      const kind = video.dataset.video;
      const src = `media/${kind}-${mode}.mp4`;
      if (video.dataset.src === src) return;
      video.dataset.src = src;
      device.classList.remove("is-ready");
      video.poster = `media/${kind}-${mode}.webp`;
      video.src = src;
      // Show the spinner only if the preview is slow; give up quietly after 12 s and keep the still.
      clearTimeout(video._wait); clearTimeout(video._giveUp);
      video._wait = setTimeout(() => device.classList.add("is-waiting"), 500);
      video._giveUp = setTimeout(() => device.classList.add("is-ready"), 12000);
      if (!still.matches) video.play().catch(() => {});
    });
  }
  players.forEach(({ video, device }) => {
    const ready = () => { clearTimeout(video._wait); clearTimeout(video._giveUp); device.classList.remove("is-waiting"); device.classList.add("is-ready"); };
    video.addEventListener("playing", ready);
    if (still.matches) video.addEventListener("loadeddata", ready);
    video.addEventListener("waiting", () => { device.classList.remove("is-ready"); device.classList.add("is-waiting"); });
    video.addEventListener("error", ready);
  });
  if (players.length) {
    loadVideos();
    dark.addEventListener?.("change", loadVideos);
    small.addEventListener?.("change", loadVideos);
    // Pause when out of sight to save battery; carry on when it comes back.
    if ("IntersectionObserver" in window && !still.matches) {
      new IntersectionObserver((entries) => entries.forEach((e) => {
        players.forEach(({ video }) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause()));
      }), { threshold: 0.05 }).observe($(".devices"));
    }
  }

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

  // ---------- Mac screens: a stack of cards ----------
  // The front card flips away to the back of the pile; click it, swipe it, use the arrows, or let it run.
  const deck = $("[data-deck]");
  if (deck) {
    const cards = $$(".deck__card", deck), n = cards.length, cap = $("[data-deck-caption]", deck);
    const dots = document.createElement("span"); dots.className = "deck__dots"; dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = "<i></i>".repeat(n); $("[data-deck-next]", deck).before(dots);
    let front = 0, busy = false, timer = null, inView = false, hover = false;
    const place = () => {
      cards.forEach((c, i) => {
        const k = (i - front + n) % n;
        c.dataset.k = k; c.style.setProperty("--k", Math.min(k, 3));
        c.setAttribute("aria-hidden", String(k !== 0));
      });
      $$("i", dots).forEach((d, i) => d.classList.toggle("on", i === front));
    };
    const caption = (instant) => {
      const html = cards[front].dataset.caption;
      if (instant) { cap.innerHTML = html; return; }
      cap.classList.add("is-swap");
      setTimeout(() => { cap.innerHTML = html; cap.classList.remove("is-swap"); }, 260);
    };
    function go(dir) {
      if (busy) return; busy = true;
      const old = cards[front];
      front = (front + dir + n) % n;
      const anim = dir > 0 ? old : cards[front];
      anim.classList.add(dir > 0 ? "is-out" : "is-in");
      place(); caption();
      const done = () => { anim.classList.remove("is-out", "is-in"); busy = false; };
      if (still.matches) done(); else anim.addEventListener("animationend", done, { once: true });
      restart();
    }
    function restart() {
      clearInterval(timer); timer = null;
      if (!still.matches && inView && !hover) timer = setInterval(() => go(1), 4500);
    }
    $("[data-deck-next]", deck).addEventListener("click", () => go(1));
    $("[data-deck-prev]", deck).addEventListener("click", () => go(-1));
    deck.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); });
    deck.addEventListener("pointerenter", () => { hover = true; restart(); });
    deck.addEventListener("pointerleave", () => { hover = false; restart(); });
    deck.addEventListener("focusin", () => { hover = true; restart(); });
    deck.addEventListener("focusout", () => { hover = false; restart(); });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; restart(); }, { threshold: 0.4 }).observe(deck);
    // Tap the front card for the next one; drag it sideways to go either way.
    const stack = $("[data-deck-stack]", deck);
    let sx = null, moved = false;
    stack.addEventListener("pointerdown", (e) => { sx = e.clientX; moved = false; });
    stack.addEventListener("pointermove", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 8) moved = true; });
    stack.addEventListener("pointerup", (e) => {
      if (sx === null) return; const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); else if (!moved) go(1);
    });
    stack.addEventListener("pointercancel", () => (sx = null));
    place(); caption(true);
  }

  // ---------- Line the hero phone up with the phone in the video below ----------
  const tryBox = $(".hero__try"), tryPhone = $(".hero__try .dl"), stagePhone = $(".device--phone");
  if (tryBox && tryPhone && stagePhone) {
    const wide = matchMedia("(min-width: 1001px)");
    // Layout positions (offsetLeft ignores transforms, so entrance animations and the nudge itself don't skew it)
    const centre = (el) => { let x = el.offsetWidth / 2; for (let e = el; e; e = e.offsetParent) x += e.offsetLeft; return x; };
    const align = () => {
      tryBox.style.translate = wide.matches ? `${Math.round(centre(stagePhone) - centre(tryPhone))}px 0` : "";
    };
    new ResizeObserver(align).observe(document.documentElement);
    wide.addEventListener?.("change", align);
    addEventListener("load", align);
  }
})();
