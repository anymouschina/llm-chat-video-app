"use client";
import { useState } from "react";

export default function TextToVideoPage() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(4);
  const [fps, setFps] = useState(30);
  const [aspect, setAspect] = useState("16:9");
  const [creating, setCreating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  async function createTask() {
    try {
      setCreating(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEXT_TO_VIDEO",
          prompt,
          params: { duration, fps, aspect },
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
      <h1>文本转视频</h1>
      <div className="label">提示词</div>
      <textarea className="input" rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="一句话描述 → 自动扩展为分镜（后续对接）" />
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
  );
}

