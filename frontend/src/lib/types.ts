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

export interface AudienceGender {
  id: number;
  gender: string;
  percent: number;
  color?: string | null;
}

export interface AudienceAgeGender {
  id: number;
  age_range: string;
  gender: string;
  percent: number;
}

export interface LastStream {
  title?: string | null;
  game_name?: string | null;
  started_at?: string | null;
  duration?: string | null;
  view_count?: number | null;
  url?: string | null;
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
  started_at?: string | null;
  last_stream?: LastStream | null;
  updated_at?: number;
  message?: string;
}

export interface MediaKit {
  content: Record<string, string>;
  platforms: Platform[];
  collabs: Collab[];
  twitch: TwitchData | null;
  twitch_locations: TwitchLocation[];
  audience_genders: AudienceGender[];
  audience_age_genders: AudienceAgeGender[];
}

export interface AdminState {
  content: Record<string, string>;
  platforms: Platform[];
  collabs: Collab[];
  twitch_locations: TwitchLocation[];
  audience_genders: AudienceGender[];
  audience_age_genders: AudienceAgeGender[];
}
