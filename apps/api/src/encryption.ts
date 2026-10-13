import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export function encryptSecret(secret: Uint8Array, key: string): string {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}
export function decryptSecret(value: string, key: string): Buffer {
  const [version, iv, tag, data] = value.split(":");
  if (version !== "v1" || !iv || !tag || !data)
    throw new Error("Invalid encrypted wallet");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]);
}
