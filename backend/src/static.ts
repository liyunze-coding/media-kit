import { statSync } from "node:fs";
import path from "node:path";

export function resolveSafePath(baseDir: string, rawRequestPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawRequestPath);
  } catch {
    return null;
  }

  if (decoded.includes("\0") || decoded.includes("\\")) {
    return null;
  }

  const segments = decoded.split("/").filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, ...segments);

  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(resolvedBase + path.sep)
  ) {
    return null;
  }

  return resolvedTarget;
}

export function serveFileFromDir(
  baseDir: string,
  rawRequestPath: string,
  options: { appendIndexHtml?: boolean; method?: string } = {},
): Response | null {
  const resolved = resolveSafePath(baseDir, rawRequestPath);
  if (!resolved) {
    return null;
  }

  let target = resolved;
  try {
    const stats = statSync(target);
    if (stats.isDirectory()) {
      if (!options.appendIndexHtml) {
        return null;
      }
      target = path.join(target, "index.html");
      const indexStats = statSync(target);
      if (!indexStats.isFile()) {
        return null;
      }
    } else if (!stats.isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  const file = Bun.file(target);
  if (options.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": file.type,
        "Content-Length": String(file.size),
      },
    });
  }

  return new Response(file);
}
