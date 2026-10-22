-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CREATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_ORDER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_VERIFIED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_REFUNDED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_MANUAL_RECONCILE';
ALTER TYPE "AuditAction" ADD VALUE 'REGISTRATION_CANCELLED';

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "providerSignature" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountMinor" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReference" TEXT,
    "refundAmount" DECIMAL(10,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_referenceNumber_key" ON "Payment"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_registrationId_idx" ON "Payment"("registrationId");

-- CreateIndex
CREATE INDEX "Payment_providerOrderId_idx" ON "Payment"("providerOrderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_eventType_idx" ON "PaymentWebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_processed_idx" ON "PaymentWebhookEvent"("processed");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_createdAt_idx" ON "PaymentWebhookEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
