import Razorpay from "razorpay";
import {
  PaymentGateway,
  CreateOrderParams,
  OrderResult,
  VerifyPaymentParams,
  RefundParams,
  RefundResult,
  toMinorUnits,
  verifyHmacSha256,
} from "./types";

export class RazorpayGateway implements PaymentGateway {
  public readonly name = "RAZORPAY";
  private client: Razorpay | null = null;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || "";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    if (this.keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  public getKeyId(): string {
    return this.keyId;
  }

  public async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    if (!this.client || !this.keyId || !this.keySecret) {
      throw new Error("GATEWAY_NOT_CONFIGURED: Razorpay credentials are missing on the server.");
    }

    const amountMinor = toMinorUnits(params.amount, params.currency);
    const receipt = `RCPT-${params.registrationReference.replace(/[^A-Za-z0-9_-]/g, "")}`.slice(0, 40);

    try {
      const order = await this.client.orders.create({
        amount: amountMinor,
        currency: params.currency.toUpperCase(),
        receipt,
        notes: {
          registrationId: params.registrationId,
          referenceNumber: params.registrationReference,
          tournamentName: params.tournamentName.slice(0, 50),
          golferName: params.golferName.slice(0, 50),
          golferEmail: params.golferEmail.slice(0, 50),
        },
      });

      return {
        provider: "RAZORPAY",
        orderId: order.id,
        amountMinor,
        currency: params.currency.toUpperCase(),
        keyId: this.keyId,
      };
    } catch (err: any) {
      console.error("Razorpay order creation error:", err);
      const msg = err?.error?.description || err?.message || "Failed to create payment order with gateway.";
      throw new Error(`GATEWAY_ORDER_ERROR: ${msg}`);
    }
  }

  public verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    if (!this.keySecret) return false;
    const body = `${params.orderId}|${params.paymentId}`;
    return verifyHmacSha256(body, params.signature, this.keySecret);
  }

  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    return verifyHmacSha256(rawBody, signature, this.webhookSecret);
  }

  public async createRefund(params: RefundParams): Promise<RefundResult> {
    if (!this.client) {
      throw new Error("GATEWAY_NOT_CONFIGURED: Razorpay credentials are missing on the server.");
    }
    const payload: Record<string, any> = {};
    if (typeof params.amountMinor === "number" && params.amountMinor > 0) {
      payload.amount = params.amountMinor;
    }
    if (params.notes) {
      payload.notes = params.notes;
    }
    if (params.receipt) {
      payload.receipt = params.receipt;
    }
    if (params.speed) {
      payload.speed = params.speed;
    }

    try {
      const res = await (this.client.payments as any).refund(params.paymentId, payload);
      return {
        refundId: res.id,
        paymentId: res.payment_id,
        amountMinor: res.amount,
        currency: res.currency,
        status: res.status === "processed" ? "processed" : "pending",
        speedProcessed: res.speed_processed,
        speedRequested: res.speed_requested,
        receipt: res.receipt,
        createdAt: res.created_at,
        raw: res,
      };
    } catch (err: any) {
      console.error("Razorpay refund creation error:", err);
      const msg = err?.error?.description || err?.message || "Failed to initiate refund with gateway.";
      throw new Error(`GATEWAY_REFUND_ERROR: ${msg}`);
    }
  }
}

export const razorpayGateway = new RazorpayGateway();
