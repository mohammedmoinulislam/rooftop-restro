/* ==========================================================================
   CIELO — Rooftop Dining, Dhaka
   Vanilla JavaScript: navigation, scroll reveal, smooth scroll, reservation
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------
     Utilities
     ---------------------------------------------------------------------- */
  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* ----------------------------------------------------------------------
     Sticky navigation — gains a compact state after the hero begins
     ---------------------------------------------------------------------- */
  var nav = $("#nav");
  var scrollThreshold = 40;

  function updateNavState() {
    if (!nav) { return; }
    if (window.scrollY > scrollThreshold) {
      nav.classList.add("is-scrolled");
    } else {
      nav.classList.remove("is-scrolled");
    }
  }

  /* ----------------------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------------------- */
  var navToggle = $("#navToggle");
  var mobileNav = $("#mobileNav");

  function openMobileNav() {
    if (!mobileNav || !navToggle) { return; }
    mobileNav.classList.add("is-open");
    mobileNav.setAttribute("aria-hidden", "false");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    document.body.classList.add("is-locked");
  }

  function closeMobileNav() {
    if (!mobileNav || !navToggle) { return; }
    mobileNav.classList.remove("is-open");
    mobileNav.setAttribute("aria-hidden", "true");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    if (!isReservationOpen()) {
      document.body.classList.remove("is-locked");
    }
  }

  function isMobileNavOpen() {
    return !!mobileNav && mobileNav.classList.contains("is-open");
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      if (isMobileNavOpen()) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });
  }

  /* ----------------------------------------------------------------------
     Smooth scrolling with sticky-header offset
     ---------------------------------------------------------------------- */
  var internalLinks = $$('a[href^="#"]').filter(function (link) {
    var href = link.getAttribute("href");
    return href && href.length > 1;
  });

  function scrollToTarget(target) {
    var headerHeight = nav ? nav.getBoundingClientRect().height : 0;
    var top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 8;

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  }

  internalLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var id = link.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (!target) { return; }

      event.preventDefault();

      if (isMobileNavOpen()) {
        closeMobileNav();
        // Wait for the overlay to release the scroll lock before moving
        window.setTimeout(function () { scrollToTarget(target); }, prefersReducedMotion ? 0 : 320);
      } else {
        scrollToTarget(target);
      }

      if (history.replaceState) {
        history.replaceState(null, "", "#" + id);
      }
    });
  });

  /* ----------------------------------------------------------------------
     Active section highlighting in the primary navigation
     ---------------------------------------------------------------------- */
  var navAnchors = $$(".nav__links > a");
  var observedSections = navAnchors
    .map(function (anchor) { return document.getElementById(anchor.getAttribute("href").slice(1)); })
    .filter(Boolean);

  function setActiveLink(id) {
    navAnchors.forEach(function (anchor) {
      var isMatch = anchor.getAttribute("href") === "#" + id;
      anchor.classList.toggle("is-active", isMatch);
      if (isMatch) {
        anchor.setAttribute("aria-current", "true");
      } else {
        anchor.removeAttribute("aria-current");
      }
    });
  }

  /* ----------------------------------------------------------------------
     Scroll reveal — quiet, staggered, once only
     ---------------------------------------------------------------------- */
  var revealItems = $$("[data-reveal]");

  function revealAll() {
    revealItems.forEach(function (item) { item.classList.add("is-revealed"); });
  }

  function applyStagger() {
    // Group siblings so each cluster rises in sequence rather than at once
    var groups = [
      ".story__text > [data-reveal]",
      ".story__media > [data-reveal]",
      ".feature__text > [data-reveal]",
      ".menu__list li",
      ".location__details .location__row",
      ".footer__col"
    ];

    groups.forEach(function (selector) {
      $$(selector).forEach(function (item, index) {
        var step = Math.min(index, 6) * 90;
        item.style.setProperty("--reveal-delay", step + "ms");
      });
    });
  }

  function initReveal() {
    applyStagger();

    if (!revealItems.length || prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12
    });

    revealItems.forEach(function (item) { revealObserver.observe(item); });
  }

  var sectionObserver = null;

  function initSectionObserver() {
    if (!observedSections.length || !("IntersectionObserver" in window)) { return; }

    sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    }, {
      rootMargin: "-45% 0px -50% 0px",
      threshold: 0
    });

    observedSections.forEach(function (section) { sectionObserver.observe(section); });
  }

  /* ----------------------------------------------------------------------
     Reservation modal
     ---------------------------------------------------------------------- */
  var reservation = $("#reservation");
  var reservationForm = $("#reservationForm");
  var reservationError = $("#reservationError");
  var reservationSuccess = $("#reservationSuccess");
  var lastFocusedElement = null;

  function isReservationOpen() {
    return !!reservation && reservation.classList.contains("is-open");
  }

  function openReservation() {
    if (!reservation) { return; }
    lastFocusedElement = document.activeElement;
    reservation.classList.add("is-open");
    reservation.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");

    var firstField = $("input, select, textarea, button", $(".reservation__panel"));
    window.setTimeout(function () {
      var nameField = $("#resName");
      (nameField || firstField || reservation).focus({ preventScroll: true });
    }, prefersReducedMotion ? 0 : 120);
  }

  function closeReservation() {
    if (!reservation) { return; }
    reservation.classList.remove("is-open");
    reservation.setAttribute("aria-hidden", "true");

    if (!isMobileNavOpen()) {
      document.body.classList.remove("is-locked");
    }

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  $$("[data-open-reservation]").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      if (isMobileNavOpen()) { closeMobileNav(); }
      openReservation();
    });
  });

  $$("[data-close-reservation]").forEach(function (trigger) {
    trigger.addEventListener("click", closeReservation);
  });

  // Keep keyboard focus inside the dialog while it is open
  if (reservation) {
    reservation.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") { return; }

      var focusable = $$(FOCUSABLE, reservation).filter(function (element) {
        return element.offsetParent !== null;
      });
      if (!focusable.length) { return; }

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") { return; }
    if (isReservationOpen()) {
      closeReservation();
    } else if (isMobileNavOpen()) {
      closeMobileNav();
    }
  });

  /* ----------------------------------------------------------------------
     Reservation form — light validation, local acknowledgement
     ---------------------------------------------------------------------- */
  var dateField = $("#resDate");

  if (dateField) {
    var today = new Date();
    var iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    dateField.min = iso;
  }

  if (reservationForm) {
    reservationForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var fields = $$("input[required], select[required]", reservationForm);
      var isValid = fields.every(function (field) {
        return field.checkValidity() && field.value.trim() !== "";
      });

      if (reservationSuccess) { reservationSuccess.hidden = true; }

      if (!isValid) {
        if (reservationError) { reservationError.hidden = false; }
        var firstInvalid = fields.filter(function (field) {
          return !field.checkValidity() || field.value.trim() === "";
        })[0];
        if (firstInvalid) { firstInvalid.focus(); }
        return;
      }

      if (reservationError) { reservationError.hidden = true; }
      if (reservationSuccess) { reservationSuccess.hidden = false; }

      reservationForm.reset();
      if (dateField && dateField.min) { dateField.min = dateField.min; }

      var submitButton = $(".reservation__submit", reservationForm);
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.style.opacity = "0.6";
        window.setTimeout(function () {
          submitButton.disabled = false;
          submitButton.style.opacity = "";
        }, 1400);
      }
    });
  }

  /* ----------------------------------------------------------------------
     Footer year
     ---------------------------------------------------------------------- */
  var yearSlot = $("#year");
  if (yearSlot) {
    yearSlot.textContent = String(new Date().getFullYear());
  }

  /* ----------------------------------------------------------------------
     Scroll listener (rAF-throttled)
     ---------------------------------------------------------------------- */
  var ticking = false;

  function onScroll() {
    if (ticking) { return; }
    ticking = true;
    window.requestAnimationFrame(function () {
      updateNavState();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  /* ----------------------------------------------------------------------
     Initialise
     ---------------------------------------------------------------------- */
  function init() {
    updateNavState();
    initReveal();
    initSectionObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();