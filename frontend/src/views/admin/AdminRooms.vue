<script setup lang="ts">
import { reactive, ref } from 'vue'
import { DoorOpen, Pencil, Plus, Trash2, X } from '@lucide/vue'
import { api, type RoomInput } from '../../api'
import type { Room } from '../../types'
import { adminStore } from '../../stores/admin'

const showForm = ref(false)
const editingId = ref<number | null>(null)
const error = ref('')
const emptyForm = (): RoomInput => ({ name: '', building: '', seats: 0, audience: '实验教学中心', intro: '', administrator: '', phone: '' })
const form = reactive<RoomInput>(emptyForm())

function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); showForm.value = true }
function openEdit(room: Room) {
  editingId.value = room.id
  Object.assign(form, { name: room.name, building: room.building, seats: room.seats, audience: room.audience, intro: room.intro || '', administrator: room.administrator || '', phone: room.phone || '' })
  showForm.value = true
}
async function saveRoom() {
  error.value = ''
  try {
    if (editingId.value) await api.updateRoom(editingId.value, form)
    else await api.createRoom(form)
    showForm.value = false
    await adminStore.loadRooms()
  } catch (err) { error.value = err instanceof Error ? err.message : '保存失败' }
}
async function removeRoom(room: Room) {
  if (!confirm(`确定删除机房“${room.name}”吗？`)) return
  try { await api.deleteRoom(room.id); await adminStore.loadRooms() }
  catch (err) { error.value = err instanceof Error ? err.message : '删除失败' }
}
</script>

<template>
  <section class="admin-main">
    <div class="admin-title">
      <div><span class="kicker">ROOM MANAGEMENT</span><h1>教室管理</h1><p>以列表形式维护教室资料与管理员联系方式。</p></div>
      <span class="date-card"><DoorOpen /><b>{{ adminStore.rooms.length }} 间教室</b><small>实验教学中心</small></span>
    </div>
    <section class="panel management-panel">
      <div class="panel-head management-head"><div><h2>教室列表</h2><p>共 {{ adminStore.rooms.length }} 条记录</p></div><button class="primary compact" @click="openCreate"><Plus />新增教室</button></div>
      <p v-if="error" class="form-message error">{{ error }}</p>
      <div class="approval-table-wrap">
        <table class="approval-table room-management-table">
          <thead><tr><th>教室</th><th>楼宇</th><th>座位</th><th>管理员</th><th>联系电话</th><th>简介</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="room in adminStore.rooms" :key="room.id">
              <td><strong>{{ room.name }}</strong><small>#{{ room.id }}</small></td><td>{{ room.building || '—' }}</td><td>{{ room.seats }}</td><td>{{ room.administrator || '—' }}</td><td>{{ room.phone || '—' }}</td><td class="room-description">{{ room.intro || '—' }}</td>
              <td><div class="approval-actions"><button @click="openEdit(room)"><Pencil />编辑</button><button class="delete" @click="removeRoom(room)"><Trash2 />删除</button></div></td>
            </tr>
            <tr v-if="!adminStore.rooms.length"><td colspan="7" class="approval-empty">暂无教室数据</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showForm" class="crud-overlay" @click.self="showForm = false">
      <form class="crud-dialog room-crud-dialog" @submit.prevent="saveRoom">
        <div class="crud-dialog-head"><div><h2>{{ editingId ? '编辑教室' : '新增教室' }}</h2><p>填写教室基本资料。</p></div><button type="button" class="icon-btn" @click="showForm = false"><X /></button></div>
        <div class="crud-form-grid">
          <label>教室名称<input v-model.trim="form.name" required></label><label>楼宇<input v-model.trim="form.building"></label>
          <label>座位数<input v-model.number="form.seats" type="number" min="0" required></label><label>所属单位<input v-model.trim="form.audience"></label>
          <label>管理员<input v-model.trim="form.administrator"></label><label>联系电话<input v-model.trim="form.phone"></label>
          <label class="full">教室简介<textarea v-model.trim="form.intro" rows="3"></textarea></label>
        </div>
        <div class="crud-dialog-actions"><button type="button" class="secondary" @click="showForm = false">取消</button><button class="primary" type="submit">保存</button></div>
      </form>
    </div>
  </section>
</template>
