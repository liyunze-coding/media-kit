export type PlatformDeco = {
  image: string;
  color?: string | null;
  displayName: string;
};

export const platformImageMap: Record<string, PlatformDeco> = {
  twitch: {
    image: "/images/logos/twitch.svg",
    color: "#8E60F5",
    displayName: "Twitch",
  },
  youtube: {
    image: "/images/logos/youtube.svg",
    color: "#FF0000",
    displayName: "YouTube",
  },
  instagram: {
    image: "/images/logos/instagram.svg",
    color: "#E1306C",
    displayName: "Instagram",
  },
  tiktok: {
    image: "/images/logos/tiktok.svg",
    // Follows the text colour so the hover accent stays visible in both themes.
    color: "currentColor",
    displayName: "TikTok",
  },
};

export function platformDisplayName(name: string): string {
  const deco = platformImageMap[name.toLowerCase()];
  if (deco) return deco.displayName;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function metricLabel(name: string): string {
  return name.toLowerCase() === "youtube" ? "subscribers" : "followers";
}
