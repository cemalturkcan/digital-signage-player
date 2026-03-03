import { createRouter, createWebHistory } from 'vue-router'
import { APP_BASE_URL } from '@/config'

const router = createRouter({
  history: createWebHistory(APP_BASE_URL),
  routes: [
    {
      path: '/',
      name: 'control-panel',
      component: () => import('@/pages/ControlPanelPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
