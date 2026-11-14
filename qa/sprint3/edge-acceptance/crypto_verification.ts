// WebPush Crypto Verification (RFC 8291 aes128gcm)
// Pinned libraries: web-push@3.6.7, http_ece@1.2.0
// Isolated local cryptographic test: synthetic ECDH key exchange, VAPID signing, payload encryption & decryption.
// NOTE: This verifies local cryptographic conformance only; external push gateways and physical device delivery are explicitly out of scope.

import webpush from "npm:web-push@3.6.7";
import httpEce from "npm:http_ece@1.2.0";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

async function runCryptoVerification() {
  const t0 = performance.now();

  // 1. Generate local synthetic VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();
  const vapidSubject = "mailto:edge-test@adelmostafa.com";
  webpush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);

  // 2. Generate local synthetic client subscription keys (P-256 ECDH + 16-byte auth secret)
  const clientEcdh = crypto.createECDH("prime256v1");
  clientEcdh.generateKeys();
  const clientPublicKey = clientEcdh.getPublicKey();
  const clientAuthSecret = crypto.randomBytes(16);

  const subscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/synthetic-device-test-token",
    keys: {
      p256dh: clientPublicKey.toString("base64url"),
      auth: clientAuthSecret.toString("base64url"),
    },
  };

  // 3. Encrypt payload
  const rawPayload = JSON.stringify({
    title: "Edge Acceptance WebPush",
    body: "Cryptographic validation payload for Sprint 3",
    url: "/student/courses/101",
    tag: "acceptance-test",
  });

  const requestDetails = webpush.generateRequestDetails(subscription, rawPayload, {
    TTL: 120,
    vapidDetails: {
      subject: vapidSubject,
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
    },
  });

  const encryptedBody = requestDetails.body as Buffer;
  const contentEncoding = requestDetails.headers["Content-Encoding"];
  const authorizationHeader = requestDetails.headers["Authorization"] || "";

  // 4. Decrypt payload using recipient private key & auth secret
  const decryptedBuffer = httpEce.decrypt(encryptedBody, {
    version: "aes128gcm",
    authSecret: clientAuthSecret,
    dh: clientPublicKey,
    privateKey: clientEcdh,
  });

  const decryptedText = decryptedBuffer.toString("utf8");
  const payloadMatches = decryptedText === rawPayload;

  // 5. Verify fail-closed behavior with invalid auth secret
  let invalidSecretFailedClosed = false;
  try {
    const wrongAuthSecret = crypto.randomBytes(16);
    httpEce.decrypt(encryptedBody, {
      version: "aes128gcm",
      authSecret: wrongAuthSecret,
      dh: clientPublicKey,
      privateKey: clientEcdh,
    });
  } catch (_expectedError) {
    invalidSecretFailedClosed = true;
  }

  const durationMs = Math.round((performance.now() - t0) * 100) / 100;

  const result = {
    test: "webpush_rfc8291_aes128gcm_crypto",
    status: payloadMatches && invalidSecretFailedClosed ? "PASSED" : "FAILED",
    duration_ms: durationMs,
    vapid_public_key_length: vapidKeys.publicKey.length,
    vapid_subject: vapidSubject,
    subscription_endpoint: subscription.endpoint,
    content_encoding: contentEncoding,
    has_encrypted_body: Buffer.isBuffer(encryptedBody) && encryptedBody.length > 0,
    encrypted_body_bytes: encryptedBody.length,
    has_vapid_authorization: authorizationHeader.startsWith("vapid ") || authorizationHeader.startsWith("WebPush "),
    payload_matches_plaintext: payloadMatches,
    tampered_secret_fail_closed: invalidSecretFailedClosed,
    crypto_engine: "Deno 2.0.0 + npm:web-push@3.6.7 + npm:http_ece@1.2.0",
    external_boundary: "Synthetic local recipient; no remote FCM/Apple/Mozilla push service contacted",
  };

  console.log(JSON.stringify(result, null, 2));
}

runCryptoVerification().catch((err) => {
  console.error("Crypto verification error:", err);
  Deno.exit(1);
});
