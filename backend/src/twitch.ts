import type { Cache } from "./cache.ts";
import type { AppConfig } from "./config.ts";
import { nowSecs } from "./util.ts";

const TWITCH_CACHE_KEY = "twitch";
const TOKEN_CACHE_KEY = "twitch_token";
const TTL_SECS = 300;
const HTTP_TIMEOUT_MS = 10_000;

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface TwitchContext {
  cache: Cache;
  config: Pick<AppConfig, "twitchClientId" | "twitchClientSecret" | "twitchLogin">;
  fetchImpl?: FetchLike;
}

type JsonObject = Record<string, unknown>;

export async function getTwitch(ctx: TwitchContext): Promise<JsonObject> {
  const cached = ctx.cache.get<JsonObject>(TWITCH_CACHE_KEY);
  if (cached !== undefined) {
    return cached;
  }

  const data = await fetchTwitch(ctx);
  ctx.cache.set(TWITCH_CACHE_KEY, data, TTL_SECS);
  return data;
}

async function fetchTwitch(ctx: TwitchContext): Promise<JsonObject> {
  const { twitchClientId, twitchClientSecret, twitchLogin } = ctx.config;

  if (!twitchClientId || !twitchClientSecret) {
    return {
      configured: false,
      login: twitchLogin,
      message: "Twitch credentials are not configured",
    };
  }

  const token = await getToken(ctx);
  const users = await helixGet(ctx, token, "https://api.twitch.tv/helix/users", {
    login: twitchLogin,
  });

  const user = firstDataItem(users);
  if (!user) {
    return {
      configured: true,
      found: false,
      login: twitchLogin,
      message: "Twitch channel not found",
    };
  }

  const userId = typeof user.id === "string" ? user.id : null;
  if (!userId) {
    throw new Error("Twitch user id missing from response");
  }

  const [followers, streams, lastStream] = await Promise.all([
    getFollowerCount(ctx, token, userId),
    helixGet(ctx, token, "https://api.twitch.tv/helix/streams", { user_id: userId }).catch(
      () => null,
    ),
    getLastStream(ctx, token, userId),
  ]);

  const stream = firstDataItem(streams);
  const live = stream !== null;

  return {
    configured: true,
    found: true,
    login: user.login ?? twitchLogin,
    display_name: user.display_name ?? null,
    profile_image_url: user.profile_image_url ?? null,
    followers,
    live,
    title: stream?.title ?? null,
    game_name: stream?.game_name ?? null,
    viewer_count: stream?.viewer_count ?? null,
    started_at: stream?.started_at ?? null,
    last_stream: lastStream,
    updated_at: nowSecs(),
  };
}

async function getLastStream(
  ctx: TwitchContext,
  token: string,
  userId: string,
): Promise<JsonObject | null> {
  const [videos, channels] = await Promise.all([
    helixGet(ctx, token, "https://api.twitch.tv/helix/videos", {
      user_id: userId,
      type: "archive",
      first: "1",
    }).catch(() => null),
    helixGet(ctx, token, "https://api.twitch.tv/helix/channels", {
      broadcaster_id: userId,
    }).catch(() => null),
  ]);

  const video = firstDataItem(videos);
  const channel = firstDataItem(channels);

  if (!video && !channel) {
    return null;
  }

  // VODs carry no category, so the channel's current category stands in for it.
  const title = video?.title ?? channel?.title ?? null;

  return {
    title,
    game_name: channel?.game_name ?? null,
    started_at: video?.created_at ?? null,
    duration: video?.duration ?? null,
    view_count: video?.view_count ?? null,
    url: video?.url ?? null,
  };
}

async function getFollowerCount(ctx: TwitchContext, token: string, userId: string): Promise<number> {
  // Get Users Follows was removed (410 Gone). Channel Followers returns `total`
  // for app access tokens; the follower list itself requires a user token.
  try {
    const body = await helixGet(ctx, token, "https://api.twitch.tv/helix/channels/followers", {
      broadcaster_id: userId,
      first: "1",
    });
    return typeof body.total === "number" ? body.total : 0;
  } catch {
    return 0;
  }
}

async function helixGet(
  ctx: TwitchContext,
  token: string,
  baseUrl: string,
  query: Record<string, string>,
): Promise<JsonObject> {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const doFetch = ctx.fetchImpl ?? globalThis.fetch;
  const res = await doFetch(url.toString(), {
    headers: {
      "Client-Id": ctx.config.twitchClientId,
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Twitch API error (${res.status} ${res.statusText})`);
  }

  return (await res.json()) as JsonObject;
}

async function getToken(ctx: TwitchContext): Promise<string> {
  const cached = ctx.cache.get<{ access_token?: string }>(TOKEN_CACHE_KEY);
  if (cached?.access_token) {
    return cached.access_token;
  }

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", ctx.config.twitchClientId);
  url.searchParams.set("client_secret", ctx.config.twitchClientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const doFetch = ctx.fetchImpl ?? globalThis.fetch;
  const res = await doFetch(url.toString(), {
    method: "POST",
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Twitch token request failed (${res.status} ${res.statusText})`);
  }

  const body = (await res.json()) as JsonObject;
  const token = typeof body.access_token === "string" ? body.access_token : null;
  if (!token) {
    throw new Error("Twitch token missing access_token");
  }

  const expiresIn = typeof body.expires_in === "number" ? body.expires_in : 3600;
  const ttl = Math.max(60, Math.max(0, Math.floor(expiresIn) - 60));
  ctx.cache.set(TOKEN_CACHE_KEY, { access_token: token }, ttl);

  return token;
}

function firstDataItem(body: JsonObject | null): JsonObject | null {
  if (!body || !Array.isArray(body.data) || body.data.length === 0) {
    return null;
  }
  const first = body.data[0];
  return first && typeof first === "object" ? (first as JsonObject) : null;
}
