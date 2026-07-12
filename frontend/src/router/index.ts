import { createRouter, createWebHistory } from 'vue-router'
import UserPortal from '../views/UserPortal.vue'
import RoomSchedule from '../views/RoomSchedule.vue'
import GuidePortal from '../views/GuidePortal.vue'
import AdminPortal from '../views/AdminPortal.vue'
import AdminDashboard from '../views/admin/AdminDashboard.vue'
import AdminApproval from '../views/admin/AdminApproval.vue'
import AdminSchedule from '../views/admin/AdminSchedule.vue'
import AdminRooms from '../views/admin/AdminRooms.vue'
import AdminUsers from '../views/admin/AdminUsers.vue'
import AdminSettings from '../views/admin/AdminSettings.vue'
import AdminMailSettings from '../views/admin/AdminMailSettings.vue'
import MailApproval from '../views/MailApproval.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'user',
      component: UserPortal,
    },
    {
      path: '/room/:id',
      name: 'room-schedule',
      component: RoomSchedule,
    },
    {
      path: '/guide',
      name: 'guide',
      component: GuidePortal,
    },
    {
      path: '/mail-approval/:token',
      name: 'mail-approval',
      component: MailApproval,
    },
    {
      path: '/admin',
      component: AdminPortal,
      meta: { requiresAuth: true },
      redirect: '/admin/approval',
      children: [
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: AdminDashboard,
        },
        {
          path: 'approval',
          name: 'admin-approval',
          component: AdminApproval,
        },
        {
          path: 'schedule',
          name: 'admin-schedule',
          component: AdminSchedule,
        },
        {
          path: 'rooms',
          name: 'admin-rooms',
          component: AdminRooms,
        },
        {
          path: 'users',
          name: 'admin-users',
          component: AdminUsers,
        },
        {
          path: 'mail-settings',
          name: 'admin-mail-settings',
          component: AdminMailSettings,
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: AdminSettings,
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    const token = sessionStorage.getItem('room-admin-token')
    if (!token) {
      next({ name: 'user' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
