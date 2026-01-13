import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AboutView from '@/views/AboutView.vue'
import WeaponsView from '@/views/WeaponsView.vue'
import CallbackView from '@/views/CallbackView.vue'
import WeaponDetailView from '@/views/WeaponDetailView.vue'
import WishlistsView from '@/views/WishlistsView.vue'
import WishlistDetailView from '@/views/WishlistDetailView.vue'

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
      path: '/callback',
      name: 'callback',
      component: CallbackView
    },
    {
      path: '/wishlists',
      name: 'wishlists',
      component: WishlistsView
    },
    {
      path: '/wishlists/:id',
      name: 'wishlist-detail',
      component: WishlistDetailView
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
