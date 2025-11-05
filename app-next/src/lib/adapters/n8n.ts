export async function triggerTextToVideo(input: {
  webhookUrl?: string;
  taskId: string;
  prompt?: string;
  params?: Record<string, any>;
  callbackUrl: string;
}) {
  const url = input.webhookUrl;
  if (!url) return { ok: false, reason: "missing webhook" } as const;

  const duration = Number(input.params?.duration ?? input.params?.durationSec ?? 4);
  const fps = Number(input.params?.fps ?? 30);
  const n_frames = Math.max(1, Math.min(1200, Math.round(duration * fps)));

  const aspect = String(input.params?.aspect ?? "16:9");
  const orientation = aspect === "9:16" ? "portrait" : aspect === "1:1" ? "square" : "landscape";

  const size = String(input.params?.size ?? "small");
  const remix_target_id = process.env.N8N_REMIX_TARGET_ID || "gen_01k8zgzxbpeq9vatmy831m3k22";
  const model = process.env.N8N_MODEL || "turbo";

  const payload = {
    kind: "video",
    prompt: input.prompt ?? "",
    title: null as any,
    orientation,
    size,
    n_frames,
    inpaint_items: [] as any[],
    remix_target_id,
    metadata: null as any, // n8n 可在工作流中加入回传信息
    cameo_ids: null as any,
    cameo_replacements: null as any,
    model,
    style_id: null as any,
    audio_caption: null as any,
    audio_transcript: null as any,
    video_caption: null as any,
    storyboard_id: null as any,
    // 附加信息（可选）：便于 n8n 回调
    _internal: {
      taskId: input.taskId,
      callbackUrl: input.callbackUrl,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, status: res.status } as const;
    return { ok: true } as const;
  } catch (e) {
    return { ok: false, reason: String(e) } as const;
  }
}

export async function triggerImageToVideo(input: {
  webhookUrl?: string;
  taskId: string;
  imageUrl?: string;
  prompt?: string;
  params?: Record<string, any>;
  callbackUrl: string;
}) {
  const url = input.webhookUrl;
  if (!url) return { ok: false, reason: "missing webhook" } as const;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "IMAGE_TO_VIDEO",
        taskId: input.taskId,
        imageUrl: input.imageUrl,
        prompt: input.prompt,
        params: input.params,
        callbackUrl: input.callbackUrl,
      }),
    });
    if (!res.ok) return { ok: false, status: res.status } as const;
    return { ok: true } as const;
  } catch (e) {
    return { ok: false, reason: String(e) } as const;
  }
}
