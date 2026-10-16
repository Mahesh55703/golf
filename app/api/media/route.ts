import { NextResponse } from "next/server";
import { getMediaMap } from "@/lib/media";

export async function GET() {
  try {
    const media = await getMediaMap();
    return NextResponse.json(media);
  } catch {
    return NextResponse.json({});
  }
}
