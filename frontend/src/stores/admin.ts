import { reactive } from 'vue'
import type { Room } from '../types'
import { api } from '../api'

export const adminStore = reactive({
  rooms: [] as Room[],
  pendingTotal: 0,

  async loadRooms() {
    try {
      this.rooms = await api.getAdminRooms()
    } catch {
      this.rooms = []
    }
  },

  async loadPending() {
    try {
      const res = await api.getApplications('pending', 1, 1)
      this.pendingTotal = res.pendingTotal ?? 0
    } catch {
      this.pendingTotal = 0
    }
  },
})
