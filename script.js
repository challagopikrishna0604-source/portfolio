(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  /* ---------- Theme with circular wipe ---------- */
  function isDark() {
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : darkQuery.matches;
  }
  var themeBtn = document.getElementById("themeToggle");
  function syncTheme() { themeBtn.classList.toggle("is-dark", isDark()); }
  try {
    var saved = localStorage.getItem("cgk-theme");
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  } catch (e) { /* storage unavailable */ }
  syncTheme();

  function applyTheme(next) {
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("cgk-theme", next); } catch (e) { /* ignore */ }
    syncTheme();
  }
  themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    var rect = themeBtn.getBoundingClientRect();
    var x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    if (!document.startViewTransition || reduceMotion) { applyTheme(next); return; }
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.classList.add("no-t");
    var vt;
    try { vt = document.startViewTransition(function () { applyTheme(next); }); }
    catch (e) { applyTheme(next); root.classList.remove("no-t"); return; }
    vt.ready.then(function () {
      root.animate(
        { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"] },
        { duration: 750, easing: "cubic-bezier(0.22, 0.8, 0.24, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(function () {});
    vt.finished.then(function () { root.classList.remove("no-t"); }, function () { root.classList.remove("no-t"); });
  });
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", syncTheme);

  /* ---------- Header, progress bar, hero parallax ---------- */
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".progress");
  var heroName = document.getElementById("heroName");
  var ticking = false, lastY = window.scrollY || 0, scrollSpeed = 0;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 8);
    progress.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    if (!reduceMotion && y < 1000) heroName.style.transform = "translateY(" + (y * 0.12).toFixed(1) + "px)";
    scrollSpeed = Math.abs(y - lastY);
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("nav");
  function setMenu(open) {
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ---------- In-page links ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-scroll]"), function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var target = document.querySelector(a.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      setMenu(false);
    });
  });
  var offset = document.createElement("style");
  offset.textContent = "section[id], main[id] { scroll-margin-top: calc(76px + env(safe-area-inset-top, 0px)); }";
  document.head.appendChild(offset);

  /* ---------- Sliding nav marker ---------- */
  var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
  var ind = document.createElement("span");
  ind.className = "nav-ind";
  nav.appendChild(ind);
  var activeLink = null;
  function place(a) {
    if (!a || window.innerWidth <= 820) { ind.style.opacity = "0"; return; }
    ind.style.opacity = "1";
    ind.style.width = (a.offsetWidth - 24) + "px";
    ind.style.transform = "translateX(" + (a.offsetLeft + 12) + "px)";
  }
  links.forEach(function (a) { a.addEventListener("mouseenter", function () { place(a); }); });
  nav.addEventListener("mouseleave", function () { place(activeLink); });
  window.addEventListener("resize", function () { place(activeLink); });

  if ("IntersectionObserver" in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + entry.target.id;
          a.classList.toggle("active", on);
          if (on) activeLink = a;
        });
        place(activeLink);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute("href")); if (s) navObserver.observe(s); });
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { activeLink = null; links.forEach(function (a) { a.classList.remove("active"); }); place(null); }
    }, { rootMargin: "-45% 0px -50% 0px" }).observe(document.getElementById("hero"));
  }

  /* ---------- Split section headings into words ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".head-reveal h2"), function (h) {
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    words.forEach(function (word, i) {
      var span = document.createElement("span");
      span.className = "w";
      span.style.setProperty("--wi", i);
      span.textContent = word;
      h.appendChild(span);
      if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
    });
  });

  /* ---------- Reveal on scroll ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (el) {
    var sibs = Array.prototype.slice.call(el.parentNode.children).filter(function (c) { return c.classList.contains("reveal"); });
    el.style.setProperty("--rd", Math.min(sibs.indexOf(el), 5) * 90 + "ms");
  });
  Array.prototype.forEach.call(document.querySelectorAll(".stagger"), function (list) {
    Array.prototype.forEach.call(list.children, function (child, i) { child.style.setProperty("--i", i); });
  });
  function runCounters(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll(".count"), function (el) {
      var to = parseInt(el.getAttribute("data-to"), 10), start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / 1300, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      el.textContent = "0";
      requestAnimationFrame(step);
    });
  }
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal, .head-reveal, .stagger"));
  var sectionEls = Array.prototype.slice.call(document.querySelectorAll(".section"));
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("in");
        revealObserver.unobserve(el);
        if (el.classList.contains("stagger")) setTimeout(function () { el.classList.add("done"); }, 1600);
        if (el.querySelector(".count")) runCounters(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { revealObserver.observe(el); });

    var lineObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("drawn"); lineObserver.unobserve(entry.target); }
      });
    }, { threshold: 0.05 });
    sectionEls.forEach(function (s) { lineObserver.observe(s); });
    setTimeout(function () { runCounters(document.getElementById("stats")); }, 900);
  } else {
    revealEls.forEach(function (el) { el.classList.add("in", "done"); });
  }

  /* ---------- Rotating role line ---------- */
  var roles = ["Java full stack developer", "React.js front-end builder", "Excel and Power BI reporter", "DSA problem solver"];
  var rotator = document.getElementById("rotator");
  var roleIndex = 0;
  if (!reduceMotion) {
    setInterval(function () {
      rotator.classList.add("out");
      setTimeout(function () {
        roleIndex = (roleIndex + 1) % roles.length;
        rotator.textContent = roles[roleIndex];
        rotator.classList.remove("out");
        rotator.classList.add("pre");
        void rotator.offsetWidth;
        rotator.classList.remove("pre");
      }, 380);
    }, 3400);
  }

  /* ---------- Skills marquee, reacts to scroll speed ---------- */
  var marquee = document.getElementById("marquee");
  var track = document.getElementById("track");
  var marqueeAnim = null, rate = 1;
  if (reduceMotion || !track.animate) {
    marquee.classList.add("static");
  } else {
    var singleWidth = track.scrollWidth;
    var originals = Array.prototype.slice.call(track.children);
    var copies = Math.ceil((window.screen.width || window.innerWidth) / singleWidth) + 1;
    for (var c = 0; c < copies; c++) {
      originals.forEach(function (item) {
        var clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
    }
    marqueeAnim = track.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-" + singleWidth + "px)" }],
      { duration: 36000, iterations: Infinity, easing: "linear" }
    );
    (function tick() {
      var target = 1 + Math.min(scrollSpeed / 5, 7);
      rate += (target - rate) * 0.08;
      scrollSpeed *= 0.9;
      if (marqueeAnim) marqueeAnim.playbackRate = rate;
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- Project accordion ---------- */
  var projects = Array.prototype.slice.call(document.querySelectorAll(".project"));
  projects.forEach(function (p) {
    var head = p.querySelector(".project-head");
    head.addEventListener("click", function () {
      var wasOpen = p.classList.contains("open");
      projects.forEach(function (q) {
        q.classList.remove("open");
        q.querySelector(".project-head").setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) { p.classList.add("open"); head.setAttribute("aria-expanded", "true"); }
    });
  });

  /* ---------- Pointer effects (fine pointers only) ---------- */
  if (finePointer && !reduceMotion) {
    var hero = document.getElementById("hero");
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", (e.clientX - r.left) + "px");
      hero.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-spot]"), function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-magnet]"), function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
        b.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
    var card = document.getElementById("profileCard");
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "rotateY(" + (px * 12).toFixed(2) + "deg) rotateX(" + (-py * 12).toFixed(2) + "deg)";
      card.style.setProperty("--gx", (px + 0.5) * 100 + "%");
      card.style.setProperty("--gy", (py + 0.5) * 100 + "%");
    });
    card.addEventListener("pointerleave", function () { card.style.transform = ""; });
  }

  /* ---------- Copy buttons ---------- */
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".copy"), function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
