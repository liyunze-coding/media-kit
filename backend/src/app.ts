import path from "node:path";
import type { Database } from "bun:sqlite";
import { Elysia, t } from "elysia";
import { isAuthorized } from "./auth.ts";
import { Cache } from "./cache.ts";
import type { AppConfig } from "./config.ts";
import {
  getAudienceAgeGenders,
  getAudienceGenders,
  getCollabs,
  getContent,
  getMonthlyViews,
  getPlatforms,
  getTwitchLocations,
  replaceAudienceAgeGenders,
  replaceAudienceGenders,
  replaceCollabs,
  replaceTwitchLocations,
  upsertContent,
  upsertMonthlyViews,
  upsertPlatforms,
  type AudienceAgeGenderInput,
  type AudienceGenderInput,
  type CollabInput,
  type MonthlyViewsInput,
  type TwitchLocationInput,
} from "./db.ts";
import { serveFileFromDir } from "./static.ts";
import { getTwitch, type FetchLike } from "./twitch.ts";

const MEDIA_KIT_CACHE_KEY = "media_kit";
const TTL_SECS = 300;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export interface AppDependencies {
  db: Database;
  config: AppConfig;
  cache?: Cache;
  fetchImpl?: FetchLike;
}

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

function validatePercent(percent: number): string | null {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return "Percentages must be between 0 and 100";
  }
  return null;
}

function validateTotal(total: number): string | null {
  if (total > 100 + 1e-6) {
    return "Percentages add up to more than 100";
  }
  return null;
}

async function readBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<{ tooLarge: true } | { tooLarge: false; bytes: Uint8Array }> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return { tooLarge: true };
    }
  }

  if (!request.body) {
    return { tooLarge: false, bytes: new Uint8Array(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return { tooLarge: true };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { tooLarge: false, bytes: merged };
}

export function createApp({ db, config, cache = new Cache(), fetchImpl }: AppDependencies) {
  const serveStatic = (request: Request): Response => {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return new Response("Not Found", { status: 404 });
    }
    const response = serveFileFromDir(config.staticDir, url.pathname, {
      appendIndexHtml: true,
      method: request.method,
    });
    return response ?? new Response("Not Found", { status: 404 });
  };

  const serveUpload = (request: Request, wildcard: string): Response => {
    const response = serveFileFromDir(config.uploadsDir, wildcard, {
      appendIndexHtml: false,
      method: request.method,
    });
    return response ?? new Response("Not Found", { status: 404 });
  };

  return new Elysia()
    .onRequest(({ request }) => {
      const { pathname } = new URL(request.url);
      if (pathname.startsWith("/api/admin/") && pathname !== "/api/admin/verify") {
        if (!isAuthorized(config, request.headers)) {
          return jsonError(401, "unauthorized");
        }
      }
    })
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION" || code === "PARSE") {
        set.status = 400;
        const message =
          error instanceof Error ? error.message : "Invalid request payload";
        return { error: message };
      }
      if (code === "NOT_FOUND") {
        set.status = 404;
        return "Not Found";
      }
      set.status = 500;
      const message = error instanceof Error ? error.message : String(error);
      return { error: message };
    })
    .get("/api/media-kit", async () => {
      const cached = cache.get<Record<string, unknown>>(MEDIA_KIT_CACHE_KEY);
      if (cached !== undefined) {
        return cached;
      }

      const content = getContent(db);
      const platforms = getPlatforms(db);
      const collabs = getCollabs(db);
      const twitchLocations = getTwitchLocations(db);
      const audienceGenders = getAudienceGenders(db);
      const audienceAgeGenders = getAudienceAgeGenders(db);
      const monthlyViews = getMonthlyViews(db);

      let twitch: Record<string, unknown>;
      try {
        twitch = await getTwitch({ cache, config, fetchImpl });
      } catch (err) {
        twitch = {
          configured: true,
          found: false,
          login: config.twitchLogin,
          message: err instanceof Error ? err.message : String(err),
        };
      }

      const payload = {
        content,
        platforms,
        monthly_views: monthlyViews,
        collabs,
        twitch,
        twitch_locations: twitchLocations,
        audience_genders: audienceGenders,
        audience_age_genders: audienceAgeGenders,
      };

      cache.set(MEDIA_KIT_CACHE_KEY, payload, TTL_SECS);
      return payload;
    })
    .get("/api/admin/verify", ({ request }) => {
      return new Response(null, {
        status: isAuthorized(config, request.headers) ? 200 : 401,
      });
    })
    .get("/api/admin/state", () => {
      return {
        content: getContent(db),
        platforms: getPlatforms(db),
        monthly_views: getMonthlyViews(db),
        collabs: getCollabs(db),
        twitch_locations: getTwitchLocations(db),
        audience_genders: getAudienceGenders(db),
        audience_age_genders: getAudienceAgeGenders(db),
      };
    })
    .put(
      "/api/admin/content",
      ({ body }) => {
        upsertContent(db, Object.entries(body));
        cache.invalidate(MEDIA_KIT_CACHE_KEY);
        return { content: getContent(db) };
      },
      {
        body: t.Record(t.String(), t.String()),
      },
    )
    .put(
      "/api/admin/platforms",
      ({ body }) => {
        upsertPlatforms(db, body);
        cache.invalidate(MEDIA_KIT_CACHE_KEY);
        return { platforms: getPlatforms(db) };
      },
      {
        body: t.Array(
          t.Object({
            name: t.String(),
            handle: t.String(),
            url: t.String(),
            followers: t.Number(),
          }),
        ),
      },
    )
    .put(
      "/api/admin/monthly-views",
      ({ body }) => {
        const cleaned: MonthlyViewsInput[] = [];
        for (const entry of body) {
          const platform = entry.platform.trim().toLowerCase();
          if (!platform) {
            return jsonError(400, "Each view entry needs a platform");
          }
          if (!Number.isInteger(entry.views) || entry.views < 0) {
            return jsonError(400, "View counts must be 0 or greater");
          }
          cleaned.push({ platform, views: entry.views });
        }

        upsertMonthlyViews(db, cleaned);
        cache.invalidate(MEDIA_KIT_CACHE_KEY);
        return { monthly_views: getMonthlyViews(db) };
      },
      {
        body: t.Array(
          t.Object({
            platform: t.String(),
            views: t.Number(),
          }),
        ),
      },
    )
    .put(
      "/api/admin/collabs",
      ({ body }) => {
        const cleaned: CollabInput[] = [];
        for (const collab of body) {
          const name = collab.name.trim();
          const image = collab.image.trim();
          const url = collab.url.trim();

          if (!name && !image && !url) {
            continue;
          }
          if (!name) {
            return jsonError(400, "Each collaboration needs a name");
          }
          cleaned.push({ name, image, url });
        }

        replaceCollabs(db, cleaned);
        cache.invalidate(MEDIA_KIT_CACHE_KEY);
        return { collabs: getCollabs(db) };
      },
      {
        body: t.Array(
          t.Object({
            name: t.String(),
            image: t.String(),
            url: t.String(),
          }),
        ),
      },
    )
    .put(
      "/api/admin/twitch-locations",
      ({ body }) => {
        const cleaned: TwitchLocationInput[] = [];
        let total = 0;

        for (const location of body) {
          const country = location.country.trim();
          if (!country && location.percent === 0) {
            continue;
          }
          if (!country) {
            return jsonError(400, "Each location needs a country");
          }
          const percentErr = validatePercent(location.percent);
          if (percentErr) {
            return jsonError(400, percentErr);
          }

          total += location.percent;
          cleaned.push({ country, percent: location.percent });
        }

        const totalErr = validateTotal(total);
        if (totalErr) {
          return jsonError(400, totalErr);
        }

        replaceTwitchLocations(db, cleaned);
        cache.invalidate(MEDIA_KIT_CACHE_KEY);
        return { twitch_locations: getTwitchLocations(db) };
      },
      {
        body: t.Array(
          t.Object({
            country: t.String(),
            percent: t.Number(),
          }),
        ),
      },
    )
    .put(
      "/api/admin/audience/genders",
      ({ body }) => {
        const cleaned: AudienceGenderInput[] = [];
        let total = 0;

        for (const entry of body) {
          const gender = entry.gender.trim();
          const trimmedColor = typeof entry.color === "string" ? entry.color.trim() : "";
          const color = trimmedColor.length > 0 ? trimmedColor : null;

          if (!gender && entry.percent === 0) {
            continue;
          }
          if (!gender) {
            return jsonError(400, "Each gender row needs a name");
          }
          const percentErr = validatePercent(entry.percent);
          if (percentErr) {
            return jsonError(400, percentErr);
          }

          total += entry.percent;
          cleaned.push({ gender, percent: entry.percent, color });
        }

        const totalErr = validateTotal(total);
        if (totalErr) {
          return jsonError(400, totalErr);
        }

        replaceAudienceGenders(db, cleaned);
        cache.invalidate(MEDIA_KIT_CACHE_KEY);
        return { audience_genders: getAudienceGenders(db) };
      },
      {
        body: t.Array(
          t.Object({
            gender: t.String(),
            percent: t.Number(),
            color: t.Optional(t.Nullable(t.String())),
          }),
        ),
      },
    )
    .put(
      "/api/admin/audience/age-genders",
      ({ body }) => {
        const cleaned: AudienceAgeGenderInput[] = [];
        let total = 0;

        for (const row of body) {
          const ageRange = row.age_range.trim();
          const gender = row.gender.trim();

          if (!ageRange && !gender && row.percent === 0) {
            continue;
          }
          if (!ageRange || !gender) {
            return jsonError(400, "Each age row needs an age range and gender");
          }
          const percentErr = validatePercent(row.percent);
          if (percentErr) {
            return jsonError(400, percentErr);
          }

          total += row.percent;
          cleaned.push({ age_range: ageRange, gender, percent: row.percent });
        }

        const totalErr = validateTotal(total);
        if (totalErr) {
          return jsonError(400, totalErr);
        }

        replaceAudienceAgeGenders(db, cleaned);
        cache.invalidate(MEDIA_KIT_CACHE_KEY);
        return { audience_age_genders: getAudienceAgeGenders(db) };
      },
      {
        body: t.Array(
          t.Object({
            age_range: t.String(),
            gender: t.String(),
            percent: t.Number(),
          }),
        ),
      },
    )
    .post(
      "/api/admin/upload",
      async ({ request }) => {
        const contentType = (request.headers.get("content-type") ?? "")
          .split(";")[0]
          ?.trim()
          .toLowerCase();

        const result = await readBodyWithLimit(request, MAX_UPLOAD_BYTES);
        if (result.tooLarge) {
          return jsonError(413, "Image must be 5 MB or smaller");
        }

        const extension = contentType ? IMAGE_EXTENSIONS[contentType] : undefined;
        if (!extension) {
          return jsonError(400, "Image must be PNG, JPEG, WebP, GIF, or AVIF");
        }

        if (result.bytes.byteLength === 0) {
          return jsonError(400, "Image is empty");
        }

        const stamp = BigInt(Date.now()) * 1_000_000n + (process.hrtime.bigint() % 1_000_000n);
        const filename = `${stamp}.${extension}`;
        await Bun.write(path.join(config.uploadsDir, filename), result.bytes);

        return { url: `/uploads/${filename}` };
      },
      { parse: "none" },
    )
    .get("/uploads/*", ({ request, params }) => serveUpload(request, params["*"]))
    .head("/uploads/*", ({ request, params }) => serveUpload(request, params["*"]))
    .get("/", ({ request }) => serveStatic(request))
    .head("/", ({ request }) => serveStatic(request))
    .get("/*", ({ request }) => serveStatic(request))
    .head("/*", ({ request }) => serveStatic(request));
}
