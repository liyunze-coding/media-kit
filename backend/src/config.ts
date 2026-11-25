import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface AppConfig {
  databasePath: string;
  uploadsDir: string;
  staticDir: string;
  twitchClientId: string;
  twitchClientSecret: string;
  twitchLogin: string;
  adminUser: string;
  adminPassword: string;
  port: number;
}

function parseEnvLine(rawLine: string): [string, string] | null {
  let line = rawLine.trim();
  if (!line || line.startsWith("#")) return null;
  if (line.startsWith("export ")) {
    line = line.slice(7).trim();
  }

  const eqIdx = line.indexOf("=");
  if (eqIdx <= 0) return null;

  const key = line.slice(0, eqIdx).trim();
  if (!key) return null;

  let value = line.slice(eqIdx + 1).trim();

  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    // Single-quoted values are taken literally without variable expansion
    return [key, value.slice(1, -1)];
  }

  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    const inner = value
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    return [key, inner];
  }

  // Strip inline comments on unquoted values (preceded by whitespace)
  const commentMatch = value.match(/\s+#/);
  if (commentMatch && commentMatch.index !== undefined) {
    value = value.slice(0, commentMatch.index).trim();
  }

  return [key, value];
}

/**
 * Load `.env` from the current directory, then walk up parent directories
 * until one is found. Existing environment variables are never overwritten.
 */
export function loadEnvFile(startDir: string = process.cwd()): void {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, ".env");
    if (existsSync(candidate)) {
      try {
        const contents = readFileSync(candidate, "utf8");
        for (const line of contents.split(/\r?\n/)) {
          const parsed = parseEnvLine(line);
          if (!parsed) continue;
          const [key, value] = parsed;
          if (process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
      } catch {
        // Ignore unreadable .env files, matching dotenvy::from_path().ok()
      }
      return;
    }

    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

function envOr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export function loadConfig(): AppConfig {
  const databasePath = envOr("DATABASE_PATH", "data/media_kit.db");
  const uploadsDir =
    process.env.UPLOADS_DIR !== undefined
      ? process.env.UPLOADS_DIR
      : path.join(path.dirname(databasePath), "uploads");

  const parsedPort = Number.parseInt(envOr("PORT", "3000"), 10);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

  return {
    databasePath,
    uploadsDir,
    staticDir: envOr("STATIC_DIR", "frontend/dist"),
    twitchClientId: envOr("TWITCH_CLIENT_ID", ""),
    twitchClientSecret: envOr("TWITCH_CLIENT_SECRET", ""),
    twitchLogin: envOr("TWITCH_LOGIN", "rythondev"),
    adminUser: envOr("ADMIN_USER", "admin"),
    adminPassword: envOr("ADMIN_PASSWORD", "change-me"),
    port,
  };
}
