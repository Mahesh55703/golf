import crypto from "crypto";

/**
 * Standard ISO 4217 currency decimals.
 * Currencies with 0 decimals (e.g. JPY, KRW, VND).
 * Currencies with 3 decimals (e.g. KWD, BHD, OMR).
 * Most standard currencies use 2 decimals (USD, INR, EUR, GBP, AUD, CAD, SGD, etc.).
 */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
]);

export const THREE_DECIMAL_CURRENCIES = new Set([
  "BHD", "IQD", "JOD", "KWD", "OMR", "TND"
]);

/**
 * Supported international tournament currencies in GolfPulse.
 */
export const SUPPORTED_PAYMENT_CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"
] as const;

export type SupportedCurrency = (typeof SUPPORTED_PAYMENT_CURRENCIES)[number];

/**
 * Convert standard decimal monetary amount to provider minor units (paise, cents).
 * Never uses floating-point multiplication to prevent precision loss.
 */
export function toMinorUnits(amount: number | string, currency: string): number {
  const curr = currency.toUpperCase().trim();
  const amountStr = typeof amount === "number" ? amount.toFixed(4) : amount.trim();
  const [wholeStr, fracStr = ""] = amountStr.split(".");
  const whole = parseInt(wholeStr || "0", 10);

  if (ZERO_DECIMAL_CURRENCIES.has(curr)) {
    return whole;
  }

  if (THREE_DECIMAL_CURRENCIES.has(curr)) {
    const decimals = (fracStr + "000").slice(0, 3);
    return whole * 1000 + parseInt(decimals, 10);
  }

  // Standard 2 decimal places
  const decimals = (fracStr + "00").slice(0, 2);
  return whole * 100 + parseInt(decimals, 10);
}

/**
 * Convert provider minor units back to standard decimal amount.
 */
export function fromMinorUnits(minor: number, currency: string): number {
  const curr = currency.toUpperCase().trim();
  if (ZERO_DECIMAL_CURRENCIES.has(curr)) {
    return minor;
  }
  if (THREE_DECIMAL_CURRENCIES.has(curr)) {
    return Number((minor / 1000).toFixed(3));
  }
  return Number((minor / 100).toFixed(2));
}

export interface CreateOrderParams {
  registrationId: string;
  registrationReference: string;
  amount: number; // Major unit (e.g. 50.00)
  currency: string; // ISO 3-letter (e.g. "USD", "INR")
  golferEmail: string;
  golferName: string;
  tournamentName: string;
}

export interface OrderResult {
  provider: "RAZORPAY" | "MANUAL";
  orderId: string;
  amountMinor: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RefundParams {
  paymentId: string;
  amountMinor?: number; // integer minor units
  notes?: Record<string, string>;
  receipt?: string;
  speed?: "normal" | "optimum";
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  status: "processed" | "pending" | "failed";
  speedProcessed?: string;
  speedRequested?: string;
  receipt?: string;
  createdAt: number;
  raw?: any;
}

export interface PaymentGateway {
  name: string;
  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  verifyPaymentSignature(params: VerifyPaymentParams): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  createRefund(params: RefundParams): Promise<RefundResult>;
}

/**
 * Timing-safe HMAC-SHA256 signature verification.
 */
export function verifyHmacSha256(data: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
    if (signature.length !== expected.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
