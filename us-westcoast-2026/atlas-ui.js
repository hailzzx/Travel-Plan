/* Geographic travel atlas, using Census state outlines and authored trip coordinates. */
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
  ["fishermans", "SAN FRANCISCO", "旧金山"],
  ["monterey", "MONTEREY", "蒙特雷"],
  ["big-sur", "BIG SUR", "大苏尔"],
  ["santa-barbara", "SANTA BARBARA", "圣巴巴拉"],
  ["san-gabriel", "LOS ANGELES", "洛杉矶"],
  ["joshua-tree", "JOSHUA TREE", "约书亚树"]
];
function atlasPlace(id) {
  return travelMapSource(state.data.routeMap, state.data.routeMap?.defaultRegionId).places?.find((place) => place.id === id && place.geo);
}
function atlasXY(id) {
  const geo = atlasPlace(id)?.geo;
  return geo ? { x: (Number(geo.lng) + 125.7) / 12.2 * 1000, y: (42.9 - Number(geo.lat)) / 10.9 * 820 } : null;
}
function atlasPath(ids) {
  return ids.map(atlasXY).filter(Boolean).map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}
function atlasMap(day) {
  const active = ATLAS_LEGS.find((leg) => leg.day === day);
  const longLegs = ATLAS_LEGS.filter((leg) => [1, 3, 4, 5].includes(leg.day));
  const paths = longLegs.map((leg) => `<path class="atlas-track ${day && day !== leg.day ? "is-muted" : ""}" d="${atlasPath(leg.ids)}"/>`).join("");
  const local = active && !longLegs.includes(active) ? `<path class="atlas-track" d="${atlasPath(active.ids)}"/>` : "";
  const stops = ATLAS_LABELS.map(([id, en, zh]) => {
    const p = atlasXY(id);
    if (!p) return "";
    const faded = active && !active.ids.includes(id);
    const left = id === "joshua-tree" || id === "big-sur";
    const x = p.x + (left ? -22 : 22);
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(en + ", California")}`;
    return `<a class="atlas-stop ${faded ? "is-muted" : ""}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="在 Google Maps 查看${zh}"><circle class="atlas-stop-ring" cx="${p.x}" cy="${p.y}" r="12"/><circle class="atlas-stop-core" cx="${p.x}" cy="${p.y}" r="4.5"/><text class="atlas-stop-en" x="${x}" y="${p.y - 4}" text-anchor="${left ? "end" : "start"}">${en}</text><text class="atlas-stop-zh" x="${x}" y="${p.y + 16}" text-anchor="${left ? "end" : "start"}">${zh}</text></a>`;
  }).join("");
  return `<svg class="atlas-svg" viewBox="0 0 1000 820" role="img" aria-label="按真实坐标标注的加州旅行路线图，线条示意地点顺序"><image href="assets/western-states.svg" width="1000" height="820"/><text x="60" y="90" class="atlas-water">PACIFIC</text><text x="60" y="125" class="atlas-water atlas-water-small">OCEAN</text><text x="525" y="304" class="atlas-state">CALIFORNIA</text><text x="755" y="200" class="atlas-neighbor">NEVADA</text><g class="atlas-paths">${paths}${local}</g><g class="atlas-stops">${stops}</g><text x="60" y="765" class="atlas-credit">US CENSUS 2025 / GEOGRAPHIC WAYPOINTS / SCHEMATIC CONNECTIONS</text></svg>`;
}
function atlasStory(day) {
  const legs = day ? ATLAS_LEGS.filter((leg) => leg.day === day) : ATLAS_LEGS;
  return `<div class="atlas-story-heading"><div><span>THE ROAD, IN WORDS</span><h3>${day ? "当天路线" : "路线与车程"}</h3></div><small>预估驾驶时间 · 不含停留</small></div><div class="atlas-legs">${legs.map((leg) => `<article class="atlas-leg"><div class="atlas-leg-index"><span>${String(leg.day).padStart(2, "0")}</span><small>${leg.date}</small></div><div class="atlas-leg-copy"><h4>${leg.title}</h4><p class="atlas-leg-cities">${leg.cities}</p><p>${leg.text}</p>${leg.warning ? `<p class="atlas-leg-warning">行程提醒 · ${leg.warning}</p>` : ""}</div><strong class="atlas-leg-time">${leg.time}</strong></article>`).join("")}</div><div class="atlas-links"><a href="https://quickmap.dot.ca.gov/" target="_blank" rel="noopener noreferrer">Caltrans 实时路况 ↗</a><a href="https://www.google.com/maps/dir/?api=1&origin=Joshua+Tree%2C+CA&destination=Monterey%2C+CA&waypoints=Santa+Barbara%2C+CA%7CBig+Sur%2C+CA&travelmode=driving" target="_blank" rel="noopener noreferrer">查看长途路线 ↗</a></div>`;
}
function renderRoutePanel(day = 0) {
  document.querySelector("#route-explorer").innerHTML = `<div class="atlas-head"><span>FIELD NOTES / 001</span><strong>CALIFORNIA <i>·</i> 2026</strong></div><div class="route-day-tabs atlas-day-tabs" aria-label="选择日期"><button type="button" data-route-day="0" aria-pressed="${!day}">总览</button>${ATLAS_LEGS.map((leg) => `<button type="button" data-route-day="${leg.day}" aria-pressed="${leg.day === day}">${leg.date}</button>`).join("")}</div><div class="atlas-map-frame"><div class="atlas-map-scroll">${atlasMap(day)}</div><div class="atlas-map-footer"><span>左右滑动查看 · 地点为真实坐标，连线仅示意顺序</span><button type="button" data-atlas-expand>放大地图 ↗</button></div></div>${atlasStory(day)}`;
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
