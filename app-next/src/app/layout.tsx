import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="header">
          <nav className="nav">
            <Link href="/">个人 Sora 工作站</Link>
            <div className="spacer" />
            <Link href="/zh/image-to-video">图片转视频</Link>
            <Link href="/zh/text-to-video">文本转视频</Link>
            <Link href="/history">历史记录</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">© 2025 Personal Sora Station</footer>
      </body>
    </html>
  );
}

