import type { BungieOAuthTokens, BungieUser, BungieResponse } from './types'

export class BungieAuth {
  private readonly CLIENT_ID: string
  private readonly REDIRECT_URI: string
  private readonly API_KEY: string
  private readonly AUTH_URL = 'https://www.bungie.net/en/oauth/authorize'
  private readonly TOKEN_URL = 'https://www.bungie.net/platform/app/oauth/token/'
  private readonly USER_URL = 'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/'

  constructor() {
    this.CLIENT_ID = import.meta.env.VITE_BUNGIE_CLIENT_ID || ''
    this.REDIRECT_URI = import.meta.env.VITE_BUNGIE_REDIRECT_URI || ''
    this.API_KEY = import.meta.env.VITE_BUNGIE_API_KEY || ''

    if (!this.CLIENT_ID || !this.REDIRECT_URI || !this.API_KEY) {
      console.error('Missing Bungie API configuration. Please check your .env.local file.')
    }
  }

  /**
   * Generate a random state parameter for CSRF protection
   */
  private generateState(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Initiate OAuth login flow by redirecting to Bungie
   */
  initiateLogin(): void {
    const state = this.generateState()
    localStorage.setItem('oauth_state', state)

    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      response_type: 'code',
      redirect_uri: this.REDIRECT_URI,
      state: state
    })

    window.location.href = `${this.AUTH_URL}?${params.toString()}`
  }

  /**
   * Handle OAuth callback and exchange code for access token
   */
  async handleCallback(code: string, state: string): Promise<BungieOAuthTokens> {
    // Verify state parameter (CSRF protection)
    const savedState = localStorage.getItem('oauth_state')
    if (!savedState || state !== savedState) {
      throw new Error('Invalid state parameter. Possible CSRF attack.')
    }

    // Clean up state
    localStorage.removeItem('oauth_state')

    // Exchange authorization code for access token
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': this.API_KEY
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: this.CLIENT_ID
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to exchange authorization code: ${errorText}`)
    }

    const tokens: BungieOAuthTokens = await response.json()
    return tokens
  }

  /**
   * Fetch current user information
   */
  async getCurrentUser(accessToken: string): Promise<BungieUser> {
    const response = await fetch(this.USER_URL, {
      headers: {
        'X-API-Key': this.API_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user information')
    }

    const data: BungieResponse<{ bungieNetUser: BungieUser }> = await response.json()

    if (data.ErrorCode !== 1) {
      throw new Error(data.Message || 'Failed to fetch user information')
    }

    return data.Response.bungieNetUser
  }

  /**
   * Check if access token is expired
   */
  isTokenExpired(expiresAt: number): boolean {
    return Date.now() >= expiresAt
  }
}

export const bungieAuth = new BungieAuth()
