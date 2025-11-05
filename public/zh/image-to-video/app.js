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

