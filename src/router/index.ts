import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AboutView from '@/views/AboutView.vue'
import WeaponsView from '@/views/WeaponsView.vue'
import CallbackView from '@/views/CallbackView.vue'
import WeaponDetailView from '@/views/WeaponDetailView.vue'
import PlaygroundView from '@/views/PlaygroundView.vue'
import SettingsView from '@/views/SettingsView.vue'
import GodRollsView from '@/views/GodRollsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'weapons',
      component: WeaponsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView
    },
    {
      path: '/weapons/:weaponHash',
      name: 'weapon-detail',
      component: WeaponDetailView,
      meta: { requiresAuth: true }
    },
    {
      path: '/playground/:weaponHash?',
      name: 'playground',
      component: PlaygroundView
    },
    {
      path: '/callback',
      name: 'callback',
      component: CallbackView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    },
    {
      path: '/godrolls',
      name: 'godrolls',
      component: GodRollsView,
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard for protected routes
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'about' })
  } else {
    next()
  }
})

export default router
