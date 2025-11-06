const listEl = document.getElementById("record-list");
const inputTitle = document.getElementById("title");
document.getElementById("search").addEventListener("click", () => load(inputTitle.value.trim()));
document.getElementById("refresh").addEventListener("click", () => load(inputTitle.value.trim()));

async function load(title) {
  listEl.innerHTML = "加载中…";
  try {
    const base = "https://n8n-preview.beqlee.icu/webhook/videoList";
    const url = title ? `${base}?title=${encodeURIComponent(title)}` : base;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const json = await res.json();
    const items = normalizeList(json);
    render(items);
  } catch (e) {
    listEl.innerHTML = `<div style="color:#dc2626">加载失败：${String(e)}`;
  }
}

function normalizeList(json) {
  // Official structure: { ret, data: [...] }
  const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const items = arr.map((r) => mapItem(r)).filter(Boolean);
  items.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
  return items;
}

function mapItem(r) {
  try {
    const title = r.title || r.prompt || r.chat || r.remark || "(无题)";
    let vurl = r.videoUrl || r.video_url || r.url || r.downloadable_url || null;
    if (!vurl && r.extra) {
      const ex = typeof r.extra === "string" ? JSON.parse(r.extra) : r.extra;
      vurl = ex?.downloadable_url || ex?.url || ex?.encodings?.source?.path || ex?.encodings?.source_wm?.path || null;
    }
    if (vurl) vurl = String(vurl).replaceAll("openai.com","beqlee.icu");
    const createdAt = r.createdAt || r.created_at || r.time || r.timestamp || "";
    const updatedAt = r.updatedAt || r.updated_at || "";
    const duration = r.duration || r.n_frames || r.length || "";
    const model = r.model || (r.meta && r.meta.model) || "";
    const status = String(r.status || "").toLowerCase();
    let progress = r.progress;
    if (typeof progress === "string") progress = Number(progress);
    if (typeof progress === "number" && progress > 0 && progress <= 1) progress = progress * 100;
    const percent = typeof progress === "number" && !Number.isNaN(progress) ? Math.round(Math.max(0, Math.min(100, progress))) : undefined;
    const statusClass = ["success","finished","done","completed"].includes(status)
      ? "finished"
      : status === "running" ? "running" : status ? "failed" : "running";
    return { title, vurl, createdAt, updatedAt, duration, model, status, statusClass, percent, raw: r };
  } catch { return null; }
}

function render(items) {
  if (!items.length) { listEl.innerHTML = ""; return; }
  listEl.innerHTML = "";
  for (const it of items) {
    const card = document.createElement("div");
    card.className = "card";
    const link = it.vurl ? `/zh/text-to-video/?video=${encodeURIComponent(it.vurl)}&title=${encodeURIComponent(it.title)}${it.raw?.extra ? (()=>{try{const ex=typeof it.raw.extra==='string'?JSON.parse(it.raw.extra):it.raw.extra;return ex?.id?`&remixId=${encodeURIComponent(ex.id)}`:''}catch(e){return ''}})() : ''}` : null;
    const mediaInner = it.vurl ? `<video class=\"thumb\" src=\"${it.vurl}\" preload=\"metadata\"></video>` : `<div class=\"thumb\">无视频</div>`;
    const media = link ? `<a href=\"${link}\">${mediaInner}</a>` : mediaInner;
    card.innerHTML = `
      ${media}
      <div style=\"display:flex;gap:8px;align-items:center\">\n        <strong class=\"title\">${escapeHtml(it.title)}</strong>
        ${renderStatus(it)}
      </div>
      <div style="color:#6b7280;margin-top:4px;">${escapeHtml(it.createdAt || "")}</div>
    `;
    listEl.appendChild(card);
  }
}

function renderStatus(it) {
  const right = [];
  if (it.percent !== undefined) right.push(`${it.percent}%`);
  if (it.model) right.push(escapeHtml(it.model));
  const badge = `<span class="badge ${it.statusClass}">${escapeHtml(it.status || "running")}</span>`;
  const meta = right.length ? `<span style="color:#6b7280;margin-left:auto">${right.join(" · ")}</span>` : `<span style="margin-left:auto"></span>`;
  return badge + meta;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// Initial load
load("");
