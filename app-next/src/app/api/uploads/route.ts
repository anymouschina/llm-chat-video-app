import { NextResponse } from "next/server";

// Reserved: image upload & OSS integration
export async function POST() {
  return NextResponse.json({ error: "not_implemented", message: "Image upload reserved; integrate OSS later" }, { status: 501 });
}

