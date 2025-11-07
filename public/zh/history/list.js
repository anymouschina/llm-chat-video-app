const listEl = document.getElementById("record-list");
const inputTitle = document.getElementById("title");
const ROLE_ENDPOINT = "https://n8n-preview.beqlee.icu/webhook/createRole"; // 可按需调整
let HISTORY_ITEMS = [];
let SELECTED_FOR_ROLE = null; // { title, vurl, remixId }
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
    HISTORY_ITEMS = items;
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
      <div style=\"display:flex;gap:8px;margin-top:8px;\">${it.vurl?`<button class=\"btn\" data-open-role=\"1\">用于创建角色</button>`:''}</div>
    `;
    if (it.vurl) {
      card.querySelector('[data-open-role]')?.addEventListener('click', () => openRoleModal(it));
    }
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

// --- Role modal logic ---
const ROLE_CREATE_ENDPOINT = 'https://n8n-preview.beqlee.icu/webhook/createRole';
const modal = document.getElementById('role-modal');
const modalClose = document.getElementById('role-modal-close');
const modalX = document.getElementById('role-modal-x');
const modalMeta = document.getElementById('role-modal-meta');
const v = document.getElementById('role-video');
const cur = document.getElementById('role-cur');
const dur = document.getElementById('role-dur');
const inStart = document.getElementById('role-start');
const inEnd = document.getElementById('role-end');
const tl = document.getElementById('timeline');
const sel = document.getElementById('sel');
const hL = document.getElementById('handle-l');
const hR = document.getElementById('handle-r');
const submitBtn = document.getElementById('role-submit');

let VIDEO_URL = null;
let DURATION = 0;
const MAX_LEN = 3; // seconds

function openRoleModal(it){
  VIDEO_URL = it.vurl;
  const title = it.title || '';
  if (modal) modal.style.display = 'block';
  if (modalMeta) modalMeta.textContent = `视频：${title}`;
  if (v) { v.src = VIDEO_URL; v.addEventListener('loadedmetadata', initRangeOnce, { once: true }); }
}
function closeRoleModal(){ if (modal) modal.style.display = 'none'; resetRange(); }
modalClose?.addEventListener('click', closeRoleModal); modalX?.addEventListener('click', closeRoleModal);

function initRangeOnce(){
  DURATION = isFinite(v.duration) ? v.duration : 0;
  if (dur) dur.textContent = `${DURATION.toFixed(2)}s`;
  const defLen = Math.min(MAX_LEN, DURATION || MAX_LEN);
  const pxPerSec = tl.clientWidth / (DURATION || 1);
  const w = Math.max(1, defLen * pxPerSec);
  sel.style.left = `0px`; sel.style.width = `${w}px`;
  inStart.value = '0.00'; inEnd.value = defLen.toFixed(2);
}
function resetRange(){ if (inStart) inStart.value='0.00'; if (inEnd) inEnd.value='0.00'; if (sel){ sel.style.left='0px'; sel.style.width='1px'; } }
v?.addEventListener('timeupdate', ()=>{ if (isFinite(v.currentTime)) cur.textContent = `${v.currentTime.toFixed(2)}s`; });

let dragState = null; // {type:'move'|'left'|'right', startX, left, width}
sel?.addEventListener('mousedown', (e)=>{ if (e.target===hL||e.target===hR) return; startDrag('move', e); });
hL?.addEventListener('mousedown', (e)=>{ startDrag('left', e); e.stopPropagation(); });
hR?.addEventListener('mousedown', (e)=>{ startDrag('right', e); e.stopPropagation(); });
window.addEventListener('mousemove', onDragMove);
window.addEventListener('mouseup', endDrag);
function startDrag(type, e){ dragState = { type, startX: e.clientX, left: sel.offsetLeft, width: sel.offsetWidth }; }
function onDragMove(e){ if (!dragState) return; const dx = e.clientX - dragState.startX; const tlw = tl.clientWidth; const pxPerSec = tlw / (DURATION||1);
  if (dragState.type==='move'){
    let newLeft = clamp(dragState.left + dx, 0, tlw - dragState.width);
    sel.style.left = `${newLeft}px`;
  } else if (dragState.type==='left'){
    let newLeft = clamp(dragState.left + dx, 0, dragState.left + dragState.width);
    let newWidth = dragState.width + (dragState.left - newLeft);
    const maxWidth = MAX_LEN * pxPerSec;
    if (newWidth > maxWidth){ newLeft += (newWidth - maxWidth); newWidth = maxWidth; }
    sel.style.left = `${newLeft}px`; sel.style.width = `${Math.max(1,newWidth)}px`;
  } else if (dragState.type==='right'){
    let newWidth = Math.max(1, dragState.width + dx);
    const maxWidth = MAX_LEN * pxPerSec;
    newWidth = Math.min(newWidth, maxWidth, tlw - dragState.left);
    sel.style.width = `${newWidth}px`;
  }
  updateRangeFromSel();
}
function endDrag(){ dragState=null; }
function updateRangeFromSel(){ const tlw=tl.clientWidth; const pxPerSec = tlw / (DURATION||1); const left=sel.offsetLeft; const w=sel.offsetWidth; const s=left/pxPerSec; const e=s + w/pxPerSec; inStart.value = s.toFixed(2); inEnd.value = Math.min(DURATION, e).toFixed(2); }

document.getElementById('role-set-start')?.addEventListener('click', ()=>{ const tlw=tl.clientWidth; const pxPerSec = tlw / (DURATION||1); const startSec = isFinite(v.currentTime)?v.currentTime:0; const width = sel.offsetWidth; let newLeft = clamp(startSec*pxPerSec, 0, Math.max(0, tlw - width)); sel.style.left = `${newLeft}px`; updateRangeFromSel(); });
document.getElementById('role-set-end')?.addEventListener('click', ()=>{ const tlw=tl.clientWidth; const pxPerSec = tlw / (DURATION||1); const endSec = isFinite(v.currentTime)?v.currentTime:0; const maxWidth = MAX_LEN*pxPerSec; let newWidth = Math.min(maxWidth, tlw); let newLeft = clamp(endSec*pxPerSec - newWidth, 0, tlw - newWidth); sel.style.left = `${newLeft}px`; sel.style.width = `${newWidth}px`; updateRangeFromSel(); });

document.getElementById('role-submit')?.addEventListener('click', async ()=>{
  try{
    if (!VIDEO_URL) return toast('未选择视频');
    const startSec = Math.max(0, Number(inStart.value||0));
    const endSec = Math.max(0, Number(inEnd.value||0));
    if (!(endSec > startSec)) return toast('起点必须小于终点');
    if (endSec - startSec > MAX_LEN + 1e-6) return toast('最长不超过3秒');
    const body = { videoUrl: VIDEO_URL, startSec, endSec };
    const res = await fetch(ROLE_CREATE_ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    if (!res.ok){ console.warn('create role failed', await res.text()); return toast('提交失败'); }
    toast('已提交'); closeRoleModal();
  }catch(e){ console.warn(e); toast('提交失败'); }
});

function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// Initial load
load("");
