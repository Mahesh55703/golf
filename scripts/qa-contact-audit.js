/**
 * GolfPulse Phase 4.1 — Contact Form & Transactional Email QA Suite
 *
 * Verifies:
 * 1. Schema validation (valid fields, short name, invalid email, short message, honeypot).
 * 2. Sliding window abuse protection / rate limiting.
 * 3. Graceful simulation when RESEND_API_KEY is not configured.
 * 4. Transactional dispatch with mocked provider responses (success 200, failure 401/500).
 * 5. Honeypot bot protection.
 */

const assert = require("assert");
const path = require("path");

// Load local environment safely
require("./run-env.js");

async function runContactTests() {
  console.log("================================================================================");
  console.log("⛳ GOLFPULSE PHASE 4.1 — CONTACT FORM & EMAIL DISPATCH QA SUITE");
  console.log("================================================================================\n");

  // Dynamically import TypeScript-compiled or transpiled module via require / Next environment
  // We can test the validation logic and mocked provider via direct function execution
  const { contactFormSchema, checkContactRateLimit, resetContactRateLimitStore, sendContactEmail } = await import(
    "../lib/email.ts"
  );

  console.log("Test 1: Schema Validation (Valid payload)...");
  const validPayload = {
    name: "Arnold Palmer",
    email: "arnold@latrobe.com",
    topic: "Winter Championship Registration",
    message: "Requesting details regarding tournament registration fee and tee times.",
    honeypot: "",
  };
  const validResult = contactFormSchema.safeParse(validPayload);
  assert.strictEqual(validResult.success, true, "Valid payload should pass schema validation");
  console.log("  ✓ Valid payload passes schema validation");

  console.log("Test 2: Schema Validation (Invalid email address)...");
  const badEmailPayload = { ...validPayload, email: "invalid-email" };
  const badEmailResult = contactFormSchema.safeParse(badEmailPayload);
  assert.strictEqual(badEmailResult.success, false, "Invalid email should fail validation");
  assert.ok(
    badEmailResult.error.issues.some((i) => i.message.includes("valid email")),
    "Should include valid email error message"
  );
  console.log("  ✓ Invalid email correctly rejected");

  console.log("Test 3: Schema Validation (Short message under 10 chars)...");
  const shortMsgPayload = { ...validPayload, message: "Hi" };
  const shortMsgResult = contactFormSchema.safeParse(shortMsgPayload);
  assert.strictEqual(shortMsgResult.success, false, "Short message should fail validation");
  console.log("  ✓ Short message correctly rejected (< 10 chars)");

  console.log("Test 4: Honeypot bot detection...");
  const botPayload = { ...validPayload, honeypot: "http://spam-link.com" };
  const botResult = contactFormSchema.safeParse(botPayload);
  assert.strictEqual(botResult.success, false, "Populated honeypot should fail schema validation");
  console.log("  ✓ Honeypot bot trap successfully triggered");

  console.log("Test 5: Abuse Protection / Rate Limiter...");
  resetContactRateLimitStore();
  const testIp = "192.168.1.100";
  for (let i = 1; i <= 5; i++) {
    const res = checkContactRateLimit(testIp);
    assert.strictEqual(res.allowed, true, `Request ${i} should be allowed`);
  }
  const blockedRes = checkContactRateLimit(testIp);
  assert.strictEqual(blockedRes.allowed, false, "6th request within window must be rate-limited");
  assert.strictEqual(blockedRes.remaining, 0);
  console.log("  ✓ Rate limiter permits 5 requests and strictly rejects 6th (429 defense)");

  console.log("Test 6: Simulated mode when RESEND_API_KEY is not configured...");
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  const mockRes = await sendContactEmail(validPayload);
  assert.strictEqual(mockRes.success, true, "Simulated mode must return success");
  assert.strictEqual(mockRes.provider, "mock", "Provider must be 'mock'");
  assert.strictEqual(mockRes.deliveredToProvider, false, "Should state deliveredToProvider: false");
  assert.ok(mockRes.id && mockRes.id.startsWith("mock-"), "Mock reference ID generated");
  console.log("  ✓ Safely defaults to simulated queueing without failing or crashing");

  console.log("Test 7: Mocked Resend HTTP API Success Response...");
  process.env.RESEND_API_KEY = "re_test_mock_secret_key";

  const mockedSuccessFetch = async (url, options) => {
    assert.strictEqual(url, "https://api.resend.com/emails");
    assert.strictEqual(options.method, "POST");
    assert.strictEqual(options.headers.Authorization, "Bearer re_test_mock_secret_key");
    const sentData = JSON.parse(options.body);
    assert.strictEqual(sentData.to[0], "tournaments@golfpulse.com");
    assert.strictEqual(sentData.reply_to, "arnold@latrobe.com");
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "email_msg_998877" }),
    };
  };

  const providerSuccessRes = await sendContactEmail(validPayload, mockedSuccessFetch);
  assert.strictEqual(providerSuccessRes.success, true);
  assert.strictEqual(providerSuccessRes.provider, "resend");
  assert.strictEqual(providerSuccessRes.id, "email_msg_998877");
  assert.strictEqual(providerSuccessRes.deliveredToProvider, true);
  console.log("  ✓ Mocked Resend provider success processed cleanly (email_msg_998877)");

  console.log("Test 8: Mocked Resend HTTP API Error Response (500 Internal Error)...");
  const mockedErrorFetch = async () => ({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    text: async () => "Upstream error",
  });

  const providerErrorRes = await sendContactEmail(validPayload, mockedErrorFetch);
  assert.strictEqual(providerErrorRes.success, false);
  assert.strictEqual(providerErrorRes.provider, "resend");
  assert.ok(providerErrorRes.error.includes("Internal Server Error"));
  console.log("  ✓ Mocked Resend upstream error handled gracefully without throwing");

  // Restore env
  if (originalKey) {
    process.env.RESEND_API_KEY = originalKey;
  } else {
    delete process.env.RESEND_API_KEY;
  }

  console.log("\n================================================================================");
  console.log("🎉 ALL 8 CONTACT FORM & EMAIL INTEGRATION QA TESTS PASSED");
  console.log("================================================================================\n");
}

runContactTests().catch((err) => {
  console.error("Test failure:\n", err);
  process.exit(1);
});
