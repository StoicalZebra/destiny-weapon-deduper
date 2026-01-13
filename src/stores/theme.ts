import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const STORAGE_KEY = 'd3_theme_preference'

  // State - default to light for first-time visitors
  const preference = ref<ThemePreference>('light')
  const resolvedTheme = ref<'light' | 'dark'>('light')

  // Computed
  const isDark = computed(() => resolvedTheme.value === 'dark')

  // Resolve system preference
  function getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Update resolved theme based on preference
  function updateResolvedTheme() {
    if (preference.value === 'system') {
      resolvedTheme.value = getSystemPreference()
    } else {
      resolvedTheme.value = preference.value
    }
  }

  // Apply theme to document
  function applyTheme() {
    if (typeof document === 'undefined') return

    const html = document.documentElement
    if (resolvedTheme.value === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  // Initialize from storage
  function initialize() {
    if (typeof localStorage === 'undefined') return

    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      preference.value = stored
    }
    updateResolvedTheme()
    applyTheme()

    // Listen for system preference changes
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => {
          if (preference.value === 'system') {
            updateResolvedTheme()
            applyTheme()
          }
        })
    }
  }

  // Set preference
  function setTheme(theme: ThemePreference) {
    preference.value = theme
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme)
    }
    updateResolvedTheme()
    applyTheme()
  }

  // Toggle between light/dark
  function toggleTheme() {
    const next = resolvedTheme.value === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return {
    preference,
    resolvedTheme,
    isDark,
    initialize,
    setTheme,
    toggleTheme
  }
})
