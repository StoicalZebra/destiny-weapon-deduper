import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { useThemeStore } from './stores/theme'
import { useManifestStore } from './stores/manifest'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize theme before mounting to prevent flash
const themeStore = useThemeStore()
themeStore.initialize()

// Start manifest loading immediately (fire and forget - App.vue shows loading state)
const manifestStore = useManifestStore()
manifestStore.initialize()

app.mount('#app')
