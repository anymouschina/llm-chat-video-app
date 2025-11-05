import Link from "next/link";

export default function Home() {
  return (
    <div className="card">
      <h1>个人 Sora 工作站（MVP）</h1>
      <p>最小可用：前端页面 + 任务创建接口 + 任务状态 + 视频存储/播放。</p>
      <ul>
        <li>
          <Link href="/zh/image-to-video">图片转视频</Link>
        </li>
        <li>
          <Link href="/zh/text-to-video">文本转视频</Link>
        </li>
        <li>
          <Link href="/history">历史记录</Link>
        </li>
      </ul>
      <p style={{ color: "#6b7280" }}>提示：当前预留了 n8n 回调接口，稍后可打通。</p>
    </div>
  );
}

