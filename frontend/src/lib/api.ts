import type {
  AdminState,
  Collab,
  MediaKit,
  Platform,
  TwitchLocation,
} from "./types";

const TOKEN_KEY = "rythondev_admin_token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Basic ${token}` } : {};
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function fetchMediaKit(): Promise<MediaKit> {
  const res = await fetch("/api/media-kit");
  if (!res.ok) throw new Error("Failed to load media kit");
  return res.json();
}

export async function verifyAdmin(
  username: string,
  password: string,
): Promise<boolean> {
  const token = btoa(`${username}:${password}`);
  const res = await fetch("/api/admin/verify", {
    headers: { Authorization: `Basic ${token}` },
  });

  if (!res.ok) return false;

  localStorage.setItem(TOKEN_KEY, token);
  return true;
}

export async function fetchAdminState(): Promise<AdminState> {
  const res = await fetch("/api/admin/state", { headers: authHeaders() });
  if (res.status === 401) {
    clearStoredToken();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Failed to load admin state");
  return res.json();
}

export async function updateContent(
  content: Record<string, string>,
): Promise<Record<string, string>> {
  const res = await fetch("/api/admin/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(content),
  });

  if (res.status === 401) {
    clearStoredToken();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Failed to save content");

  const data = await res.json();
  return data.content;
}

export async function updatePlatforms(
  platforms: Platform[],
): Promise<Platform[]> {
  const res = await fetch("/api/admin/platforms", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(platforms),
  });

  if (res.status === 401) {
    clearStoredToken();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Failed to save platforms");

  const data = await res.json();
  return data.platforms;
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : fallback;
}

export async function uploadImage(file: File): Promise<string> {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": file.type, ...authHeaders() },
    body: file,
  });

  if (res.status === 401) {
    clearStoredToken();
    throw new Error("unauthorized");
  }
  if (res.status === 413) throw new Error("Image must be 5 MB or smaller");
  if (!res.ok) throw new Error(await readError(res, "Failed to upload image"));

  const data = await res.json();
  return data.url;
}

export async function updateCollabs(collabs: Collab[]): Promise<Collab[]> {
  const res = await fetch("/api/admin/collabs", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(
      collabs.map(({ name, image, url }) => ({ name, image, url })),
    ),
  });

  if (res.status === 401) {
    clearStoredToken();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(await readError(res, "Failed to save collaborations"));

  const data = await res.json();
  return data.collabs;
}

export async function updateTwitchLocations(
  locations: TwitchLocation[],
): Promise<TwitchLocation[]> {
  const res = await fetch("/api/admin/twitch-locations", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(
      locations.map(({ country, percent }) => ({
        country,
        percent: Number(percent) || 0,
      })),
    ),
  });

  if (res.status === 401) {
    clearStoredToken();
    throw new Error("unauthorized");
  }
  if (!res.ok)
    throw new Error(await readError(res, "Failed to save Twitch locations"));

  const data = await res.json();
  return data.twitch_locations;
}

