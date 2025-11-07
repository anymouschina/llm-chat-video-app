const qs = (s, p=document)=>p.querySelector(s);
const video = qs('#v');
const cur = qs('#cur');
const dur = qs('#dur');
const inStart = qs('#start');
const inEnd = qs('#end');
const meta = qs('#meta');

const endpoint = 'https://n8n-preview.beqlee.icu/webhook/createRole';

// init from URL
try{
  const u = new URL(location.href);
  const url = u.searchParams.get('video');
  const title = u.searchParams.get('title') || '';
  if (!url){ meta.textContent = '缺少视频参数'; }
  else {
    const displayUrl = String(url).replaceAll('openai.com','beqlee.icu');
    meta.textContent = `视频：${title ? title+' · ' : ''}${displayUrl}`;
    video.src = displayUrl;
  }
}catch{}

video?.addEventListener('loadedmetadata', ()=>{
  dur.textContent = `${video.duration.toFixed(2)}s`;
  inEnd.value = video.duration.toFixed(2);
});
video?.addEventListener('timeupdate', ()=>{
  if (!isFinite(video.currentTime)) return;
  cur.textContent = `${video.currentTime.toFixed(2)}s`;
});

qs('#set-start')?.addEventListener('click', ()=>{
  if (isFinite(video.currentTime)) inStart.value = video.currentTime.toFixed(2);
});
qs('#set-end')?.addEventListener('click', ()=>{
  if (isFinite(video.currentTime)) inEnd.value = video.currentTime.toFixed(2);
});

qs('#submit')?.addEventListener('click', async ()=>{
  try{
    const u = new URL(location.href);
    const videoUrl = u.searchParams.get('video');
    if (!videoUrl) return toast('缺少视频url');
    const startSec = Math.max(0, Number(inStart.value || 0));
    const endSec = Math.max(0, Number(inEnd.value || 0));
    const total = isFinite(video.duration) ? video.duration : undefined;
    if (total){
      if (startSec >= endSec) return toast('起点必须小于终点');
      if (startSec > total || endSec > total) return toast('时间超出总时长');
    }
    const body = { videoUrl, startSec, endSec };
    const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    if (!res.ok){ console.warn('create role range failed', await res.text()); return toast('提交失败'); }
    toast('已提交创建');
  }catch(e){ console.warn(e); toast('提交失败'); }
});

function toast(msg){ const d=document.createElement('div'); d.textContent=msg; d.style.cssText='position:fixed;left:50%;top:10px;transform:translateX(-50%);background:#111;color:#fff;padding:8px 12px;border-radius:8px;opacity:.95;z-index:9999;font-size:13px'; document.body.appendChild(d); setTimeout(()=>d.remove(),1500); }

