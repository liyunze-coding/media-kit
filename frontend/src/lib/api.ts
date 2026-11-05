import type { AdminState, MediaKit, Platform } from "./types";

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

