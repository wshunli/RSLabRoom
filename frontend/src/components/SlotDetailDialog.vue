<script setup lang="ts">
import { BookOpen, CalendarDays, Check, Clock3, FileText, MapPin, Monitor, Pencil, Phone, RotateCcw, Trash2, UserRound, Users, X } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { api } from '../api'
import { periods } from '../data'

const props = defineProps<{
  applicationId?: string
  roomName: string
  building?: string
  courseName: string
  teacher?: string
  phone?: string
  date?: string
  dayLabel?: string
  week?: number
  weekLabel?: string
  period: number
}>()
const emit = defineEmits<{ close: [] }>()
const application = ref<Awaited<ReturnType<typeof api.getPublicApplication>> | null>(null)
const applicationLoading = ref(false)
const applicationError = ref('')
const statusLabels = { pending: '待审批', approved: '已通过', rejected: '已驳回', deleted: '已删除' }
const adminMode = ref(typeof window !== 'undefined' && Boolean(sessionStorage.getItem('room-admin-token')))
const editing = ref(false)
const savingEdit = ref(false)
const editForm = ref({ applicant: '', phone: '', courseName: '', requiredSoftware: '', people: 1, remarks: '' })

function copyApplicationToForm() {
  if (!application.value) return
  editForm.value = {
    applicant: application.value.applicant,
    phone: application.value.phone,
    courseName: application.value.courseName,
    requiredSoftware: application.value.requiredSoftware,
    people: application.value.people,
    remarks: application.value.remarks,
  }
}

async function loadApplication() {
  if (!props.applicationId) return
  applicationLoading.value = true
  applicationError.value = ''
  try { application.value = await api.getPublicApplication(props.applicationId) }
  catch (err) { applicationError.value = err instanceof Error ? err.message : '申请详情加载失败' }
  finally { applicationLoading.value = false }
}

onMounted(async () => {
  if (!props.applicationId) return
  await loadApplication()
  copyApplicationToForm()
})

function startEditing() { copyApplicationToForm(); editing.value = true }
function cancelEditing() { editing.value = false }

async function saveEditing() {
  if (!props.applicationId) return
  savingEdit.value = true
  try {
    await api.updateApplication(props.applicationId, {
      applicantName: editForm.value.applicant,
      phone: editForm.value.phone,
      attendees: editForm.value.people,
      courseName: editForm.value.courseName,
      requiredSoftware: editForm.value.requiredSoftware,
      remarks: editForm.value.remarks,
    })
    await loadApplication()
    editing.value = false
  } catch (err) { alert(err instanceof Error ? err.message : '保存申请信息失败') }
  finally { savingEdit.value = false }
}

async function updateApplicationState(state: 'approved' | 'rejected' | 'pending' | 'deleted') {
  if (!props.applicationId) return
  try {
    if (state === 'approved') await api.approveApplication(props.applicationId)
    else if (state === 'rejected') await api.rejectApplication(props.applicationId)
    else if (state === 'pending') await api.restoreApplication(props.applicationId)
    else await api.deleteApplication(props.applicationId)
    await loadApplication()
  } catch (err) { alert(err instanceof Error ? err.message : '申请状态更新失败') }
}

async function revokeApproval() {
  if (!props.applicationId) return
  try { await api.revokeApproval(props.applicationId); await loadApplication() }
  catch (err) { alert(err instanceof Error ? err.message : '撤销通过失败') }
}

async function updateSlot(bid: number, state: 'approved' | 'rejected' | 'pending' | 'deleted') {
  if (!props.applicationId) return
  try { await api.updateApplicationSlot(props.applicationId, bid, state); await loadApplication() }
  catch (err) { alert(err instanceof Error ? err.message : '时段状态更新失败') }
}

const periodTimes = ['08:00–12:00', '14:00–18:00', '18:00–22:00']
</script>

<template>
  <div v-if="applicationId" class="overlay approval-detail-overlay" @mousedown.self="emit('close')">
    <div class="approval-detail-dialog">
      <div class="slot-detail-head">
        <div><span class="kicker">REQUEST DETAIL</span><h3>{{ application?.courseName || courseName || '申请详情' }}</h3></div>
        <div v-if="adminMode" class="approval-detail-head-actions">
          <button v-if="!editing" class="detail-edit-btn" type="button" @click="startEditing"><Pencil :size="14" />编辑</button>
          <button v-else class="detail-edit-btn save" type="button" :disabled="savingEdit" @click="saveEditing">{{ savingEdit ? '保存中…' : '保存' }}</button>
          <button v-if="editing" class="detail-edit-btn cancel" type="button" @click="cancelEditing">取消</button>
          <button class="icon-btn" aria-label="关闭" @click="emit('close')"><X /></button>
        </div>
        <button v-else class="icon-btn" aria-label="关闭" @click="emit('close')"><X /></button>
      </div>
      <p v-if="applicationLoading" class="slot-detail-loading">正在加载申请详情…</p>
      <p v-else-if="applicationError" class="slot-detail-error">{{ applicationError }}</p>
      <template v-else-if="application">
        <ul class="approval-detail-list">
          <li><UserRound :size="16" /><span>申请人</span><input v-if="adminMode && editing" v-model.trim="editForm.applicant" maxlength="10" required><strong v-else>{{ application.applicant }}</strong></li>
          <li><Phone :size="16" /><span>联系电话</span><input v-if="adminMode && editing" v-model.trim="editForm.phone" maxlength="25" required><strong v-else>{{ application.phone || '—' }}</strong></li>
          <li><BookOpen :size="16" /><span>课程名称</span><input v-if="adminMode && editing" v-model.trim="editForm.courseName" maxlength="50" required><strong v-else>{{ application.courseName || '—' }}</strong></li>
          <li><Monitor :size="16" /><span>需要软件</span><input v-if="adminMode && editing" v-model.trim="editForm.requiredSoftware" maxlength="200"><strong v-else>{{ application.requiredSoftware || '—' }}</strong></li>
          <li><Users :size="16" /><span>学生人数</span><input v-if="adminMode && editing" v-model.number="editForm.people" type="number" min="1" max="9999" required><strong v-else>{{ application.people }}</strong></li>
          <li><FileText :size="16" /><span>备注</span><input v-if="adminMode && editing" v-model.trim="editForm.remarks" maxlength="200"><strong v-else>{{ application.remarks || '—' }}</strong></li>
        </ul>
        <div v-if="adminMode" class="approval-slot-section">
          <div class="approval-slot-title"><Clock3 :size="16" /><span>预约时段</span></div>
          <div class="approval-slot-list">
            <div v-for="slot in application.slotList" :key="slot.bid" class="approval-slot-row">
              <span class="approval-slot-label">{{ slot.label }}</span>
              <span class="status" :class="slot.state">{{ statusLabels[slot.state] }}</span>
              <div class="approval-actions">
                <button v-if="slot.state === 'approved'" class="approve" title="撤销通过" @click="updateSlot(slot.bid, 'pending')"><RotateCcw />撤销通过</button>
                <button v-else class="approve" title="通过时段" @click="updateSlot(slot.bid, 'approved')"><Check />通过</button>
                <button v-if="slot.state === 'rejected'" class="reject" title="撤销驳回" @click="updateSlot(slot.bid, 'pending')"><RotateCcw />撤销驳回</button>
                <button v-else class="reject" title="驳回时段" @click="updateSlot(slot.bid, 'rejected')"><X />驳回</button>
                <button v-if="slot.state === 'deleted'" class="restore" title="撤销删除" @click="updateSlot(slot.bid, 'pending')"><RotateCcw />撤销删除</button>
                <button v-else class="delete" title="删除时段" @click="updateSlot(slot.bid, 'deleted')"><Trash2 />删除</button>
              </div>
            </div>
          </div>
        </div>
        <div class="approval-detail-footer">
          <span class="status" :class="application.state">{{ statusLabels[application.state] }}</span>
          <div v-if="adminMode" class="approval-actions">
            <button v-if="application.state === 'pending'" class="approve" title="通过" @click="updateApplicationState('approved')"><Check />通过</button>
            <button v-if="application.state === 'pending'" class="reject" title="驳回" @click="updateApplicationState('rejected')"><X />驳回</button>
            <button v-if="application.state === 'approved'" class="approve" title="撤销通过" @click="revokeApproval"><RotateCcw />撤销通过</button>
            <button v-if="application.state === 'rejected' || application.state === 'deleted'" :class="application.state === 'rejected' ? 'reject' : 'restore'" :title="application.state === 'deleted' ? '撤销删除' : '撤销驳回'" @click="updateApplicationState('pending')"><RotateCcw />{{ application.state === 'deleted' ? '撤销删除' : '撤销驳回' }}</button>
            <button v-if="application.state !== 'deleted'" class="delete" title="标记删除" @click="updateApplicationState('deleted')"><Trash2 />删除</button>
          </div>
        </div>
      </template>
    </div>
  </div>
  <div v-else class="overlay slot-detail-overlay" @mousedown.self="emit('close')">
    <div class="slot-detail">
      <div class="slot-detail-head">
        <div><span class="kicker">OCCUPIED</span><h3>{{ courseName }}</h3></div>
        <button class="icon-btn" aria-label="关闭" @click="emit('close')"><X /></button>
      </div>
      <ul class="slot-detail-list">
        <li><BookOpen :size="16" /><span>课程名称</span><strong>{{ courseName }}</strong></li>
        <li v-if="teacher"><UserRound :size="16" /><span>授课教师</span><strong>{{ teacher }}</strong></li>
        <li v-if="phone"><Phone :size="16" /><span>联系手机</span><strong>{{ phone }}</strong></li>
        <li><MapPin :size="16" /><span>使用机房</span><strong>{{ roomName }}<template v-if="building"> · {{ building }}</template></strong></li>
        <li><CalendarDays :size="16" /><span>上课日期</span><strong><template v-if="week">{{ weekLabel ?? `第 ${week} 周` }}　</template>{{ dayLabel }}<template v-if="date">　{{ date }}</template></strong></li>
        <li><Clock3 :size="16" /><span>上课时段</span><strong>{{ periods[period] }}　{{ periodTimes[period] }}</strong></li>
      </ul>
    </div>
  </div>
</template>
