const el = (sel, p = document) => p.querySelector(sel);

const state = {
  tasks: [],
  nextId: 200,
};

function addTask({ prompt, duration, model }) {
  const id = state.nextId++;
  const task = { id, status: "running", progress: 0, prompt, model, duration };
  state.tasks.unshift(task);
  renderTasks();
  simulateProgress(task);
}

function simulateProgress(task) {
  const t = setInterval(() => {
    if (task.status !== "running") return clearInterval(t);
    task.progress = Math.min(100, task.progress + Math.random() * 10 + 5);
    if (task.progress >= 100) {
      task.status = "finished";
      task.progress = 100;
      addRecent(task);
      clearInterval(t);
    }
    renderTasks();
  }, 240);
}

function addRecent(task) {
  const recent = el("#recent-list");
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="thumb">预览（示例）</div>
    <div style="display:flex;gap:8px;align-items:center">
      <strong>视频 ${task.duration}s</strong>
      <span style="color:#6b7280;margin-left:auto">模型: ${task.model}</span>
    </div>
    <div style="color:#6b7280;margin-top:4px;">提示词: ${escapeHtml(task.prompt || "(空)")}</div>
    <div class="task-actions">
      <button class="btn" onclick="alert('演示：播放')">播放</button>
      <button class="btn" onclick="alert('演示：下载')">下载</button>
      <a class="btn" href="/zh/text-to-video/">再生成</a>
    </div>
  `;
  recent.prepend(card);
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
    `;
    list.appendChild(item);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// Bind actions
el("#generate").addEventListener("click", async () => {
  const prompt = el("#prompt").value.trim();
  const duration = Number(el("#duration").value);
  // 固定请求体：仅替换 prompt，其余字段按协议固定
  const orientation = "portrait";
  const size = "small";
  const model = "turbo";
  const n_frames = 300;
  const payload = {
    kind: "video",
    prompt,
    title: null,
    orientation,
    size,
    n_frames,
    inpaint_items: [],
    remix_target_id: null,
    metadata: null,
    cameo_ids: null,
    cameo_replacements: null,
    model,
    style_id: null,
    audio_caption: null,
    audio_transcript: null,
    video_caption: null,
    storyboard_id: null,
  };
  try {
    await fetch("/api/t2v", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {}
  addTask({ prompt, duration, model });
});

document.getElementById("btn-extend").addEventListener("click", () => {
  const prompt = el("#prompt");
  const seed = "电影级光影语言，手持推进，人物情绪递进，环境霓虹反射";
  prompt.value = prompt.value ? prompt.value + "\n\n" + seed : seed;
});

document.getElementById("btn-presets").addEventListener("click", () => {
  alert("示例预设:\n- 雨夜街头霓虹反射\n- 森林晨雾穿行\n- 海边落日延时");
});

// Seed one example
addTask({ prompt: "街头灯光反射，推镜进入人物眼神", duration: 10, model: "sora-2" });
