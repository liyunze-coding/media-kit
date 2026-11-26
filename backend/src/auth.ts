import { createHash, timingSafeEqual } from "node:crypto";
import type { AppConfig } from "./config.ts";

function constantTimeEquals(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

export function isAuthorized(
  config: Pick<AppConfig, "adminUser" | "adminPassword">,
  headers: Headers,
): boolean {
  const value = headers.get("authorization");
  if (!value || !value.startsWith("Basic ")) {
    return false;
  }

  const encoded = value.slice("Basic ".length);
  if (encoded.length % 4 !== 0 || !BASE64_RE.test(encoded)) {
    return false;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return false;
  }

  const colonIndex = decoded.indexOf(":");
  const user = colonIndex === -1 ? decoded : decoded.slice(0, colonIndex);
  const pass = colonIndex === -1 ? "" : decoded.slice(colonIndex + 1);

  const userOk = constantTimeEquals(user, config.adminUser);
  const passOk = constantTimeEquals(pass, config.adminPassword);
  return userOk && passOk;
}
