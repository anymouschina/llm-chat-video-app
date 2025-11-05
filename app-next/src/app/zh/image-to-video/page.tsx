"use client";
import { useState } from "react";

export default function ImageToVideoPage() {
  const [image, setImage] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(4);
  const [fps, setFps] = useState(30);
  const [aspect, setAspect] = useState("16:9");
  const [creating, setCreating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("请上传图片");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function createTask() {
    try {
      setCreating(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "IMAGE_TO_VIDEO",
          prompt,
          params: { duration, fps, aspect },
          imageDataUrl: image || undefined,
        }),
      });
      if (!res.ok) throw new Error("创建任务失败");
      const data = await res.json();
      setTaskId(data.id);
      alert(`任务创建成功: ${data.id}`);
    } catch (e: any) {
      alert(e.message || "创建任务失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="card">
      <h1>图片转视频</h1>
      <div className="row">
        <div>
          <div className="label">上传图片</div>
          <input type="file" accept="image/*" onChange={onPick} />
          <div style={{ marginTop: 8 }}>{image && <img src={image} alt="预览" style={{ maxWidth: "100%", borderRadius: 8 }} />}</div>
        </div>
        <div>
          <div className="label">提示词（可选）</div>
          <textarea className="input" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="描述运动/风格/镜头" />
          <div className="grid2" style={{ marginTop: 8 }}>
            <div>
              <div className="label">时长</div>
              <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value={2}>2s</option>
                <option value={4}>4s</option>
                <option value={6}>6s</option>
              </select>
            </div>
            <div>
              <div className="label">帧率</div>
              <select className="input" value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                <option value={24}>24</option>
                <option value={30}>30</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="label">纵横比</div>
            <select className="input" value={aspect} onChange={(e) => setAspect(e.target.value)}>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn primary" onClick={createTask} disabled={creating}>
              {creating ? "创建中..." : "创建任务（预留 API）"}
            </button>
            {taskId && <a className="btn" href={`/history?focus=${taskId}`}>查看任务</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

