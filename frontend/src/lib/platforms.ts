export type PlatformDeco = {
  image: string;
  color?: string | null;
};

export const platformImageMap: Record<string, PlatformDeco> = {
  twitch: {
    image: "/images/logos/twitch.svg",
    color: "#8E60F5",
  },
  youtube: {
    image: "/images/logos/youtube.svg",
    color: "#FF0000",
  },
  instagram: {
    image: "/images/logos/instagram.svg",
    color: "#E1306C",
  },
  tiktok: {
    image: "/images/logos/tiktok.svg",
    // Follows the text colour so the hover accent stays visible in both themes.
    color: "currentColor",
  },
};

export function metricLabel(name: string): string {
  return name.toLowerCase() === "youtube" ? "subscribers" : "followers";
}
