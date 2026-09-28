(() => {
  "use strict";
  const MEMBERS = Object.freeze(["Zixiang", "Ziqi", "Weiyang", "Chentao"]);
  const INITIALS = Object.freeze({ Zixiang: "Zx", Ziqi: "Zq", Weiyang: "Wy", Chentao: "Ct" });
  const KEY = "travel-plan:profile:v1:usa-west-coast-2026-10";
  let current = null;
  try {
    const stored = localStorage.getItem(KEY);
    if (MEMBERS.includes(stored)) current = stored;
  } catch { /* Browsing still works when browser storage is unavailable. */ }

  function canEdit() { return current === "Weiyang"; }
  function getActor() { return current; }
  function apply() {
    document.documentElement.dataset.travelActor = current || "";
    document.documentElement.dataset.canEdit = String(canEdit());
    const switcher = document.getElementById("profile-switch");
    if (switcher) {
      switcher.hidden = !current;
      document.getElementById("profile-switch-initial").textContent = INITIALS[current] || "";
      document.getElementById("profile-switch-name").textContent = current || "";
    }
    window.dispatchEvent(new CustomEvent("travel-profile:changed", { detail: { actor: current, canEdit: canEdit() } }));
  }
  function showPicker() {
    const dialog = document.getElementById("profile-dialog");
    if (!dialog?.open) dialog?.showModal();
  }
  function select(actor) {
    if (!MEMBERS.includes(actor)) return;
    current = actor;
    try { localStorage.setItem(KEY, actor); } catch { /* Keep selection for this tab. */ }
    document.getElementById("profile-dialog")?.close();
    apply();
  }
  window.TravelProfile = Object.freeze({ members: MEMBERS, getActor, canEdit, showPicker });
  document.addEventListener("DOMContentLoaded", () => {
    const dialog = document.getElementById("profile-dialog");
    dialog?.addEventListener("cancel", (event) => { if (!current) event.preventDefault(); });
    dialog?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-profile]");
      if (button) select(button.dataset.profile);
    });
    document.getElementById("profile-switch")?.addEventListener("click", showPicker);
    apply();
    if (!current) showPicker();
  });
})();
