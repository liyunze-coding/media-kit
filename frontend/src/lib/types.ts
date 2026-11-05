export interface Platform {
  name: string
  handle: string
  url: string
  followers: number
}

export interface TwitchData {
  configured?: boolean
  found?: boolean
  login?: string
  display_name?: string
  profile_image_url?: string
  followers?: number
  live?: boolean
  title?: string
  game_name?: string
  viewer_count?: number
  updated_at?: number
  message?: string
}

export interface MediaKit {
  content: Record<string, string>
  platforms: Platform[]
  twitch: TwitchData | null
}

export interface AdminState {
  content: Record<string, string>
  platforms: Platform[]
}
