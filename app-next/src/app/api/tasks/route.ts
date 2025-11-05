import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerTextToVideo, triggerImageToVideo } from "@/lib/adapters/n8n";

export async function GET() {
  const items = await prisma.task.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, prompt, params, imageDataUrl } = body || {};
    if (!type || (type !== "IMAGE_TO_VIDEO" && type !== "TEXT_TO_VIDEO")) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }
    // Future: persist image to OSS/local and store a URL. For now, keep marker in params.
    const task = await prisma.task.create({
      data: {
        type,
        prompt: prompt ?? null,
        params: { ...(params || {}), hasImage: Boolean(imageDataUrl) },
        status: "PENDING",
      },
    });
    // Build callback URL for n8n
    const base = process.env.PUBLIC_BASE_URL ||
      `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
    const callbackUrl = `${base}/api/tasks/${task.id}/callback`;

    // Trigger provider (n8n webhook) depending on type
    let triggered = { ok: false as const };
    if (type === "TEXT_TO_VIDEO") {
      triggered = await triggerTextToVideo({
        webhookUrl: process.env.N8N_T2V_WEBHOOK_URL,
        taskId: task.id,
        prompt,
        params,
        callbackUrl,
      });
    } else if (type === "IMAGE_TO_VIDEO") {
      triggered = await triggerImageToVideo({
        webhookUrl: process.env.N8N_I2V_WEBHOOK_URL,
        taskId: task.id,
        imageUrl: undefined, // reserved: put OSS URL here later
        prompt,
        params,
        callbackUrl,
      });
    }

    if (triggered.ok) {
      await prisma.task.update({ where: { id: task.id }, data: { status: "RUNNING" } });
    }

    return NextResponse.json({ id: task.id, accepted: triggered.ok });
  } catch (e) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
