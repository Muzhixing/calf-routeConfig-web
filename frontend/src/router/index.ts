import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getItem, StorageKeys } from '@/utils/storage'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '控制台', requiresAuth: true }
  },
  {
    path: '/cows',
    name: 'Cows',
    component: () => import('@/views/CowList.vue'),
    meta: { title: '牛只管理', requiresAuth: true }
  },
  {
    path: '/cows/:id',
    name: 'CowDetail',
    component: () => import('@/views/CowDetail.vue'),
    meta: { title: '牛只详情', requiresAuth: true }
  },
  {
    path: '/health',
    name: 'Health',
    component: () => import('@/views/HealthRecords.vue'),
    meta: { title: '健康记录', requiresAuth: true }
  },
  {
    path: '/feeding',
    name: 'Feeding',
    component: () => import('@/views/Feeding.vue'),
    meta: { title: '喂养管理', requiresAuth: true }
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/Statistics.vue'),
    meta: { title: '数据统计', requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '系统设置', requiresAuth: true }
  },
  {
    path: '/robots',
    name: 'Robots',
    component: () => import('@/views/RobotManageView.vue'),
    meta: { title: '机器人管理', requiresAuth: true }
  },
  {
    path: '/routes',
    name: 'Routes',
    component: () => import('@/views/Routes.vue'),
    meta: { title: '路线管理', requiresAuth: true }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/TaskView.vue'),
    meta: { title: '任务管理', requiresAuth: true }
  },
  {
    path: '/alarms',
    name: 'Alarms',
    component: () => import('@/views/Alarms.vue'),
    meta: { title: '告警中心', requiresAuth: true }
  },
  {
    path: '/map',
    name: 'Map',
    component: () => import('@/views/MapView.vue'),
    meta: { title: '牧场地图', requiresAuth: true }
  },
  {
    path: '/map-editor',
    name: 'MapEditor',
    component: () => import('@/views/MapEditorView.vue'),
    meta: { title: '路线编辑', requiresAuth: true }
  },
  {
    path: '/video',
    name: 'Video',
    component: () => import('@/views/VideoView.vue'),
    meta: { title: '视频监控', requiresAuth: true }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue'),
    meta: { title: '历史记录', requiresAuth: true }
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('@/views/LogView.vue'),
    meta: { title: '操作日志', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 智慧牧场管理系统`
  }
  
  const requiresAuth = to.meta.requiresAuth !== false
  
  if (requiresAuth) {
    // Check if user is logged in
    const token = getItem<string>(StorageKeys.TOKEN)
    if (!token) {
      next({ path: '/login', query: { redirect: to.fullPath } })
      return
    }
    
    // Verify token with auth store
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      const valid = await authStore.verifyAuth()
      if (!valid) {
        next({ path: '/login', query: { redirect: to.fullPath } })
        return
      }
    }
  }
  
  next()
})

export default router