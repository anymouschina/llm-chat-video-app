const els = {
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  pick: document.getElementById("pick"),
  previewImg: document.getElementById("preview-img"),
  overlay: document.getElementById("preview-overlay"),
  prompt: document.getElementById("prompt"),
  duration: document.getElementById("duration"),
  resolution: document.getElementById("resolution"),
  fps: document.getElementById("fps"),
  aspect: document.getElementById("aspect"),
  model: document.getElementById("model"),
  seed: document.getElementById("seed"),
  randomSeed: document.getElementById("random-seed"),
  generate: document.getElementById("generate"),
  exportConfig: document.getElementById("export-config"),
  note: document.getElementById("note"),
};

const state = {
  imageDataUrl: "",
};

function acceptFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("请上传图片文件（PNG/JPG/JPEG）");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert("图片大小上限为 10MB");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.imageDataUrl = reader.result;
    els.previewImg.src = state.imageDataUrl;
    els.previewImg.style.display = "block";
    els.overlay.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// File picking
els.pick.addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", (e) => acceptFile(e.target.files?.[0]));

// Drag & drop
const dz = els.dropzone;
["dragenter", "dragover"].forEach((evt) => {
  dz.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.add("drag");
  });
});
["dragleave", "drop"].forEach((evt) => {
  dz.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dz.classList.remove("drag");
  });
});
dz.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  acceptFile(file);
});

// Random seed
els.randomSeed.addEventListener("click", () => {
  els.seed.value = String(Math.floor(Math.random() * 1_000_000));
});

// Export config
els.exportConfig.addEventListener("click", async () => {
  const config = {
    prompt: els.prompt.value.trim(),
    durationSec: Number(els.duration.value),
    resolution: els.resolution.value,
    fps: Number(els.fps.value),
    aspect: els.aspect.value,
    model: els.model.value,
    seed: els.seed.value ? Number(els.seed.value) : undefined,
    image: state.imageDataUrl ? "<embedded data URL>" : null,
  };
  const text = JSON.stringify(config, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制设置到剪贴板");
  } catch {
    downloadBlob(new Blob([text], { type: "application/json" }), "image-to-video-config.json");
  }
});

// Disabled generate button (placeholder)
els.generate.addEventListener("click", () => {
  alert("当前为演示页面，尚未接入后端渲染。");
});

function toast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText =
    "position:fixed;left:50%;top:10px;transform:translateX(-50%);background:#111;color:#fff;padding:8px 12px;border-radius:8px;opacity:0.95;z-index:9999;font-size:13px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// --- 最近生成（远端拉取，默认展示5条，支持“展示更多”） ---
let I2V_RECENT_ALL = [];
let I2V_RECENT_VISIBLE = 5;

async function loadRecent() {
  const cont = document.getElementById("recent-list");
  if (!cont) return;
  try {
    const res = await fetch("https://n8n-preview.beqlee.icu/webhook/videoList", { headers: { Accept: "application/json" } });
    const json = await res.json();
    I2V_RECENT_ALL = normalizeRecent(json);
    renderRecent(I2V_RECENT_ALL.slice(0, I2V_RECENT_VISIBLE), cont);
    renderRecentMore(cont.parentElement);
  } catch (e) {
    cont.innerHTML = `<div style="color:#6b7280">无法加载最近生成</div>`;
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
    if (vurl) vurl = String(vurl).replaceAll("openai.com","beqlee.icu");
    return { title: r.title || r.prompt || r.chat || "(无题)", createdAt: r.createdAt || r.created_at || "", model: r.model || "", videoUrl: vurl };
  } catch { return null; }
}

function renderRecent(items, container) {
  container.innerHTML = "";
  if (!items.length) { return; }
  for (const it of items) {
    const card = document.createElement("div");
    card.className = "card";
    const media = it.videoUrl ? `<video class=\"thumb\" src=\"${it.videoUrl}\" controls preload=\"metadata\"></video>` : `<div class=\"thumb\">无视频</div>`;
    card.innerHTML = `
      ${media}
      <div style=\"display:flex;gap:8px;align-items:center\">
        <strong>${escapeHtml(it.title || '')}</strong>
        <span style=\"color:#6b7280;margin-left:auto\">${escapeHtml(it.model || '')}</span>
      </div>
      <div style=\"color:#6b7280;margin-top:4px;\">${escapeHtml(it.createdAt || '')}</div>
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
  const remaining = Math.max(0, I2V_RECENT_ALL.length - I2V_RECENT_VISIBLE);
  if (remaining > 0) {
    moreEl.innerHTML = `<button class=\"btn\" id=\"recent-more-btn\">展示更多（剩余${remaining}）</button>`;
    moreEl.querySelector('#recent-more-btn').onclick = () => {
      I2V_RECENT_VISIBLE += 5;
      const cont = document.getElementById('recent-list');
      renderRecent(I2V_RECENT_ALL.slice(0, I2V_RECENT_VISIBLE), cont);
      renderRecentMore(panelEl);
    };
  } else {
    moreEl.innerHTML = '';
  }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

// 初次加载与轮询刷新
loadRecent();
setInterval(loadRecent, 10000);
