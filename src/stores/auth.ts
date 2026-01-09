import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { bungieAuth } from '@/api/auth'
import { inventoryAPI, type DestinyMembership } from '@/api/inventory'
import type { BungieOAuthTokens, BungieUser } from '@/api/types'

interface StoredTokens {
  accessToken: string
  expiresAt: number
  membershipId: string
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const accessToken = ref<string | null>(null)
  const expiresAt = ref<number | null>(null)
  const membershipId = ref<string | null>(null)
  const user = ref<BungieUser | null>(null)
  const destinyMemberships = ref<DestinyMembership[]>([])
  const selectedMembership = ref<DestinyMembership | null>(null)

  // Computed
  const isAuthenticated = computed(() => {
    if (!accessToken.value || !expiresAt.value) {
      return false
    }
    // Check if token is expired
    return !bungieAuth.isTokenExpired(expiresAt.value)
  })

  // Actions
  function initializeFromStorage() {
    const storedTokens = localStorage.getItem('bungie_tokens')

    // Check for mock mode
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      console.log('Initializing mock auth session')
      accessToken.value = 'mock-access-token'
      expiresAt.value = Date.now() + 86400000 // 24 hours
      membershipId.value = 'mock-membership-id'

      user.value = {
        membershipId: 'mock-membership-id',
        uniqueName: 'MockUser#1234',
        displayName: 'Mock User',
        normalizedName: 'mock user', // Added required field
        profilePicture: 0, // Changed from path string to number (index?) or path if type allowed, but interface says number
        profileTheme: 0,
        userTitle: 0,
        successMessageFlags: 0,
        isDeleted: false,
        about: 'Mock user for local development',
        firstAccess: '', // ISO date string if needed
        lastUpdate: ''
      }

      selectedMembership.value = {
        membershipType: 3, // Steam
        membershipId: 'mock-membership-id',
        displayName: 'Mock Guardian',
        bungieGlobalDisplayName: 'MockUser',
        bungieGlobalDisplayNameCode: 1234,
        crossSaveOverride: 0,
        applicableMembershipTypes: [3],
        isPublic: true,
        membershipState: 0
      }
      return
    }

    if (!storedTokens) return

    try {
      const tokens: StoredTokens = JSON.parse(storedTokens)

      // Check if token is still valid
      if (!bungieAuth.isTokenExpired(tokens.expiresAt)) {
        accessToken.value = tokens.accessToken
        expiresAt.value = tokens.expiresAt
        membershipId.value = tokens.membershipId
      } else {
        // Token expired, clear storage
        clearAuth()
      }
    } catch (err) {
      console.error('Failed to parse stored tokens:', err)
      clearAuth()
    }
  }

  function setTokens(tokens: BungieOAuthTokens) {
    accessToken.value = tokens.access_token
    expiresAt.value = Date.now() + (tokens.expires_in * 1000)
    membershipId.value = tokens.membership_id

    // Persist to localStorage
    const storedTokens: StoredTokens = {
      accessToken: accessToken.value,
      expiresAt: expiresAt.value,
      membershipId: membershipId.value
    }

    localStorage.setItem('bungie_tokens', JSON.stringify(storedTokens))
  }

  async function setUser(userData: BungieUser) {
    user.value = userData
    localStorage.setItem('bungie_user', JSON.stringify(userData))
  }

  async function loadUser() {
    // Try to load from storage first
    const storedUser = localStorage.getItem('bungie_user')
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
        return
      } catch (err) {
        console.error('Failed to parse stored user:', err)
      }
    }

    // If not in storage or invalid, fetch from API
    if (accessToken.value) {
      try {
        const userData = await bungieAuth.getCurrentUser(accessToken.value)
        await setUser(userData)
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      }
    }
  }

  async function loadDestinyMemberships() {
    console.log('[Auth] loadDestinyMemberships called')
    console.log('[Auth] Access token exists:', !!accessToken.value)

    // Try to load from storage first
    const storedMemberships = localStorage.getItem('destiny_memberships')
    if (storedMemberships) {
      console.log('[Auth] Found stored memberships')
      try {
        const memberships = JSON.parse(storedMemberships)
        destinyMemberships.value = memberships
        console.log('[Auth] Loaded memberships from storage:', memberships.length)
        // Select first membership by default
        if (memberships.length > 0 && !selectedMembership.value) {
          selectedMembership.value = memberships[0]
          console.log('[Auth] Selected membership:', memberships[0].displayName)
        }
        return
      } catch (err) {
        console.error('[Auth] Failed to parse stored memberships:', err)
      }
    }

    // If not in storage or invalid, fetch from API
    if (accessToken.value) {
      if (import.meta.env.VITE_USE_MOCK === 'true') return // Skip API fetch in mock mode

      console.log('[Auth] Fetching memberships from API...')
      try {
        const memberships = await inventoryAPI.getMemberships(accessToken.value)
        console.log('[Auth] API returned memberships:', memberships.length)
        destinyMemberships.value = memberships
        localStorage.setItem('destiny_memberships', JSON.stringify(memberships))

        // Select first membership by default (usually the cross-save primary)
        if (memberships.length > 0) {
          selectedMembership.value = memberships[0]
          console.log('[Auth] Selected membership:', memberships[0].displayName)
        }
      } catch (err) {
        console.error('[Auth] Failed to fetch Destiny memberships:', err)
        console.error('[Auth] Error details:', err)
      }
    } else {
      console.warn('[Auth] No access token available for fetching memberships')
    }
  }

  function clearAuth() {
    accessToken.value = null
    expiresAt.value = null
    membershipId.value = null
    user.value = null
    destinyMemberships.value = []
    selectedMembership.value = null
    localStorage.removeItem('bungie_tokens')
    localStorage.removeItem('bungie_user')
    localStorage.removeItem('destiny_memberships')
  }

  function initiateLogin() {
    bungieAuth.initiateLogin()
  }

  async function handleCallback(code: string, state: string) {
    try {
      const tokens = await bungieAuth.handleCallback(code, state)
      setTokens(tokens)
      await loadUser()
      await loadDestinyMemberships()
    } catch (err) {
      clearAuth()
      throw err
    }
  }

  // Initialize on store creation
  initializeFromStorage()
  if (isAuthenticated.value && !user.value) {
    loadUser()
  }
  if (isAuthenticated.value && destinyMemberships.value.length === 0) {
    loadDestinyMemberships()
  }

  return {
    accessToken,
    expiresAt,
    membershipId,
    user,
    destinyMemberships,
    selectedMembership,
    isAuthenticated,
    setTokens,
    setUser,
    loadUser,
    loadDestinyMemberships,
    clearAuth,
    initiateLogin,
    handleCallback
  }
})
