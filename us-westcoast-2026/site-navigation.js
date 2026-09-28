(() => {
  const ledgerEnabled = () => !document.querySelector("#ledger-navigation-link")?.hidden;
  const deepTargets = new Set(["#flights", "#stays", "#drive", "#prep"]);
  const tabForHash = (hash) => {
    if ((hash === "#ledger" || hash.startsWith("#ledger-")) && ledgerEnabled()) return "ledger";
    if (hash === "#itinerary" || hash === "#prep") return "itinerary";
    if (hash === "#route") return "route";
    if (["#bookings", "#flights", "#stays", "#drive"].includes(hash)) return "bookings";
    return "home";
  };

  let activeTab = "home";
  let frame = 0;

  function showTab(tab, hash = location.hash, options = {}) {
    const travel = document.querySelector('[data-site-view="travel"]');
    const ledger = document.querySelector('[data-site-view="ledger"]');
    if (!travel || !ledger) return;
    const changed = activeTab !== tab;
    activeTab = tab;
    const isLedger = tab === "ledger";
    travel.hidden = isLedger;
    ledger.hidden = !isLedger;
    travel.toggleAttribute("inert", isLedger);
    ledger.toggleAttribute("inert", !isLedger);
    document.body.dataset.activeView = isLedger ? "ledger" : "travel";
    document.body.dataset.activeTab = tab;

    document.querySelectorAll("[data-travel-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.travelPanel !== tab;
    });
    document.querySelectorAll("[data-bottom-tab]").forEach((link) => {
      if (link.dataset.bottomTab === tab) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelector("#travel-navigation")?.removeAttribute("open");
    const skip = document.querySelector("#skip-link");
    if (skip) skip.href = isLedger ? "#ledger-root" : tab === "home" ? "#top" : `#${tab}`;

    if (isLedger) {
      window.TravelLedger?.setActiveTab?.(hash === "#ledger-stats" ? "stats" : "entry", { updateHash: false });
    }

    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!isLedger && changed) window.dispatchEvent(new Event("travel-view:shown"));
      if (deepTargets.has(hash) && !isLedger) {
        document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
      } else if (changed || options.forceScroll) {
        window.scrollTo({ top: 0 });
      }
    });
  }

  function routeFromLocation(options = {}) {
    showTab(tabForHash(location.hash), location.hash, options);
  }

  function navigate(hash) {
    if (location.hash !== hash) history.pushState({ tab: tabForHash(hash) }, "", hash);
    showTab(tabForHash(hash), hash, { forceScroll: true });
  }

  function setup() {
    history.scrollRestoration = "manual";
    routeFromLocation({ forceScroll: true });

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-bottom-tab], .home-shortcuts a, .hero__destination a, .travel-navigation-menu a, #wordmark, .footer a, #ledger-navigation-link");
      if (!link) return;
      const hash = link.getAttribute("href");
      if (!hash?.startsWith("#")) return;
      event.preventDefault();
      navigate(hash);
    });

    window.addEventListener("popstate", () => routeFromLocation({ forceScroll: true }));
    window.addEventListener("hashchange", () => routeFromLocation({ forceScroll: true }));
    window.addEventListener("travel-config:ready", () => routeFromLocation());
    window.addEventListener("travel-ledger:navigate", (event) => {
      const hash = event.detail?.tab === "stats" ? "#ledger-stats" : "#ledger";
      if (location.hash !== hash) history.pushState({ tab: "ledger" }, "", hash);
      showTab("ledger", hash);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
