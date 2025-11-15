import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce for GCM

const KEY = process.env.BLUESKY_ENCRYPTION_KEY;
if (!KEY) {
  throw new Error("BLUESKY_ENCRYPTION_KEY is not set");
}

// Normalize key to 32 bytes (for aes-256)
const keyBuffer = Buffer.from(KEY, "base64"); // if you used base64
if (keyBuffer.length !== 32) {
  throw new Error("BLUESKY_ENCRYPTION_KEY must be 32 bytes (base64)");
}

export function encryptBlueskySecret(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // store as base64(iv).base64(ciphertext).base64(tag)
  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64"),
  ].join(".");
}

export function decryptBlueskySecret(payload: string): string {
  const [ivB64, encB64, tagB64] = payload.split(".");
  if (!ivB64 || !encB64 || !tagB64) {
    throw new Error("Invalid encrypted Bluesky secret format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}