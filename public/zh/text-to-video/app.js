const el = (sel, p = document) => p.querySelector(sel);
const els = (sel, p = document) => Array.from(p.querySelectorAll(sel));

const state = {
  tasks: [], // { id, status, progress, prompt, model, duration }
  nextId: 124,
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
      <button class="btn" onclick="recreate(${task.id})">再生成</button>
    </div>
  `;
  recent.prepend(card);
}

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
  const payload = {
    kind: "video",
    prompt,
    title: null,
    orientation,
    size: "small",
    n_frames,
    inpaint_items: [],
    remix_target_id: null,
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
    const res = await fetch("/api/t2v", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast("已提交到后端 (n8n)");
    } else {
      const t = await res.json().catch(() => ({}));
      console.warn("backend rejected", t);
      toast("后端未受理，仍进行前端演示");
    }
  } catch (e) {
    console.warn("request failed", e);
    toast("请求失败，进行前端演示");
  }
  addTask({ prompt, duration, model });
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

// Seed some tasks
addTask({ prompt: "街头灯光反射，推镜进入人物眼神", duration: 15, model: "sora-2" });

// Expose for inline handlers
window.recreate = recreate;
