const el = (sel, p = document) => p.querySelector(sel);
const els = (sel, p = document) => Array.from(p.querySelectorAll(sel));

const state = {
  tasks: [], // { id, status, progress, prompt, model, duration, remoteId, videoUrl }
  nextId: 124,
};
let CURRENT_REMIX_ID = null;

function addTask({ prompt, duration, model, remoteId }) {
  const id = state.nextId++;
  const task = { id, status: "running", progress: 0, prompt, model, duration, remoteId, videoUrl: null };
  state.tasks.unshift(task);
  renderTasks();
  if (!remoteId) simulateProgress(task);
  return task;
}

function simulateProgress(task) {
  const t = setInterval(() => {
    if (task.status !== "running") return clearInterval(t);
    task.progress = Math.min(100, task.progress + Math.random() * 12 + 3);
    if (task.progress >= 100) {
      task.status = "finished";
      task.progress = 100;
      addRecent(task);
      clearInterval(t);
    }
    renderTasks();
  }, 200);
}

async function addRecent() { await loadRecent(); }

function recreate(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  addTask({ prompt: task.prompt, duration: task.duration, model: task.model });
}

function renderTasks() {
  const list = el("#task-list");
  list.innerHTML = "";
  state.tasks.forEach((t) => {
    const item = document.createElement("div");
    item.className = "task";
    const badgeClass = t.status === "running" ? "running" : t.status === "finished" ? "finished" : "failed";
    item.innerHTML = `
      <div class="task-head">
        <code style="background:#f3f4f6;padding:2px 6px;border-radius:6px">#${t.id}</code>
        <span class="badge ${badgeClass}">${t.status}</span>
        <span style="margin-left:auto;color:#6b7280">${Math.round(t.progress)}%</span>
      </div>
      <div class="progress"><span style="width:${t.progress}%"></span></div>
      <div class="task-actions">
        ${t.status === "finished" ? `<button class="btn" onclick="alert('演示：播放视频')">播放</button>` : ``}
        ${t.status === "failed" ? `<button class="btn" onclick="recreate(${t.id})">重试</button>` : ``}
      </div>
    `;
    list.appendChild(item);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// Wire UI
el("#generate").addEventListener("click", async () => {
  const prompt = el("#prompt").value.trim();
  const duration = Number(el("#duration").value);
  const model = el("#model").value; // 仅用于前端展示；发给后端固定 "turbo"
  if (!prompt) {
    if (!confirm("未填写提示词，仍要生成任务吗？")) return;
  }
  // 固定请求体：仅替换 prompt，其余字段按协议固定
  const orientation = "portrait";
  const n_frames = 300;
  // use remix mode when selected video exists
  const remixIndicator = document.getElementById('remix-indicator');
  const urlObj = new URL(location.href);
  const remixIdParam = urlObj.searchParams.get('remixId');
  const payload = {
    kind: "video",
    prompt,
    title: null,
    orientation,
    size: "small",
    n_frames,
    inpaint_items: (window.__UPLOAD_ITEMS__ && window.__UPLOAD_ITEMS__.length ? window.__UPLOAD_ITEMS__.map(it => ({ kind: 'upload', upload_id: it.id })) : []),
    remix_target_id: (CURRENT_REMIX_ID || remixIdParam) || null,
    metadata: null,
    cameo_ids: null,
    cameo_replacements: null,
    model: "sy_8",
    style_id: null,
    audio_caption: null,
    audio_transcript: null,
    video_caption: null,
    storyboard_id: null,
  };
  // Fire real request to Worker API -> n8n; continue with optimistic UI
  try {
    const res = await fetch("https://n8n-preview.beqlee.icu/webhook/cfb4829e-3eea-4062-9904-b408e153fb14", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const remoteId = data?.data?.id || null;
      toast("已提交到后端 (n8n)");
      if (remoteId) {
        const task = addTask({ prompt, duration, model, remoteId });
        pollRemote(task);
      } else {
        toast("后端未返回任务ID，无法跟踪进度");
      }
    } else {
      const t = await res.json().catch(() => ({}));
      console.warn("backend rejected", t);
      toast("后端未受理，仍进行前端演示");
    }
  } catch (e) {
    console.warn("request failed", e);
    toast("请求失败，进行前端演示");
  }
});

el("#btn-extend").addEventListener("click", () => {
  const prompt = el("#prompt");
  const seed = "光影层次丰富的赛博街头，霓虹反射在湿润路面，手持稳定推进，聚焦人物眼神";
  prompt.value = prompt.value ? prompt.value + "\n\n" + seed : seed;
});

el("#btn-presets").addEventListener("click", () => {
  const presets = [
    "日落海边延时摄影，低角度拉远，胶片质感",
    "城市夜景车流光轨，俯拍，慢门效果",
    "森林晨雾，推镜穿过树木，柔和光晕",
  ];
  alert("示例预设:\n- " + presets.join("\n- "));
});

// 取消示例种子任务：空数据即为空

// Expose for inline handlers
window.recreate = recreate;

// Simple toast helper
function toast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText =
    "position:fixed;left:50%;top:10px;transform:translateX(-50%);background:#111;color:#fff;padding:8px 12px;border-radius:8px;opacity:0.95;z-index:9999;font-size:13px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

async function pollRemote(task) {
  const statusUrl = "https://n8n-preview.beqlee.icu/webhook/f44e67ae-059c-4150-a01a-c1988413ef38";
  while (task.status === "running") {
    try {
      const url = `${statusUrl}?taskId=${encodeURIComponent(task.remoteId)}`;
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const j = await res.json().catch(() => ({}));
      const d = j?.data || j || {};

      // Progress: accept 0-100 or 0-1, strings or numbers
      let percent = firstNumber(d.progress, d.percent, d.percentage);
      if (typeof percent === "string") percent = Number(percent);
      if (typeof percent === "number" && !Number.isNaN(percent)) {
        if (percent > 0 && percent <= 1) percent = percent * 100;
        task.progress = clamp(percent, 0, 100);
      }

      // Status and media URL resolution
      const status = String(d.status || d.state || "running").toLowerCase();
      let vurl = d.videoUrl || d.video_url || null;
      if (!vurl && d.extra) {
        try {
          const ex = typeof d.extra === "string" ? JSON.parse(d.extra) : d.extra;
          vurl = ex?.downloadable_url || ex?.url || ex?.encodings?.source?.path || ex?.encodings?.source_wm?.path || null;
        } catch {}
      }
      if (vurl) vurl = String(vurl).replaceAll("openai.com", "beqlee.icu");

      if (["finished","success","done","completed"].includes(status) || vurl) {
        task.status = "finished";
        task.progress = 100;
        task.videoUrl = vurl;
        renderTasks();
        loadRecent();
        break;
      }
      if (["failed","error"].includes(status)) {
        task.status = "failed";
        renderTasks();
        break;
      }
      renderTasks();
    } catch {}
    await sleep(2000);
  }
}

function firstNumber(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return undefined;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Recent list from remote API ---
let RECENT_ALL = [];
let RECENT_VISIBLE = 5;

async function loadRecent() {
  const recent = document.getElementById("recent-list");
  try {
    const res = await fetch("https://n8n-preview.beqlee.icu/webhook/videoList", { headers: { Accept: "application/json" } });
    const json = await res.json();
    RECENT_ALL = normalizeRecent(json);
    renderRecent(RECENT_ALL.slice(0, RECENT_VISIBLE), recent);
    renderRecentMore(recent.parentElement);
  } catch (e) {
    recent.innerHTML = `<div style="color:#6b7280">无法加载最近生成</div>`;
  }
}

function normalizeRecent(json) {
  const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  const items = arr.map(mapRecentItem).filter(Boolean);
  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return items;
}

function mapRecentItem(r) {
  try {
    let vurl = r.videoUrl || r.video_url || r.url || r.downloadable_url || null;
    if (!vurl && r.extra) {
      const ex = typeof r.extra === "string" ? JSON.parse(r.extra) : r.extra;
      vurl = ex?.downloadable_url || ex?.url || ex?.encodings?.source?.path || ex?.encodings?.source_wm?.path || null;
    }
    let remixId = null;
    try {
      const ex2 = typeof r.extra === "string" ? JSON.parse(r.extra) : r.extra;
      remixId = ex2?.id || null;
    } catch {}
    return { title: r.title || r.prompt || r.chat || "(无题)", createdAt: r.createdAt || r.created_at || "", model: r.model || "", videoUrl: vurl ? String(vurl).replaceAll("openai.com","beqlee.icu") : vurl, remixId };
  } catch { return null; }
}

function renderRecent(items, container) {
  container.innerHTML = "";
  if (!items.length) { return; }
  for (const it of items) {
    const card = document.createElement("div");
    card.className = "card";
    const link = it.videoUrl ? `/zh/text-to-video/?video=${encodeURIComponent(it.videoUrl)}&title=${encodeURIComponent(it.title)}${it.remixId ? `&remixId=${encodeURIComponent(it.remixId)}` : ''}` : null;
    const mediaInner = it.videoUrl ? `<video class=\"thumb\" src=\"${it.videoUrl}\" preload=\"metadata\"></video>` : `<div class=\"thumb\">无视频</div>`;
    const media = link ? `<a href=\"${link}\" data-video=\"${it.videoUrl}\" data-title=\"${it.title}\" ${it.remixId ? `data-remix-id=\"${it.remixId}\"` : ''}>${mediaInner}</a>` : mediaInner;
    card.innerHTML = `
      ${media}
      <div style=\"display:flex;gap:8px;align-items:center\">
        <strong class="title">${escapeHtml(it.title)}</strong>
        <span style=\"color:#6b7280;margin-left:auto\">${escapeHtml(it.model || "")}</span>
      </div>
      <div style=\"color:#6b7280;margin-top:4px;\">${escapeHtml(it.createdAt || "")}</div>
    `;
    container.appendChild(card);
  }
}

function renderRecentMore(panelEl) {
  if (!panelEl) return;
  let moreEl = panelEl.querySelector('#recent-more');
  if (!moreEl) {
    moreEl = document.createElement('div');
    moreEl.id = 'recent-more';
    moreEl.style.display = 'flex';
    moreEl.style.justifyContent = 'center';
    moreEl.style.marginTop = '8px';
    panelEl.appendChild(moreEl);
  }
  const remaining = Math.max(0, RECENT_ALL.length - RECENT_VISIBLE);
  if (remaining > 0) {
    moreEl.innerHTML = `<button class="btn" id="recent-more-btn">展示更多（剩余${remaining}）</button>`;
    moreEl.querySelector('#recent-more-btn').onclick = () => {
      RECENT_VISIBLE += 5;
      const recent = document.getElementById('recent-list');
      renderRecent(RECENT_ALL.slice(0, RECENT_VISIBLE), recent);
      renderRecentMore(panelEl);
    };
  } else {
    moreEl.innerHTML = '';
  }
}

// Initial recent load + periodic refresh
loadRecent();
setInterval(loadRecent, 10000);
// parse selected video from URL on load
(function(){
  try {
    const u = new URL(location.href);
    const v = u.searchParams.get('video');
    const t = u.searchParams.get('title');
    const rid = u.searchParams.get('remixId');
    if (v) setSelectedVideo(v, t||'', rid||null);
  } catch {}
})();

function setSelectedVideo(videoUrl, title, remixId){
  const box = document.getElementById('selected-video');
  if (!box) return;
  const url = String(videoUrl);
  const remixEl = document.getElementById('remix-indicator');
  if (remixEl) remixEl.style.display = remixId ? 'inline-flex' : 'none';
  CURRENT_REMIX_ID = remixId || null;
  try {
    const u = new URL(location.href);
    if (CURRENT_REMIX_ID) u.searchParams.set('remixId', CURRENT_REMIX_ID); else u.searchParams.delete('remixId');
    u.searchParams.set('video', url);
    if (title) u.searchParams.set('title', title);
    history.replaceState(null, '', u.toString());
  } catch {}
  box.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center">
      <strong class="title" style="flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title||'已选择视频')}</strong>
      <a class="btn" href="${url}" download>下载</a>
    </div>
    <video src="${url}" controls preload="metadata"></video>
  `;
}

// Intercept clicks on recent list when already on T2V page
(function(){
  try {
    const list = document.getElementById('recent-list');
    if (!list) return;
    list.addEventListener('click', (e) => {
      const a = e.target && e.target.closest('a[data-video]');
      if (!a) return;
      // if already on /zh/text-to-video/, prevent navigation
      if (location.pathname.startsWith('/zh/text-to-video')) {
        e.preventDefault();
        setSelectedVideo(a.getAttribute('data-video'), a.getAttribute('data-title'), a.getAttribute('data-remix-id'));
      }
    });
  } catch {}
})();

// --- Paste/Click upload for images ---
const UPLOAD_ENDPOINT = 'https://n8n-preview.beqlee.icu/webhook/upload';
const filePicker = document.getElementById('file-picker');
const pickBtn = document.getElementById('pick-image');
const uploadPreview = document.getElementById('upload-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');

if (pickBtn && filePicker) {
  pickBtn.addEventListener('click', () => filePicker.click());
  filePicker.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) uploadImageFile(f);
  });
}

document.addEventListener('paste', (e) => {
  if (!e.clipboardData || !e.clipboardData.items) return;
  for (const item of e.clipboardData.items) {
    if (item.type && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) uploadImageFile(blob);
      e.preventDefault();
      break;
    }
  }
});

async function uploadImageFile(file) {
  try {
    const fd = new FormData();
    const name = file.name || `paste-${Date.now()}.png`;
    fd.append('file', file, name);
    showUploading(name);
    const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: fd });
    const text = await res.text();
    let url = null, id = null;
    try {
      const j = JSON.parse(text);
      id = j.id || j.data?.id || j.result?.id || null;
      url = j.url || j.data?.url || j.fileUrl || j.downloadUrl || j.result?.url || null;
    } catch {
      if (/^https?:\/\//.test(text.trim())) url = text.trim();
    }
    if (!id) {
      toast('上传完成，但未返回ID');
      finishUploading(null);
      return;
    }
    url = String(url).replaceAll('openai.com','beqlee.icu');
    addUploadedPreview(url, name, id);
    window.__UPLOAD_ITEMS__ = window.__UPLOAD_ITEMS__ || [];
    window.__UPLOAD_ITEMS__.push({ id, url, name });
    finishUploading(url);
  } catch (err) {
    console.warn('upload failed', err);
    toast('上传失败');
    finishUploading(null);
  }
}

function showUploading(name){
  if (uploadPlaceholder) uploadPlaceholder.textContent = `正在上传 ${name} …`;
}

function finishUploading(url){
  if (!uploadPlaceholder) return;
  if (!url && !document.querySelector('#upload-preview img')) {
    uploadPlaceholder.textContent = '粘贴图片或点击“选择图片”上传';
  } else {
    uploadPlaceholder.textContent = '';
  }
}

function addUploadedPreview(url, name, id){
  if (!uploadPreview) return;
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  wrap.style.gap = '4px';
  const img = document.createElement('img');
  img.src = url; img.alt = name || 'uploaded';
  const row = document.createElement('div');
  row.style.display = 'flex'; row.style.gap = '6px';
  const a = document.createElement('a'); a.href = url; a.textContent = '查看'; a.target = '_blank';
  const del = document.createElement('button'); del.className='btn'; del.type='button'; del.textContent='移除';
  del.onclick = () => {
    wrap.remove();
    finishUploading(null);
  };
  row.appendChild(a); row.appendChild(del);
  wrap.appendChild(img); wrap.appendChild(row);
  uploadPreview.appendChild(wrap);
}
