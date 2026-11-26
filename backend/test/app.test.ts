import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp, MAX_UPLOAD_BYTES } from "../src/app.ts";
import type { AppConfig } from "../src/config.ts";
import { openDatabase } from "../src/db.ts";
import type { FetchLike } from "../src/twitch.ts";

function basicAuth(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

describe("media-kit Elysia backend", () => {
  let tempDir: string;
  let db: Database;
  let config: AppConfig;
  let authHeader: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "media-kit-test-"));
    const dbPath = path.join(tempDir, "media_kit.db");
    const uploadsDir = path.join(tempDir, "uploads");
    const staticDir = path.join(tempDir, "static");
    mkdirSync(uploadsDir, { recursive: true });
    mkdirSync(staticDir, { recursive: true });
    writeFileSync(path.join(staticDir, "index.html"), "<!doctype html><html><body>ok</body></html>");
    writeFileSync(path.join(staticDir, "hello.txt"), "hello world");

    config = {
      databasePath: dbPath,
      uploadsDir,
      staticDir,
      twitchClientId: "",
      twitchClientSecret: "",
      twitchLogin: "rythondev",
      adminUser: "admin",
      adminPassword: "p@$$w0rd:with:colons!",
      port: 3000,
    };
    authHeader = basicAuth(config.adminUser, config.adminPassword);
    db = openDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("seeds default data and serves GET /api/media-kit", async () => {
    const app = createApp({ db, config });
    const res = await app.handle(new Request("http://localhost/api/media-kit"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect((body.content as Record<string, string>).brand_name).toBe("RythonDev");
    expect((body.content as Record<string, string>).email).toBe("hello@rython.dev");
    expect((body.platforms as Array<{ name: string }>).map((p) => p.name)).toEqual([
      "youtube",
      "tiktok",
      "instagram",
    ]);
    expect((body.monthly_views as Array<{ platform: string }>).map((m) => m.platform)).toEqual([
      "twitch",
      "instagram",
      "tiktok",
      "youtube",
    ]);
    expect((body.collabs as Array<{ name: string }>).map((c) => c.name)).toEqual([
      "ProtonPass",
      "ProtonVPN",
      "Brick",
      "Focumon",
    ]);
    expect(body.twitch).toEqual({
      configured: false,
      login: "rythondev",
      message: "Twitch credentials are not configured",
    });
    expect(body.twitch_locations).toEqual([]);
    expect(body.audience_genders).toEqual([]);
    expect(body.audience_age_genders).toEqual([]);
  });

  test("auth verify and unauthorized rejection on admin routes", async () => {
    const app = createApp({ db, config });

    const verifyNoAuth = await app.handle(new Request("http://localhost/api/admin/verify"));
    expect(verifyNoAuth.status).toBe(401);

    const verifyBad = await app.handle(
      new Request("http://localhost/api/admin/verify", {
        headers: { Authorization: basicAuth("admin", "wrong") },
      }),
    );
    expect(verifyBad.status).toBe(401);

    const verifyOk = await app.handle(
      new Request("http://localhost/api/admin/verify", {
        headers: { Authorization: authHeader },
      }),
    );
    expect(verifyOk.status).toBe(200);

    // Must return 401 even when body is invalid/missing
    const stateNoAuth = await app.handle(new Request("http://localhost/api/admin/state"));
    expect(stateNoAuth.status).toBe(401);
    expect(await stateNoAuth.json()).toEqual({ error: "unauthorized" });

    const putNoAuth = await app.handle(
      new Request("http://localhost/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "not-valid-json",
      }),
    );
    expect(putNoAuth.status).toBe(401);
  });

  test("admin CRUD endpoints update SQLite and invalidate media-kit cache", async () => {
    const app = createApp({ db, config });

    // Prime cache
    const initialRes = await app.handle(new Request("http://localhost/api/media-kit"));
    expect(((await initialRes.json()) as { content: Record<string, string> }).content.tagline).toBe(
      "Game developer & live streamer",
    );

    // Update content
    const contentRes = await app.handle(
      new Request("http://localhost/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ tagline: "Updated tagline", custom_note: "Hello" }),
      }),
    );
    expect(contentRes.status).toBe(200);
    const contentData = (await contentRes.json()) as { content: Record<string, string> };
    expect(contentData.content.tagline).toBe("Updated tagline");
    expect(contentData.content.custom_note).toBe("Hello");

    // Verify cache invalidated
    const refreshedRes = await app.handle(new Request("http://localhost/api/media-kit"));
    expect(
      ((await refreshedRes.json()) as { content: Record<string, string> }).content.tagline,
    ).toBe("Updated tagline");

    // Update platforms (reordered)
    const platformsRes = await app.handle(
      new Request("http://localhost/api/admin/platforms", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([
          { name: "instagram", handle: "@rython", url: "https://ig.test", followers: 1234 },
          { name: "youtube", handle: "@rython", url: "https://yt.test", followers: 5678 },
          { name: "tiktok", handle: "@rython", url: "https://tt.test", followers: 91011 },
        ]),
      }),
    );
    expect(platformsRes.status).toBe(200);
    const platformsData = (await platformsRes.json()) as {
      platforms: Array<{ name: string; followers: number }>;
    };
    expect(platformsData.platforms.map((p) => p.name)).toEqual(["instagram", "youtube", "tiktok"]);
    expect(platformsData.platforms[0]?.followers).toBe(1234);

    // Monthly views validation + update
    const badViews = await app.handle(
      new Request("http://localhost/api/admin/monthly-views", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([{ platform: "twitch", views: -5 }]),
      }),
    );
    expect(badViews.status).toBe(400);
    expect(await badViews.json()).toEqual({ error: "View counts must be 0 or greater" });

    const goodViews = await app.handle(
      new Request("http://localhost/api/admin/monthly-views", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([
          { platform: " YouTube ", views: 42000 },
          { platform: "twitch", views: 10000 },
        ]),
      }),
    );
    expect(goodViews.status).toBe(200);
    const viewsData = (await goodViews.json()) as {
      monthly_views: Array<{ platform: string; views: number }>;
    };
    expect(viewsData.monthly_views.find((v) => v.platform === "youtube")?.views).toBe(42000);

    // Collabs validation + update (blank row skipped)
    const badCollab = await app.handle(
      new Request("http://localhost/api/admin/collabs", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([{ name: "  ", image: "/img.png", url: "" }]),
      }),
    );
    expect(badCollab.status).toBe(400);
    expect(await badCollab.json()).toEqual({ error: "Each collaboration needs a name" });

    const goodCollab = await app.handle(
      new Request("http://localhost/api/admin/collabs", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([
          { name: "  ", image: "", url: "" },
          { name: " Acme ", image: " /acme.png ", url: " https://acme.test " },
        ]),
      }),
    );
    expect(goodCollab.status).toBe(200);
    const collabData = (await goodCollab.json()) as {
      collabs: Array<{ id: number; name: string; image: string; url: string }>;
    };
    expect(collabData.collabs).toHaveLength(1);
    expect(collabData.collabs[0]?.name).toBe("Acme");

    // Twitch locations validation + update
    const overLoc = await app.handle(
      new Request("http://localhost/api/admin/twitch-locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([
          { country: "US", percent: 60 },
          { country: "CA", percent: 50 },
        ]),
      }),
    );
    expect(overLoc.status).toBe(400);
    expect(await overLoc.json()).toEqual({ error: "Percentages add up to more than 100" });

    const goodLoc = await app.handle(
      new Request("http://localhost/api/admin/twitch-locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([
          { country: "United States", percent: 55.5 },
          { country: "Canada", percent: 14.5 },
        ]),
      }),
    );
    expect(goodLoc.status).toBe(200);

    // Audience genders
    const gendersRes = await app.handle(
      new Request("http://localhost/api/admin/audience/genders", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([
          { gender: "Male", percent: 70, color: " #06b6d4 " },
          { gender: "Female", percent: 30, color: "   " },
        ]),
      }),
    );
    expect(gendersRes.status).toBe(200);
    const gendersData = (await gendersRes.json()) as {
      audience_genders: Array<{ gender: string; color: string | null }>;
    };
    expect(gendersData.audience_genders[0]?.color).toBe("#06b6d4");
    expect(gendersData.audience_genders[1]?.color).toBeNull();

    // Audience age-genders
    const ageRes = await app.handle(
      new Request("http://localhost/api/admin/audience/age-genders", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify([
          { age_range: "18-24", gender: "Male", percent: 45 },
          { age_range: "25-34", gender: "Female", percent: 25 },
        ]),
      }),
    );
    expect(ageRes.status).toBe(200);

    // Admin state returns everything
    const stateRes = await app.handle(
      new Request("http://localhost/api/admin/state", {
        headers: { Authorization: authHeader },
      }),
    );
    expect(stateRes.status).toBe(200);
    const state = (await stateRes.json()) as Record<string, unknown>;
    expect(state.twitch_locations).toHaveLength(2);
    expect(state.audience_genders).toHaveLength(2);
    expect(state.audience_age_genders).toHaveLength(2);
  });

  test("image upload validation, size limit, serving, and traversal protection", async () => {
    const app = createApp({ db, config });

    // Invalid content type
    const badType = await app.handle(
      new Request("http://localhost/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "image/svg+xml", Authorization: authHeader },
        body: "<svg></svg>",
      }),
    );
    expect(badType.status).toBe(400);
    expect(await badType.json()).toEqual({
      error: "Image must be PNG, JPEG, WebP, GIF, or AVIF",
    });

    // Empty body
    const emptyRes = await app.handle(
      new Request("http://localhost/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "image/png", Authorization: authHeader },
        body: new Uint8Array(0),
      }),
    );
    expect(emptyRes.status).toBe(400);
    expect(await emptyRes.json()).toEqual({ error: "Image is empty" });

    // Oversized body (> 5MB)
    const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    const tooBig = await app.handle(
      new Request("http://localhost/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "image/png", Authorization: authHeader },
        body: oversized,
      }),
    );
    expect(tooBig.status).toBe(413);

    // Valid upload
    const sampleBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const uploadRes = await app.handle(
      new Request("http://localhost/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "image/png", Authorization: authHeader },
        body: sampleBytes,
      }),
    );
    expect(uploadRes.status).toBe(200);
    const { url } = (await uploadRes.json()) as { url: string };
    expect(url).toMatch(/^\/uploads\/\d+\.png$/);

    // Served back from /uploads/*
    const getUpload = await app.handle(new Request(`http://localhost${url}`));
    expect(getUpload.status).toBe(200);
    expect(new Uint8Array(await getUpload.arrayBuffer())).toEqual(sampleBytes);

    // Path traversal blocked
    const traversal = await app.handle(
      new Request("http://localhost/uploads/%2e%2e/media_kit.db"),
    );
    expect(traversal.status).toBe(404);
  });

  test("serves static frontend files and blocks traversal", async () => {
    const app = createApp({ db, config });

    const root = await app.handle(new Request("http://localhost/"));
    expect(root.status).toBe(200);
    expect(await root.text()).toContain("<body>ok</body>");

    const txt = await app.handle(new Request("http://localhost/hello.txt"));
    expect(txt.status).toBe(200);
    expect(await txt.text()).toBe("hello world");

    const api404 = await app.handle(new Request("http://localhost/api/does-not-exist"));
    expect(api404.status).toBe(404);

    const staticTraversal = await app.handle(
      new Request("http://localhost/%2e%2e/media_kit.db"),
    );
    expect(staticTraversal.status).toBe(404);
  });

  test("Twitch Helix integration fetches user, followers, live stream, and last stream", async () => {
    const twitchConfig: AppConfig = {
      ...config,
      twitchClientId: "test-client",
      twitchClientSecret: "test-secret",
    };

    const mockFetch: FetchLike = async (input) => {
      const url = String(input);
      if (url.startsWith("https://id.twitch.tv/oauth2/token")) {
        return Response.json({ access_token: "tok_123", expires_in: 3600 });
      }
      if (url.startsWith("https://api.twitch.tv/helix/users")) {
        return Response.json({
          data: [
            {
              id: "42",
              login: "rythondev",
              display_name: "RythonDev",
              profile_image_url: "https://cdn.twitch.test/pfp.png",
            },
          ],
        });
      }
      if (url.startsWith("https://api.twitch.tv/helix/channels/followers")) {
        return Response.json({ total: 1500 });
      }
      if (url.startsWith("https://api.twitch.tv/helix/streams")) {
        return Response.json({
          data: [
            {
              title: "Building Elysia backend",
              game_name: "Software and Game Development",
              viewer_count: 99,
              started_at: "2026-11-25T10:00:00Z",
            },
          ],
        });
      }
      if (url.startsWith("https://api.twitch.tv/helix/videos")) {
        return Response.json({
          data: [
            {
              title: "Last VOD",
              created_at: "2026-11-24T10:00:00Z",
              duration: "2h30m",
              view_count: 320,
              url: "https://twitch.tv/videos/1",
            },
          ],
        });
      }
      if (url.startsWith("https://api.twitch.tv/helix/channels")) {
        return Response.json({
          data: [{ title: "Channel Title", game_name: "Software and Game Development" }],
        });
      }
      return new Response("Not Found", { status: 404 });
    };

    const app = createApp({ db, config: twitchConfig, fetchImpl: mockFetch });
    const res = await app.handle(new Request("http://localhost/api/media-kit"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { twitch: Record<string, unknown> };
    expect(body.twitch.configured).toBe(true);
    expect(body.twitch.found).toBe(true);
    expect(body.twitch.followers).toBe(1500);
    expect(body.twitch.live).toBe(true);
    expect(body.twitch.viewer_count).toBe(99);
    expect(body.twitch.last_stream).toEqual({
      title: "Last VOD",
      game_name: "Software and Game Development",
      started_at: "2026-11-24T10:00:00Z",
      duration: "2h30m",
      view_count: 320,
      url: "https://twitch.tv/videos/1",
    });
  });

  test("migrates legacy Rust SQLite schema and opens existing backend/data/media_kit.db cleanly", () => {
    // 1. Legacy schema with avg_reach and without sort_order + retired content
    const legacyPath = path.join(tempDir, "legacy.db");
    const legacy = new Database(legacyPath, { create: true });
    legacy.exec(`
      CREATE TABLE content (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
      INSERT INTO content VALUES ('twitch_avg_reach', '100', 1);
      CREATE TABLE platforms (
        name TEXT PRIMARY KEY,
        handle TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        followers INTEGER NOT NULL DEFAULT 0,
        avg_reach INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO platforms VALUES ('youtube', '@yt', 'https://yt', 10, 5, 1);
    `);
    legacy.close();

    const migrated = openDatabase(legacyPath);
    const cols = migrated.query<{ name: string }, []>("PRAGMA table_info(platforms)").all();
    expect(cols.some((c) => c.name === "avg_reach")).toBe(false);
    expect(cols.some((c) => c.name === "sort_order")).toBe(true);
    const retired = migrated
      .query<{ key: string }, []>("SELECT key FROM content WHERE key = 'twitch_avg_reach'")
      .all();
    expect(retired).toHaveLength(0);
    migrated.close();

    // 2. Existing Rust-generated database (copied to temp so we never mutate local data)
    const realDbPath = path.resolve(import.meta.dir, "../data/media_kit.db");
    if (existsSync(realDbPath)) {
      const copiedPath = path.join(tempDir, "existing_copy.db");
      copyFileSync(realDbPath, copiedPath);
      const existing = openDatabase(copiedPath);
      const rows = existing.query<{ key: string; value: string }, []>("SELECT key, value FROM content").all();
      expect(rows.length).toBeGreaterThan(0);
      existing.close();
    }
  });
});
