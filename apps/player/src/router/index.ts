import { createRouter, createWebHistory } from 'vue-router'
import { APP_BASE_URL } from '@/config'

const router = createRouter({
  history: createWebHistory(APP_BASE_URL),
  routes: [
    {
      path: '/',
      name: 'playlist-selection',
      component: () => import('@/pages/PlaylistSelectionPage.vue'),
    },
    {
      path: '/playlist/:id',
      name: 'playlist-playback',
      component: () => import('@/pages/PlaybackPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
