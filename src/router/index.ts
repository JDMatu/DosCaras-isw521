import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Route meta contract:
 * - requiresAuth: redirect to /login (preserving destination) when anonymous.
 * - requiresSuperadmin: redirect to /403 when not SUPERADMIN.
 * - guestOnly: redirect authenticated users to the board.
 */
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresSuperadmin?: boolean
    guestOnly?: boolean
    title?: string
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'board',
      component: () => import('@/views/BoardView.vue'),
      meta: { title: 'Tablero' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true, title: 'Iniciar sesión' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true, title: 'Crear cuenta' },
    },
        {
      path: '/views/new',
      name: 'view-create',
      component: () => import('@/views/ViewFormView.vue'),
      meta: { requiresAuth: true, title: 'Nueva publicación' },
    },
    {
      path: '/views/:id',
      name: 'view-detail',
      component: () => import('@/views/ViewDetailView.vue'),
      meta: { title: 'Publicación' },
    },
    {
      path: '/views/:id/edit',
      name: 'view-edit',
      component: () => import('@/views/ViewFormView.vue'),
      meta: { requiresAuth: true, title: 'Editar publicación' },
    },
    {
      path: '/categories/:id',
      name: 'category',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Categoría' },
    },
    {
      path: '/authors/:id',
      name: 'author',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Autor' },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Búsqueda' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { requiresAuth: true, title: 'Mi perfil' },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { requiresAuth: true, requiresSuperadmin: true, title: 'Gestión de usuarios' },
    },
    {
      path: '/admin/categories',
      name: 'admin-categories',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { requiresAuth: true, requiresSuperadmin: true, title: 'Gestión de categorías' },
    },
    {
      path: '/admin/moderation',
      name: 'admin-moderation',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { requiresAuth: true, requiresSuperadmin: true, title: 'Moderación' },
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/ForbiddenView.vue'),
      meta: { title: 'Acceso denegado' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Página no encontrada' },
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresSuperadmin && !auth.isSuperadmin) {
    return { name: 'forbidden' }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'board' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Las Dos Caras` : 'Las Dos Caras'
})