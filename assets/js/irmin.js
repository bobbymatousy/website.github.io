/* assets/js/irmin.js */
(function () {
  const root = document.documentElement;

  // =========================================
  // Helpers
  // =========================================
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isTouch =
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

  const getHeaderOffset = () => {
    const v = getComputedStyle(root).getPropertyValue("--header-offset").trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 88;
  };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const getMaxScroll = () => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollHeight - window.innerHeight);
  };

  // =========================================
  // Active nav highlight (sets aria-current)
  // =========================================
  (function setActiveNav() {
    const nav = document.querySelector("[data-nav]");
    if (!nav) return;

    const path = location.pathname.split("/").pop() || "index.html";
    nav.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const p = href.split("/").pop();
      if (!p) return;
      if (p === path) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  })();

  // =========================================
  // Mobile nav toggle (+ close behaviors)
  // =========================================
  (function mobileNav() {
    const toggle = document.querySelector("[data-mobile-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.setAttribute("data-open", open ? "true" : "false");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    const isOpen = () => nav.getAttribute("data-open") === "true";

    toggle.addEventListener("click", () => setOpen(!isOpen()));

    // Close when clicking a link (mobile UX)
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      // If it's a same-page anchor, still close menu
      setOpen(false);
    });

    // Close on Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    // Close when clicking outside (only when open)
    document.addEventListener("click", (e) => {
      if (!isOpen()) return;
      const insideNav = nav.contains(e.target);
      const insideToggle = toggle.contains(e.target);
      if (!insideNav && !insideToggle) setOpen(false);
    });

    // Close if resizing to desktop
    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > 900) setOpen(false);
      },
      { passive: true }
    );
  })();

  // =========================================
  // Footer year
  // =========================================
  (function footerYear() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());
  })();

  // =========================================
  // Premium reveal animations (optional)
  // Use: add data-reveal on sections/cards you want animated
  // =========================================
  (function reveal() {
    if (prefersReducedMotion) return;

    const items = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => io.observe(el));
  })();

  // =========================================
  // Premium smooth/inertial scrolling (desktop)
  // - Keeps native scroll on touch devices
  // - Disabled when prefers-reduced-motion = true
  // - Can be disabled by adding: <html data-smooth-scroll="off">
  // =========================================
  (function premiumScroll() {
    if (prefersReducedMotion) return;
    if (isTouch) return;
    if (root.getAttribute("data-smooth-scroll") === "off") return;

    let current = window.scrollY || 0;
    let target = current;
    let maxScroll = getMaxScroll();
    let rafId = null;

    // Avoid hijacking scroll inside scrollable containers
    function isScrollableEl(el) {
      for (let node = el; node && node !== document.body; node = node.parentElement) {
        const style = window.getComputedStyle(node);
        const canScrollY =
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight + 1;
        if (canScrollY) return true;
      }
      return false;
    }

    function normalizeDelta(e) {
      // deltaMode: 0=pixels, 1=lines, 2=pages
      if (e.deltaMode === 1) return e.deltaY * 16;
      if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
      return e.deltaY;
    }

    function tick() {
      const diff = target - current;

      if (Math.abs(diff) < 0.4) {
        current = target;
        window.scrollTo(0, current);
        rafId = null;
        return;
      }

      // Premium smoothing factor
      current += diff * 0.12;

      window.scrollTo(0, current);
      rafId = requestAnimationFrame(tick);
    }

    function onWheel(e) {
      // Allow zoom gestures and system modifiers
      if (e.ctrlKey || e.metaKey) return;

      // Allow normal scroll inside internal scroll containers
      if (isScrollableEl(e.target)) return;

      e.preventDefault();

      maxScroll = getMaxScroll();

      const delta = normalizeDelta(e);
      target = clamp(target + delta, 0, maxScroll);

      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("wheel", onWheel, { passive: false });

    // Keep synced if user scrolls via keyboard/scrollbar
    window.addEventListener(
      "scroll",
      () => {
        if (rafId) return;
        current = window.scrollY || 0;
        target = current;
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => {
        maxScroll = getMaxScroll();
        target = clamp(target, 0, maxScroll);
        current = clamp(current, 0, maxScroll);
      },
      { passive: true }
    );

    // Anchor clicks: smooth + header offset, works even with inertial scroll
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const el = document.querySelector(href);
      if (!el) return;

      e.preventDefault();

      const offset = getHeaderOffset();
      const top = el.getBoundingClientRect().top + window.scrollY - offset;

      maxScroll = getMaxScroll();
      target = clamp(top, 0, maxScroll);

      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  })();
})();
