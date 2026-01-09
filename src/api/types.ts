// Bungie OAuth Response Types
export interface BungieOAuthTokens {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  refresh_expires_in?: number
  membership_id: string
}

export interface BungieMembershipData {
  membershipType: number
  membershipId: string
  displayName: string
  bungieGlobalDisplayName: string
  bungieGlobalDisplayNameCode: number
}

export interface BungieUser {
  membershipId: string
  uniqueName: string
  normalizedName: string
  displayName: string
  profilePicture: number
  profileTheme: number
  userTitle: number
  successMessageFlags: number
  isDeleted: boolean
  about: string
  firstAccess?: string
  lastUpdate?: string
  psnDisplayName?: string
  xboxDisplayName?: string
  steamDisplayName?: string
  stadiaDisplayName?: string
  twitchDisplayName?: string
}

// Bungie API Response Wrapper
export interface BungieResponse<T> {
  Response: T
  ErrorCode: number
  ThrottleSeconds: number
  ErrorStatus: string
  Message: string
  MessageData: Record<string, unknown>
}
