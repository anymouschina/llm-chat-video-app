const listEl = document.getElementById("record-list");
const inputTitle = document.getElementById("title");
const ROLE_ENDPOINT = "https://n8n-preview.beqlee.icu/webhook/createRole"; // 可按需调整
const ROLE_LIST_ENDPOINT = "https://n8n-preview.beqlee.icu/webhook/getRole";
let HISTORY_ITEMS = [];
let SELECTED_FOR_ROLE = null; // { title, vurl, remixId }
document.getElementById("search").addEventListener("click", () => load(inputTitle.value.trim()));
document.getElementById("refresh").addEventListener("click", () => load(inputTitle.value.trim()));
document.getElementById("roles-refresh")?.addEventListener("click", () => loadRoles());

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

async function loadRoles() {
  const panel = document.getElementById("role-list");
  if (!panel) return;
  panel.innerHTML = "加载中…";
  try {
    const res = await fetch(ROLE_LIST_ENDPOINT, { headers: { Accept: "application/json" } });
    const json = await res.json();
    const items = normalizeRoles(json);
    renderRoles(items, panel);
  } catch (e) {
    panel.innerHTML = `<div style="color:#dc2626">加载失败</div>`;
  }
}

function normalizeRoles(json){
  const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const items = arr.map((r)=>{
    try{
      return {
        name: r.name || r.title || "(未命名)",
        type: r.role || r.type || "",
        belone: r.belone || r.desc || r.description || "",
        createdAt: r.createdAt || r.created_at || r.time || "",
      };
    }catch{return null}
  }).filter(Boolean);
  items.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0));
  return items;
}

function renderRoles(items, container){
  container.innerHTML = "";
  if (!items.length) return; // 空即空，不展示 mock
  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center">\n        <strong class="title">${escapeHtml(it.name)}</strong>
        ${it.type?`<span style="color:#6b7280;margin-left:auto">${escapeHtml(it.type)}</span>`:''}
      </div>
      ${it.belone?`<div style="color:#6b7280;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.belone)}</div>`:''}
      ${it.createdAt?`<div style="color:#9ca3af;margin-top:4px">${escapeHtml(it.createdAt)}</div>`:''}
    `;
    container.appendChild(card);
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
const inRoleName = document.getElementById('role-name');
const inRoleType = document.getElementById('role-type');
const inRoleDesc = document.getElementById('role-desc');
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
let TILES = 0; // number of frame tiles
let STEP_SEC = 0; // seconds per tile
let RANGE = { start: 0, end: 0 }; // allowed playback window
const MAX_LEN = 3; // seconds
let LAST_ITEM = null;

function openRoleModal(it){
  LAST_ITEM = it;
  VIDEO_URL = it.vurl;
  const title = it.title || '';
  if (modal) modal.style.display = 'block';
  if (modalMeta) modalMeta.textContent = `视频：${title}`;
  if (v) { v.crossOrigin = 'anonymous'; v.src = VIDEO_URL; v.addEventListener('loadedmetadata', initRangeOnce, { once: true }); }
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
  setRange(0, defLen);
  // ensure video begins inside range
  safeSeek(RANGE.start);
  // render frames strip
  renderFramesStrip();
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
function endDrag(){
  if (dragState){
    // Snap selection to tile grid for clean alignment
    const tlw = tl.clientWidth; const stepPx = TILES>0 ? (tlw / TILES) : 0;
    if (stepPx > 0){
      const left = Math.round(sel.offsetLeft / stepPx) * stepPx;
      const right = Math.round((sel.offsetLeft + sel.offsetWidth) / stepPx) * stepPx;
      const width = Math.max(stepPx, right - left);
      sel.style.left = `${clamp(left,0,Math.max(0,tlw-width))}px`;
      sel.style.width = `${clamp(width, stepPx, tlw)}px`;
      updateRangeFromSel();
      followRangeChange(true);
    }
  }
  dragState=null;
}
// updateRangeFromSel is defined below with range sync

document.getElementById('role-set-start')?.addEventListener('click', ()=>{ const tlw=tl.clientWidth; const pxPerSec = tlw / (DURATION||1); const startSec = isFinite(v.currentTime)?v.currentTime:0; const width = sel.offsetWidth; let newLeft = clamp(startSec*pxPerSec, 0, Math.max(0, tlw - width)); sel.style.left = `${newLeft}px`; updateRangeFromSel(); followRangeChange(true); });
document.getElementById('role-set-end')?.addEventListener('click', ()=>{ const tlw=tl.clientWidth; const pxPerSec = tlw / (DURATION||1); const endSec = isFinite(v.currentTime)?v.currentTime:0; const maxWidth = MAX_LEN*pxPerSec; let newWidth = Math.min(maxWidth, tlw); let newLeft = clamp(endSec*pxPerSec - newWidth, 0, tlw - newWidth); sel.style.left = `${newLeft}px`; sel.style.width = `${newWidth}px`; updateRangeFromSel(); followRangeChange(true); });

document.getElementById('role-submit')?.addEventListener('click', async ()=>{
  try{
    if (!VIDEO_URL) return toast('未选择视频');
    const startSec = Math.max(0, Number(inStart.value||0));
    const endSec = Math.max(0, Number(inEnd.value||0));
    if (!(endSec > startSec)) return toast('起点必须小于终点');
    if (endSec - startSec > MAX_LEN + 1e-6) return toast('最长不超过3秒');
    const timestamps = `${fmtSec(startSec)},${fmtSec(endSec)}`;
    const body = {
      videoUrl: VIDEO_URL,
      timestamps,
      name: (inRoleName?.value || '').trim(),
      role: (inRoleType?.value || '').trim(),
      belone: (inRoleDesc?.value || '').trim(),
    };
    const res = await fetch(ROLE_CREATE_ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    if (!res.ok){ console.warn('create role failed', await res.text()); return toast('提交失败'); }
    toast('已提交'); closeRoleModal();
  }catch(e){ console.warn(e); toast('提交失败'); }
});

function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function fmtSec(n){ const s = Math.max(0, Number(n)||0); let str = s.toFixed(2); return str.replace(/\.?0+$/,''); }

// --- Constrain video playback to selection range ---
function setRange(s, e){
  s = Math.max(0, Number(s)||0); e = Math.max(s, Number(e)||s);
  RANGE.start = s; RANGE.end = e;
}
function getRange(){ return { start: RANGE.start, end: RANGE.end }; }
function updateRangeFromSel(){ const tlw=tl.clientWidth; const pxPerSec = tlw / (DURATION||1); const left=sel.offsetLeft; const w=sel.offsetWidth; const s=left/pxPerSec; const e=s + w/pxPerSec; inStart.value = s.toFixed(2); inEnd.value = Math.min(DURATION, e).toFixed(2); setRange(s, Math.min(DURATION, e)); }
let seekingGuard = false;
function safeSeek(t){ try{ seekingGuard = true; v.currentTime = t; } catch {} finally { setTimeout(()=>{ seekingGuard=false; }, 0); } }
function clampVideoToRange(){ const {start,end} = getRange(); if (!isFinite(v.currentTime)) return; if (v.currentTime < start) safeSeek(start); if (v.currentTime > end) safeSeek(end); }
v?.addEventListener('play', ()=>{ const {start} = getRange(); if (!isFinite(v.currentTime) || v.currentTime < start || v.currentTime > RANGE.end) safeSeek(start); });
v?.addEventListener('timeupdate', ()=>{ const {start,end} = getRange(); if (isFinite(v.currentTime) && v.currentTime >= end - 0.02) { const wasPlaying = !v.paused; safeSeek(start); if (wasPlaying) { try { v.play(); } catch {} } } });
v?.addEventListener('seeking', ()=>{ if (seekingGuard) return; clampVideoToRange(); });

function followRangeChange(autoPlay){ safeSeek(RANGE.start); if (autoPlay) { try { v.play(); } catch {} } }

async function renderFramesStrip(){
  const frames = document.getElementById('frames');
  if (!frames) return;
  frames.innerHTML = '';
  if (!DURATION || !isFinite(DURATION)) return;
  // compute fixed-size tile widths to exactly cover the timeline
  const tlw = tl.clientWidth;
  const tiles = Math.min(12, Math.max(6, Math.floor(tlw / 80)));
  const step = DURATION / tiles;
  TILES = tiles; STEP_SEC = step;
  const tileW = Math.floor(tlw / tiles);
  const lastTileW = tlw - tileW * (tiles - 1);
  const tlh = frames.clientHeight || 56;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  try {
    await sampleFramesViaCanvas(tiles, step, frames, canvas, ctx, tileW, lastTileW, tlh);
  } catch (e) {
    // Fallback: try thumbnail from extra, tile repeated
    const thumb = getThumbnailUrl(LAST_ITEM?.raw?.extra);
    if (thumb) {
      for (let i=0;i<tiles;i++) {
        const wrap = document.createElement('div');
        wrap.style.cssText = `height:100%;width:${i===tiles-1?lastTileW:tileW}px;overflow:hidden;`;
        const img = document.createElement('img');
        img.src = thumb; img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        wrap.appendChild(img); frames.appendChild(wrap);
      }
    }
  }
}

function getThumbnailUrl(extra){
  try { const ex = typeof extra==='string' ? JSON.parse(extra) : extra; const t = ex?.thumbnail?.path || ex?.thumbnail_url || null; return t ? String(t).replaceAll('openai.com','beqlee.icu') : null; } catch { return null; }
}

async function sampleFramesViaCanvas(tiles, step, container, canvas, ctx, tileW, lastTileW, tlh){
  // wait a short time to ensure dimensions
  await new Promise(r=>setTimeout(r,50));
  const vw = v.videoWidth || 9; const vh = v.videoHeight || 16; const vAspect = vw/vh;
  for (let i=0;i<tiles;i++){
    const t = Math.min(DURATION, Math.max(0, i*step + step/2));
    await seekVideoTo(t);
    try {
      const tw = (i===tiles-1?lastTileW:tileW);
      const th = tlh;
      // set canvas to tile size
      canvas.width = tw; canvas.height = th;
      // draw cover: center-crop without distortion
      const targetAspect = tw/th;
      let sx=0, sy=0, sw=vw, sh=vh;
      if (vAspect > targetAspect){
        // video wider than target, crop width
        sh = vh;
        sw = Math.round(sh * targetAspect);
        sx = Math.round((vw - sw)/2);
        sy = 0;
      } else {
        // video taller than target, crop height
        sw = vw;
        sh = Math.round(sw / targetAspect);
        sx = 0;
        sy = Math.round((vh - sh)/2);
      }
      ctx.clearRect(0,0,tw,th);
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, tw, th);
      const data = canvas.toDataURL('image/jpeg', 0.6);
      const wrap = document.createElement('div');
      wrap.style.cssText = `height:100%;width:${tw}px;overflow:hidden;`;
      const img = document.createElement('img');
      img.src = data; img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
      wrap.appendChild(img);
      container.appendChild(wrap);
    } catch (e) {
      throw e; // fall back if CORS blocks
    }
  }
}

function seekVideoTo(t){
  return new Promise((res)=>{
    const handler = ()=>{ v.removeEventListener('seeked', handler); res(); };
    v.addEventListener('seeked', handler);
    try { v.currentTime = t; } catch { v.removeEventListener('seeked', handler); res(); }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// Initial load
load("");
loadRoles();

// Lightweight toast helper (scoped to this page)
function toast(msg){
  try {
    const d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);background:#111;color:#fff;padding:8px 12px;border-radius:8px;opacity:0.95;z-index:99999;font-size:13px';
    document.body.appendChild(d);
    setTimeout(()=>d.remove(), 1600);
  } catch {}
}
