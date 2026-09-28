/* A painterly route illustration. Point positions are intentionally schematic. */
const ATLAS_LEGS = [
  { day: 1, date: "10/02", title: "抵达洛杉矶", cities: "LAX → 圣盖博", time: "约 45–90 分钟", text: "落地、Sixt 取车后前往市区与住宿。入境、取车和洛杉矶拥堵时间另计。", ids: ["lax", "santa-monica", "san-gabriel"] },
  { day: 2, date: "10/03", title: "洛杉矶慢游", cities: "圣盖博 → 洛杉矶市区", time: "市内约 1–2 小时", text: "盖蒂中心、好莱坞和格里菲斯天文台之间分段驾驶；停车与参观时间另计。", ids: ["san-gabriel", "getty", "hollywood", "griffith"] },
  { day: 3, date: "10/04", title: "从城市到沙漠", cities: "圣盖博 → 约书亚树", time: "约 2.5–3.5 小时", text: "经 Desert Hills 奥特莱斯向东进入沙漠，购物和公园游览时间另计。", ids: ["san-gabriel", "desert-hills", "joshua-tree", "joshua-stay"] },
  { day: 4, date: "10/05", title: "折返海岸线", cities: "约书亚树 → 蒙特雷", time: "至少约 8.5–11 小时", text: "约书亚树 → 圣巴巴拉约 4–5 小时；圣巴巴拉 → 大苏尔约 3.5–4.5 小时；大苏尔 → 蒙特雷约 1–1.5 小时。未含停留与路况延误。", warning: "现有 11:00 退房、15:00 蒙特雷入住与沿途游览无法同时按原计划完成。建议调整出发或删减停留，出发前核对 1 号公路通行。", ids: ["joshua-stay", "santa-barbara", "big-sur", "monterey"] },
  { day: 5, date: "10/06", title: "驶入湾区", cities: "蒙特雷 → 戴利城", time: "约 2–3 小时", text: "经斯坦福抵达戴利城；湾区高峰时段车程可能明显增加。", ids: ["monterey", "stanford", "daly-city"] },
  { day: 6, date: "10/07", title: "旧金山海岸", cities: "戴利城 → 湾区", time: "分段约 1.5–2.5 小时", text: "金门大桥、Lands End、半月湾环线。停车与步行时间另计。", ids: ["daly-city", "golden-gate", "lands-end", "half-moon-bay"] },
  { day: 7, date: "10/08", title: "城市漫步 · 还车", cities: "戴利城 → 渔人码头", time: "市内车程随路况变化", text: "Sixt 预约 12:00 前在渔人码头还车，之后使用步行或公共交通。", ids: ["daly-city", "haight", "chinatown", "fishermans"] },
  { day: 8, date: "10/09", title: "前往机场", cities: "戴利城 → SFO", time: "打车约 20–40 分钟", text: "车辆已于前一天归还；预留前往机场、值机和安检时间。", ids: ["daly-city", "sfo"] }
];
const ATLAS_LABELS = [
  { id: "fishermans", en: "SAN FRANCISCO", zh: "旧金山", width: 170 },
  { id: "monterey", en: "MONTEREY", zh: "蒙特雷", width: 135 },
  { id: "big-sur", en: "BIG SUR", zh: "大苏尔", width: 126, left: true },
  { id: "santa-barbara", en: "SANTA BARBARA", zh: "圣巴巴拉", width: 164 },
  { id: "san-gabriel", en: "LOS ANGELES", zh: "洛杉矶", width: 148, left: true },
  { id: "joshua-tree", en: "JOSHUA TREE", zh: "约书亚树", width: 150, left: true }
];
const ATLAS_POINTS = {
  "fishermans": [472, 132], "golden-gate": [451, 118], "lands-end": [443, 152],
  "haight": [481, 157], "chinatown": [491, 148], "daly-city": [477, 178],
  "sfo": [499, 207], "half-moon-bay": [470, 213], "stanford": [519, 226],
  "monterey": [516, 282], "big-sur": [557, 384], "santa-barbara": [639, 510],
  "santa-monica": [692, 611], "lax": [707, 639], "san-gabriel": [736, 630],
  "getty": [695, 584], "hollywood": [726, 589], "griffith": [747, 578],
  "desert-hills": [807, 654], "joshua-tree": [868, 699], "joshua-stay": [885, 711]
};
const ATLAS_SPINE = ["san-gabriel", "joshua-tree", "santa-barbara", "big-sur", "monterey", "fishermans"];
const ATLAS_FOCUS = {
  1: ["san-gabriel"], 2: ["san-gabriel"], 3: ["san-gabriel", "joshua-tree"],
  4: ["joshua-tree", "santa-barbara", "big-sur", "monterey"],
  5: ["monterey", "fishermans"], 6: ["fishermans"],
  7: ["fishermans"], 8: ["fishermans"]
};
function atlasXY(id) {
  const point = ATLAS_POINTS[id];
  return point ? { x: point[0], y: point[1] } : null;
}
function atlasPath(ids) {
  const points = ids.map(atlasXY).filter(Boolean);
  if (points.length < 2) return "";
  let path = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const previous = points[i - 1] || points[i];
    const current = points[i];
    const next = points[i + 1];
    const after = points[i + 2] || next;
    const firstControl = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 };
    const secondControl = { x: next.x - (after.x - current.x) / 6, y: next.y - (after.y - current.y) / 6 };
    path += ` C${firstControl.x.toFixed(1)} ${firstControl.y.toFixed(1)} ${secondControl.x.toFixed(1)} ${secondControl.y.toFixed(1)} ${next.x} ${next.y}`;
  }
  return path;
}
function atlasMap(day) {
  const active = ATLAS_LEGS.find((leg) => leg.day === day);
  const focus = new Set(ATLAS_FOCUS[day] || []);
  const route = atlasPath(ATLAS_SPINE);
  const selectedRoute = active ? atlasPath(active.ids) : "";
  const paths = `<path class="atlas-track-under ${day ? "is-muted" : ""}" d="${route}"/><path class="atlas-track ${day ? "is-muted" : ""}" d="${route}"/>${selectedRoute ? `<path class="atlas-track-under is-active" d="${selectedRoute}"/><path class="atlas-track is-active" d="${selectedRoute}"/>` : ""}`;
  const stops = ATLAS_LABELS.map(({ id, en, zh, width, left }) => {
    const p = atlasXY(id);
    if (!p) return "";
    const faded = active && !focus.has(id);
    const labelX = left ? p.x - width - 25 : p.x + 25;
    const labelY = p.y - 24;
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(en + ", California")}`;
    return `<a class="atlas-stop ${faded ? "is-muted" : ""}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="在 Google Maps 查看${zh}"><circle class="atlas-stop-halo" cx="${p.x}" cy="${p.y}" r="20"/><circle class="atlas-stop-ring" cx="${p.x}" cy="${p.y}" r="12"/><circle class="atlas-stop-core" cx="${p.x}" cy="${p.y}" r="4.5"/><rect class="atlas-stop-card" x="${labelX}" y="${labelY}" width="${width}" height="48" rx="4"/><text class="atlas-stop-en" x="${labelX + 11}" y="${labelY + 19}">${en}</text><text class="atlas-stop-zh" x="${labelX + 11}" y="${labelY + 38}">${zh}</text></a>`;
  }).join("");
  return `<svg class="atlas-svg" viewBox="0 0 1000 820" role="img" aria-label="油画风格的加州旅行路线示意图，地点和距离不按比例"><image href="assets/california-painted-atlas.jpg" width="1000" height="820"/><rect class="atlas-image-wash" width="1000" height="820"/><text x="65" y="150" class="atlas-water">PACIFIC</text><text x="65" y="188" class="atlas-water atlas-water-small">OCEAN</text><text x="752" y="349" class="atlas-state">CALIFORNIA</text><g class="atlas-paths">${paths}</g><g class="atlas-stops">${stops}</g><text x="58" y="785" class="atlas-credit">WEST / 26 · AN ILLUSTRATED ROAD MAP · NOT TO SCALE</text></svg>`;
}
function atlasStory(day) {
  const legs = day ? ATLAS_LEGS.filter((leg) => leg.day === day) : ATLAS_LEGS;
  return `<div class="atlas-story-heading"><div><span>THE ROAD, IN WORDS</span><h3>${day ? "当天路线" : "路线与车程"}</h3></div><small>预估驾驶时间 · 不含停留</small></div><div class="atlas-legs">${legs.map((leg) => `<article class="atlas-leg"><div class="atlas-leg-index"><span>${String(leg.day).padStart(2, "0")}</span><small>${leg.date}</small></div><div class="atlas-leg-copy"><h4>${leg.title}</h4><p class="atlas-leg-cities">${leg.cities}</p><p>${leg.text}</p>${leg.warning ? `<p class="atlas-leg-warning">行程提醒 · ${leg.warning}</p>` : ""}</div><strong class="atlas-leg-time">${leg.time}</strong></article>`).join("")}</div><div class="atlas-links"><a href="https://quickmap.dot.ca.gov/" target="_blank" rel="noopener noreferrer">Caltrans 实时路况 ↗</a><a href="https://www.google.com/maps/dir/?api=1&origin=Joshua+Tree%2C+CA&destination=Monterey%2C+CA&waypoints=Santa+Barbara%2C+CA%7CBig+Sur%2C+CA&travelmode=driving" target="_blank" rel="noopener noreferrer">查看长途路线 ↗</a></div>`;
}
function atlasStopKey(day) {
  const focus = new Set(ATLAS_FOCUS[day] || []);
  return `<div class="atlas-stop-key" aria-label="地图地点">${ATLAS_SPINE.map((id, index) => {
    const stop = ATLAS_LABELS.find((item) => item.id === id);
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.en + ", California")}`;
    return `<a class="${day && !focus.has(id) ? "is-muted" : ""}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="在 Google Maps 查看${stop.zh}"><small>${String(index + 1).padStart(2, "0")}</small>${stop.zh}<span aria-hidden="true">↗</span></a>`;
  }).join("")}</div>`;
}
function renderRoutePanel(day = 0) {
  document.querySelector("#route-explorer").innerHTML = `<div class="atlas-head"><span>FIELD NOTES / 001</span><strong>CALIFORNIA <i>·</i> 2026</strong></div><div class="route-day-tabs atlas-day-tabs" aria-label="选择日期"><button type="button" data-route-day="0" aria-pressed="${!day}">总览</button>${ATLAS_LEGS.map((leg) => `<button type="button" data-route-day="${leg.day}" aria-pressed="${leg.day === day}">${leg.date}</button>`).join("")}</div><div class="atlas-map-frame"><div class="atlas-map-scroll">${atlasMap(day)}</div><div class="atlas-map-footer"><span>艺术化路线示意 · 地点与距离不按比例</span><button type="button" data-atlas-expand>放大地图 ↗</button></div></div>${atlasStopKey(day)}${atlasStory(day)}`;
}
function setupRouteExplorer() {
  renderRoutePanel();
  document.querySelector("#route-explorer").addEventListener("click", (event) => {
    const button = event.target.closest("[data-route-day]");
    if (button) { renderRoutePanel(Number(button.dataset.routeDay)); return; }
    if (event.target.closest("[data-atlas-expand]")) {
      const dialog = document.querySelector("#map-dialog");
      document.querySelector("#map-dialog-content").innerHTML = atlasMap(Number(document.querySelector(".atlas-day-tabs [aria-pressed='true']")?.dataset.routeDay || 0));
      dialog.showModal();
    }
  });
  document.querySelector("#map-close").onclick = () => document.querySelector("#map-dialog").close();
}
