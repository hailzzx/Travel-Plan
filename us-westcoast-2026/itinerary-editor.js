/* Local-only edits for the authored day-by-day itinerary. */
window.TravelItineraryEditor = (() => {
  const FORMAT = "west26-local-itinerary";
  const VERSION = 1;
  let lastFocus = null;
  let lastDay = null;
  let loadError = "";

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const textValue = (value, limit, label, required = false) => {
    if (typeof value !== "string" || value.length > limit || (required && !value.trim())) {
      throw new Error(`${label}内容无效或过长`);
    }
    return value.trim();
  };

  function normalizeBackup(raw) {
    if (!raw || raw.format !== FORMAT || raw.version !== VERSION || raw.tripId !== state.data.metadata.tripId ||
        !raw.days || typeof raw.days !== "object" || Array.isArray(raw.days)) {
      throw new Error("这不是当前旅行的行程备份文件");
    }
    const normalized = {};
    for (const [key, edit] of Object.entries(raw.days)) {
      const original = state.originalDays.find((day) => String(day.day) === key);
      if (!original || !edit || typeof edit !== "object" || Array.isArray(edit)) throw new Error(`第 ${key} 天的数据无效`);
      if (!Array.isArray(edit.locations) || edit.locations.length < 1 || edit.locations.length > 20 ||
          !Array.isArray(edit.schedule) || edit.schedule.length > 80 ||
          !Array.isArray(edit.notes) || edit.notes.length > 30) throw new Error(`第 ${key} 天的数据结构无效`);
      const seenIds = new Set();
      const originals = new Map(original.schedule.map((item) => [item.id, item]));
      const schedule = edit.schedule.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`第 ${key} 天的活动无效`);
        const id = textValue(item.id, 90, "活动 ID", true);
        if (seenIds.has(id)) throw new Error(`第 ${key} 天有重复的活动 ID`);
        seenIds.add(id);
        const authored = originals.get(id);
        const next = {
          ...(authored ? clone(authored) : {}),
          id,
          type: authored?.type || "custom",
          time: textValue(item.time, 24, "时间") || "—",
          text: textValue(item.text, 500, "活动", true)
        };
        delete next.placeId;
        delete next.placeIds;
        delete next.mapQuery;
        delete next.mapLabel;
        delete next.mapDisabled;
        if (item.mapDisabled === true) {
          next.mapDisabled = true;
        } else if (typeof item.mapQuery === "string" && item.mapQuery.trim()) {
          next.mapQuery = textValue(item.mapQuery, 200, "地图地点", true);
          next.mapLabel = textValue(item.mapLabel || item.mapQuery, 200, "地图地点", true);
        } else if (authored?.placeId && item.placeId === authored.placeId) {
          next.placeId = authored.placeId;
        } else if (Array.isArray(authored?.placeIds) && JSON.stringify(item.placeIds) === JSON.stringify(authored.placeIds)) {
          next.placeIds = clone(authored.placeIds);
        }
        return next;
      });
      normalized[key] = {
        title: textValue(edit.title, 100, "行程标题", true),
        locations: edit.locations.map((place) => textValue(place, 80, "途经地点", true)),
        schedule,
        notes: edit.notes.map((note) => textValue(note, 800, "备注", true))
      };
    }
    return normalized;
  }

  function applyOverrides() {
    state.data.days = state.originalDays.map((original) => {
      const edit = state.itineraryOverrides[original.day];
      return edit ? { ...clone(original), ...clone(edit) } : clone(original);
    });
  }

  function setStatus(message) {
    const element = $("#itinerary-storage-status");
    if (element) element.textContent = message;
  }

  function saveOverrides(next) {
    const backup = {
      format: FORMAT,
      version: VERSION,
      tripId: state.data.metadata.tripId,
      savedAt: new Date().toISOString(),
      days: next
    };
    try {
      localStorage.setItem(state.itineraryStorageKey, JSON.stringify(backup));
    } catch {
      throw new Error("无法保存到此浏览器。请检查浏览器存储权限或可用空间。");
    }
    state.itineraryOverrides = next;
    applyOverrides();
    setStatus(`已在本机保存 ${Object.keys(next).length} 天的修改`);
  }

  function load() {
    state.originalDays = clone(state.data.days);
    state.itineraryStorageKey = `travel-plan:itinerary:v1:${encodeURIComponent(state.data.metadata.tripId)}`;
    try {
      const stored = localStorage.getItem(state.itineraryStorageKey);
      state.itineraryOverrides = stored ? normalizeBackup(JSON.parse(stored)) : {};
    } catch (error) {
      console.warn("Could not load local itinerary edits", error);
      loadError = "本机行程备份无法读取；当前显示原始行程。可导入之前导出的备份。";
      state.itineraryOverrides = {};
    }
    applyOverrides();
  }

  function mapValue(item) {
    if (item.mapDisabled) return "";
    if (item.mapQuery) return item.mapQuery;
    const place = state.data.places.find((entry) => entry.id === item.placeId);
    return place?.nameZh || place?.name || navigationDestinations(item)[0]?.label || "";
  }

  function rowMarkup(item, index) {
    const map = mapValue(item);
    return `<div class="itinerary-edit-row" data-item-id="${escapeHtml(item.id)}" data-original-map="${escapeHtml(map)}">
      <div class="itinerary-edit-row-head"><strong class="itinerary-edit-index">活动 ${String(index + 1).padStart(2, "0")}</strong><div>
        <button type="button" data-edit-move="up" aria-label="上移此活动">↑</button>
        <button type="button" data-edit-move="down" aria-label="下移此活动">↓</button>
        <button type="button" data-edit-remove aria-label="删除此活动">删除</button>
      </div></div>
      <div class="itinerary-edit-fields">
        <label>时间<input name="time" type="text" maxlength="24" value="${escapeHtml(item.time || "—")}" placeholder="如 09:30 或 —"></label>
        <label>活动内容<textarea name="text" rows="2" maxlength="500" required>${escapeHtml(item.text || "")}</textarea></label>
        <label>地图地点（可选）<input name="map" type="text" maxlength="200" value="${escapeHtml(map)}" placeholder="地名或地址，留空则不显示地图链接"></label>
      </div>
    </div>`;
  }

  function renumberRows() {
    $$(".itinerary-edit-row", $("#itinerary-editor-dialog")).forEach((row, index) => {
      $(".itinerary-edit-index", row).textContent = `活动 ${String(index + 1).padStart(2, "0")}`;
    });
  }

  function editorStatus(message) {
    $("#itinerary-editor-status").textContent = message;
  }

  function open(dayNumber) {
    const day = state.data.days.find((entry) => entry.day === dayNumber);
    if (!day) return;
    lastFocus = document.activeElement;
    lastDay = dayNumber;
    const dialog = $("#itinerary-editor-dialog");
    dialog.innerHTML = `<form id="itinerary-editor-form" data-day="${dayNumber}">
      <header class="itinerary-editor-head"><div><small>DAY ${String(dayNumber).padStart(2, "0")} · ${escapeHtml(formatCompactDate(day.date))}</small><h2 id="itinerary-editor-title">编辑这一天</h2></div><button type="button" data-edit-close aria-label="关闭编辑器">×</button></header>
      <div class="itinerary-editor-body">
        <p class="itinerary-editor-hint">只修改行程页。航班、住宿与路线图仍使用原始资料。</p>
        <label class="itinerary-editor-field">当天标题<input name="title" type="text" maxlength="100" required value="${escapeHtml(day.title)}"></label>
        <label class="itinerary-editor-field">途经地点<input name="locations" type="text" maxlength="600" required value="${escapeHtml(day.locations.join(" → "))}" placeholder="用 → 分隔地点"></label>
        <div class="itinerary-editor-subhead"><h3>活动安排</h3><button type="button" data-edit-add>＋ 添加活动</button></div>
        <div class="itinerary-edit-rows">${day.schedule.map(rowMarkup).join("")}</div>
        <label class="itinerary-editor-field">当天备注<textarea name="notes" rows="4" maxlength="4000" placeholder="一行一条备注">${escapeHtml((day.notes || []).join("\n"))}</textarea></label>
      </div>
      <footer class="itinerary-editor-foot"><button type="button" data-edit-restore ${state.itineraryOverrides[dayNumber] ? "" : "disabled"}>恢复这天原始内容</button><span id="itinerary-editor-status" role="status" aria-live="polite"></span><div><button type="button" data-edit-close>取消</button><button type="submit">保存修改</button></div></footer>
    </form>`;
    dialog.showModal();
    $("input[name='title']", dialog).focus();
  }

  function collectEditor(form) {
    const dayNumber = Number(form.dataset.day);
    const day = state.data.days.find((entry) => entry.day === dayNumber);
    const title = $("[name='title']", form).value.trim();
    const locations = $("[name='locations']", form).value.replace(/->/g, "→").split("→").map((entry) => entry.trim()).filter(Boolean);
    const notes = $("[name='notes']", form).value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
    if (!title || !locations.length) throw new Error("请填写当天标题和至少一个途经地点");
    const schedule = $$(".itinerary-edit-row", form).map((row) => {
      const id = row.dataset.itemId;
      const current = day.schedule.find((item) => item.id === id);
      const text = $("[name='text']", row).value.trim();
      const time = $("[name='time']", row).value.trim() || "—";
      const map = $("[name='map']", row).value.trim();
      if (!text) throw new Error("每项活动都需要填写内容");
      const item = current ? clone(current) : { id, type: "custom" };
      item.time = time;
      item.text = text;
      if (!map) {
        delete item.placeId;
        delete item.placeIds;
        delete item.mapQuery;
        delete item.mapLabel;
        item.mapDisabled = true;
      } else if (map !== row.dataset.originalMap) {
        delete item.placeId;
        delete item.placeIds;
        delete item.mapQuery;
        delete item.mapLabel;
        delete item.mapDisabled;
        if (map) { item.mapQuery = map; item.mapLabel = map; }
      }
      return item;
    });
    const candidate = { format: FORMAT, version: VERSION, tripId: state.data.metadata.tripId,
      days: { [dayNumber]: { title, locations, schedule, notes } } };
    return normalizeBackup(candidate)[dayNumber];
  }

  function downloadBackup() {
    const backup = { format: FORMAT, version: VERSION, tripId: state.data.metadata.tripId,
      exportedAt: new Date().toISOString(), days: state.itineraryOverrides };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "west26-itinerary-backup.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("行程备份已导出");
  }

  function setup() {
    const dialog = $("#itinerary-editor-dialog");
    dialog.addEventListener("close", () => {
      const target = lastFocus?.isConnected ? lastFocus : $(`[data-edit-day="${lastDay}"]`);
      target?.focus?.();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-edit-close]")) { dialog.close(); return; }
      const rows = $(".itinerary-edit-rows", dialog);
      if (event.target.closest("[data-edit-add]")) {
        const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        rows.insertAdjacentHTML("beforeend", rowMarkup({ id, time: "—", text: "", type: "custom" }, rows.children.length));
        $(".itinerary-edit-row:last-child [name='text']", rows).focus();
        return;
      }
      const row = event.target.closest(".itinerary-edit-row");
      if (row && event.target.closest("[data-edit-remove]")) { row.remove(); renumberRows(); return; }
      const move = event.target.closest("[data-edit-move]");
      if (row && move) {
        if (move.dataset.editMove === "up" && row.previousElementSibling) rows.insertBefore(row, row.previousElementSibling);
        if (move.dataset.editMove === "down" && row.nextElementSibling) rows.insertBefore(row.nextElementSibling, row);
        renumberRows();
        return;
      }
      if (event.target.closest("[data-edit-restore]")) {
        const dayNumber = Number($("#itinerary-editor-form").dataset.day);
        if (!confirm(`恢复第 ${dayNumber} 天的原始行程？`)) return;
        try {
          const next = { ...state.itineraryOverrides };
          delete next[dayNumber];
          saveOverrides(next);
          state.expandedDay = dayNumber;
          renderTimeline(true);
          dialog.close();
        } catch (error) { editorStatus(error.message); }
      }
    });
    dialog.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.target;
      try {
        const dayNumber = Number(form.dataset.day);
        const edit = collectEditor(form);
        saveOverrides({ ...state.itineraryOverrides, [dayNumber]: edit });
        state.expandedDay = dayNumber;
        renderTimeline(true);
        dialog.close();
      } catch (error) { editorStatus(error.message); }
    });
    $("#itinerary-export").onclick = downloadBackup;
    $("#itinerary-import").onclick = () => $("#itinerary-import-file").click();
    $("#itinerary-import-file").onchange = async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (file.size > 1024 * 1024) { setStatus("备份文件过大，请选择行程 JSON 备份"); return; }
      try {
        const next = normalizeBackup(JSON.parse(await file.text()));
        if (Object.keys(state.itineraryOverrides).length && !confirm("导入将替换本机已保存的行程修改。继续吗？")) return;
        saveOverrides(next);
        renderTimeline(true);
      } catch (error) { setStatus(`导入失败：${error.message}`); }
    };
    $("#itinerary-reset-all").onclick = () => {
      if (!Object.keys(state.itineraryOverrides).length) { setStatus("当前没有本机修改"); return; }
      if (!confirm("恢复全部原始行程？本机修改会被清除。")) return;
      try { saveOverrides({}); renderTimeline(true); }
      catch (error) { setStatus(error.message); }
    };
    if (loadError) setStatus(loadError);
    else if (Object.keys(state.itineraryOverrides).length) setStatus(`已加载 ${Object.keys(state.itineraryOverrides).length} 天的本机修改`);
  }

  return { load, setup, open };
})();
