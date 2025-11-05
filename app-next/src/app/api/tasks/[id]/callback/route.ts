import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// n8n can call this endpoint to update a task's status
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    const { status, videoUrl, error } = await req.json();
    if (!status || !["PENDING", "RUNNING", "FINISHED", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const updated = await prisma.task.update({
      where: { id },
      data: { status, videoUrl: videoUrl ?? null, error: error ?? null },
    });
    return NextResponse.json({ ok: true, task: updated });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}

