import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(255, "Email cannot exceed 255 characters"),
  topic: z
    .string()
    .trim()
    .min(1, "Please select an inquiry division")
    .max(100, "Topic cannot exceed 100 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters long")
    .max(3000, "Message cannot exceed 3000 characters"),
  honeypot: z.string().max(0, "Bot detected").optional().or(z.literal("")),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export interface EmailSendResult {
  success: boolean;
  provider: "resend" | "mock";
  id?: string;
  error?: string;
  deliveredToProvider: boolean;
}

/**
 * In-memory sliding window rate limiter for contact submissions per IP.
 * Enforces max 5 inquiries per 10-minute window.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

export function checkContactRateLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(identifier, newEntry);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count, resetAt: entry.resetAt };
}

/**
 * Reset rate limit store (useful for automated testing)
 */
export function resetContactRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Transactional email dispatcher for contact enquiries.
 * Uses Resend REST API via native fetch without heavy external dependencies.
 * If RESEND_API_KEY is not configured, safely defaults to simulated logging mode.
 */
export async function sendContactEmail(
  data: ContactFormData,
  mockFetch?: typeof fetch
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL_TO || "tournaments@golfpulse.com";
  const fromEmail = process.env.CONTACT_EMAIL_FROM || "GolfPulse Inquiries <onboarding@resend.dev>";

  // If credentials are not configured, perform safe simulated queueing
  if (!apiKey) {
    console.log("[Contact Service] RESEND_API_KEY not configured. Enquiry accepted in simulated development mode:", {
      name: data.name,
      email: data.email,
      topic: data.topic,
      timestamp: new Date().toISOString(),
    });
    return {
      success: true,
      provider: "mock",
      id: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      deliveredToProvider: false,
    };
  }

  const fetchFn = mockFetch || fetch;

  try {
    const payload = {
      from: fromEmail,
      to: [toEmail],
      reply_to: data.email,
      subject: `[GolfPulse Inquiry] ${data.topic} — ${data.name}`,
      text: `Inquiry from: ${data.name} (${data.email})\nTopic: ${data.topic}\n\nMessage:\n${data.message}\n\nSent via GolfPulse Section Portal`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1c3825; max-width: 600px;">
          <h2 style="color: #0e2138; border-bottom: 2px solid #dfbf77; padding-bottom: 8px;">GolfPulse Official Inquiry</h2>
          <p><strong>From:</strong> ${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</p>
          <p><strong>Topic / Department:</strong> ${escapeHtml(data.topic)}</p>
          <div style="background: #f8fafc; border-left: 4px solid #c29b4e; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
          </div>
          <p style="font-size: 11px; color: #778477;">This message was submitted through the GolfPulse Contact Section Office form.</p>
        </div>
      `,
    };

    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Contact Service] Resend API error:", res.status, errBody);
      return {
        success: false,
        provider: "resend",
        error: `Provider error: ${res.statusText}`,
        deliveredToProvider: false,
      };
    }

    const json = (await res.json()) as { id: string };
    return {
      success: true,
      provider: "resend",
      id: json.id,
      deliveredToProvider: true,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown transport error";
    console.error("[Contact Service] Failed to dispatch email:", errMsg);
    return {
      success: false,
      provider: "resend",
      error: errMsg,
      deliveredToProvider: false,
    };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
