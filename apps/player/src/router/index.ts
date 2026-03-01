import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
