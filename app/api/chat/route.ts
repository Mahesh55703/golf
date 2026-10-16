import { NextResponse } from "next/server";
export const runtime = "nodejs";
type ChatMessage = { role?: "user" | "assistant"; text?: string };
export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "The AI assistant is not configured yet. Add GEMINI_API_KEY to your .env.local file." }, { status: 503 });
    const body = await request.json() as { message?: string; history?: ChatMessage[] };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    if (message.length > 1000) return NextResponse.json({ error: "Please keep your message under 1,000 characters." }, { status: 413 });
    const history = Array.isArray(body.history) ? body.history.slice(-8).filter(m => (m.role === "user" || m.role === "assistant") && typeof m.text === "string").map(m => `${m.role === "assistant" ? "Fairway assistant" : "Visitor"}: ${String(m.text).slice(0, 1000)}`).join("\n") : "";
    const prompt = `You are Fairway's friendly, concise golf and golf-tournament platform assistant. Help with tournament discovery, golf terminology, handicap concepts, formats, registrations, clubs, and navigating this website. Be clear that this demo uses sample tournament data and that the contact form is not yet connected to email. Never claim to have booked, registered, charged, or changed anything. For official WHS handicaps and rules, explain general concepts and recommend confirmation with the authorized golf club or governing body. All prices displayed by this website are illustrative USD sample rates. Do not ask for passwords, payment card details, or sensitive personal data.

Recent conversation:
${history}

Visitor's latest question: ${message}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 700 } }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("Gemini API request failed", response.status, data?.error?.message); return NextResponse.json({ error: "The golf assistant couldn't answer just now. Please try again in a moment." }, { status: 502 }); }
    const reply = data?.candidates?.[0]?.content?.parts?.map((part: {text?: string}) => part.text || "").join("\n").trim();
    if (!reply) return NextResponse.json({ error: "I couldn't generate an answer for that question. Please try again." }, { status: 502 });
    return NextResponse.json({ reply });
  } catch (error) { console.error("Chat route error", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
}
