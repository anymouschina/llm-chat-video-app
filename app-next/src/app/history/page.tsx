"use client";
import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  type: "IMAGE_TO_VIDEO" | "TEXT_TO_VIDEO";
  status: "PENDING" | "RUNNING" | "FINISHED" | "FAILED";
  videoUrl?: string | null;
  prompt?: string | null;
  createdAt: string;
};

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''), []);
  const focus = params.get("focus");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (alive) setTasks(data.items || []);
      setLoading(false);
    }
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="card">
      <h1>历史记录</h1>
      {loading && <p style={{ color: "#6b7280" }}>加载中...</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {tasks.map((t) => (
          <div key={t.id} className="card" style={{ borderColor: t.id === focus ? '#f6821f' : undefined }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 6 }}>{t.id.slice(0, 8)}</code>
              <span>{t.type === "IMAGE_TO_VIDEO" ? "图片转视频" : "文本转视频"}</span>
              <span style={{ marginLeft: "auto" }}>{badge(t.status)}</span>
            </div>
            {t.prompt && <p style={{ color: "#6b7280" }}>{t.prompt}</p>}
            {t.videoUrl && t.status === "FINISHED" && (
              <video src={t.videoUrl} controls preload="metadata" />
            )}
          </div>
        ))}
        {!loading && tasks.length === 0 && <p style={{ color: "#6b7280" }}>暂无任务。</p>}
      </div>
    </div>
  );
}

function badge(status: Task["status"]) {
  const color = {
    PENDING: "#d97706",
    RUNNING: "#2563eb",
    FINISHED: "#16a34a",
    FAILED: "#dc2626",
  }[status];
  return (
    <span style={{ color, border: `1px solid ${color}`, padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>
      {status}
    </span>
  );
}

