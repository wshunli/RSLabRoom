import { reactive } from 'vue'
import type { BookingRequest, Room } from '../types'
import { api, type ScheduleView } from '../api'

export const adminStore = reactive({
  rooms: [] as Room[],
  pendingTotal: 0,

  async loadRooms() {
    try {
      this.rooms = await api.getRooms()
    } catch {
      this.rooms = []
    }
  },
})
