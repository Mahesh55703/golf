import { NextResponse } from "next/server";
import { destroyGolferSession } from "@/lib/golfer-auth";

export async function POST() {
  await destroyGolferSession();
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}
