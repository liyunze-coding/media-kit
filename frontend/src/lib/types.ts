export interface Platform {
  name: string;
  handle: string;
  url: string;
  followers: number;
}

export interface Collab {
  id: number;
  name: string;
  image: string;
  url: string;
}

export interface TwitchLocation {
  id: number;
  country: string;
  percent: number;
}

export interface TwitchData {
  configured?: boolean;
  found?: boolean;
  login?: string;
  display_name?: string;
  profile_image_url?: string;
  followers?: number;
  live?: boolean;
  title?: string;
  game_name?: string;
  viewer_count?: number;
  updated_at?: number;
  message?: string;
}

export interface MediaKit {
  content: Record<string, string>;
  platforms: Platform[];
  collabs: Collab[];
  twitch: TwitchData | null;
  twitch_locations: TwitchLocation[];
}

export interface AdminState {
  content: Record<string, string>;
  platforms: Platform[];
  collabs: Collab[];
  twitch_locations: TwitchLocation[];
}
