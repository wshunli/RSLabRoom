<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Monitor,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from '@lucide/vue'
import { api } from '../../api'
import type { BookingRequest, RequestState } from '../../types'
import { adminStore } from '../../stores/admin'

type SlotState = RequestState
type ApprovalSlot = { bid: number; label: string; state: SlotState }
type ApprovalRequest = BookingRequest & { detailList: string[]; slotList: ApprovalSlot[] }

const requests = ref<ApprovalRequest[]>([])
const selectedRequest = ref<ApprovalRequest | null>(null)
const editing = ref(false)
const savingEdit = ref(false)
const editForm = ref({ applicant: '', phone: '', courseName: '', requiredSoftware: '', people: 1, remarks: '' })

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'deleted'
const appStatus = ref<StatusFilter>('all')
const appPage = ref(1)
const appPageSize = ref(15)
const appTotal = ref(0)
const appLoading = ref(false)
const appError = ref('')
const jumpPage = ref('')
const applicationFilters = ref<{ teachers: string[]; courses: string[] }>({ teachers: [], courses: [] })
const filters = ref({
  date: '',
  courseName: '',
  teacher: '',
})
const pageSizeOptions = [15, 25, 50, 100]
const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'deleted', label: '已删除' },
]
const statusLabels: Record<RequestState, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  deleted: '已删除',
}

const totalPages = computed(() => Math.max(1, Math.ceil(appTotal.value / appPageSize.value)))
const pageNumbers = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = appPage.value
  let start = Math.max(1, current - 2)
  let end = Math.min(total, current + 2)
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4)
    else start = Math.max(1, end - 4)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function loadApplications() {
  appLoading.value = true
  appError.value = ''
  try {
    const res = await api.getApplications(appStatus.value, appPage.value, appPageSize.value, {
      date: filters.value.date,
      courseName: filters.value.courseName.trim(),
      teacher: filters.value.teacher.trim(),
    })
    if (!res || !Array.isArray(res.items)) {
      throw new Error('接口返回数据格式异常，缺少 items 字段')
    }
    requests.value = res.items.map((item) => ({
      id: item.id,
      applicant: item.applicant,
      phone: item.phone,
      requiredSoftware: item.requiredSoftware,
      people: item.people,
      details: item.details,
      detailList: item.detailList || [],
      slotList: item.slotList || [],
      courseName: item.courseName,
      remarks: item.remarks,
      state: item.state,
    }))
    appTotal.value = res.total ?? 0
    adminStore.pendingTotal = res.pendingTotal ?? 0
  } catch (err) {
    appError.value = err instanceof Error ? err.message : '加载申请数据失败'
    requests.value = []
    appTotal.value = 0
    adminStore.pendingTotal = 0
  } finally {
    appLoading.value = false
  }
}

async function loadApplicationFilters() {
  try {
    const res = await api.getApplicationFilters()
    applicationFilters.value = { teachers: res.teachers || [], courses: res.courses || [] }
  } catch {
    // 候选项加载失败不影响手动输入和模糊查询。
    applicationFilters.value = { teachers: [], courses: [] }
  }
}

function changeStatus(value: StatusFilter) {
  appStatus.value = value
  appPage.value = 1
  loadApplications()
}

function changePage(delta: number) {
  const next = appPage.value + delta
  if (next < 1 || next > totalPages.value) return
  appPage.value = next
  loadApplications()
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  appPage.value = page
  loadApplications()
}

function changePageSize(size: number) {
  appPageSize.value = size
  appPage.value = 1
  loadApplications()
}

function applyFilters() {
  appPage.value = 1
  loadApplications()
}

function resetFilters() {
  filters.value = { date: '', courseName: '', teacher: '' }
  appPage.value = 1
  loadApplications()
}

function doJumpPage() {
  const page = parseInt(jumpPage.value, 10)
  if (isNaN(page) || page < 1 || page > totalPages.value) {
    alert(`请输入 1~${totalPages.value} 之间的页码`)
    return
  }
  appPage.value = page
  jumpPage.value = ''
  loadApplications()
}

async function updateRequest(id: string, state: RequestState) {
  try {
    if (state === 'approved') await api.approveApplication(id)
    else if (state === 'rejected') await api.rejectApplication(id)
    else if (state === 'pending') await api.restoreApplication(id)
    await loadApplications()
  } catch (err) {
    alert(err instanceof Error ? err.message : '操作失败')
  }
}

async function revokeApproval(id: string) {
  try {
    await api.revokeApproval(id)
    await loadApplications()
  } catch (err) {
    alert(err instanceof Error ? err.message : '撤销通过失败')
  }
}

async function deleteRequest(id: string) {
  try {
    await api.deleteApplication(id)
    if (requests.value.length === 1 && appPage.value > 1) appPage.value -= 1
    await loadApplications()
  } catch (err) {
    alert(err instanceof Error ? err.message : '删除失败')
  }
}

function showDetail(request: ApprovalRequest) {
  selectedRequest.value = request
  editing.value = false
  editForm.value = {
    applicant: request.applicant,
    phone: request.phone,
    courseName: request.courseName,
    requiredSoftware: request.requiredSoftware,
    people: request.people,
    remarks: request.remarks,
  }
}

function closeDetail() {
  selectedRequest.value = null
  editing.value = false
}

function startEditing() {
  if (!selectedRequest.value) return
  editForm.value = {
    applicant: selectedRequest.value.applicant,
    phone: selectedRequest.value.phone,
    courseName: selectedRequest.value.courseName,
    requiredSoftware: selectedRequest.value.requiredSoftware,
    people: selectedRequest.value.people,
    remarks: selectedRequest.value.remarks,
  }
  editing.value = true
}

function cancelEditing() {
  editing.value = false
}

async function saveEditing() {
  if (!selectedRequest.value) return
  savingEdit.value = true
  try {
    await api.updateApplication(selectedRequest.value.id, {
      applicantName: editForm.value.applicant,
      phone: editForm.value.phone,
      attendees: editForm.value.people,
      courseName: editForm.value.courseName,
      requiredSoftware: editForm.value.requiredSoftware,
      remarks: editForm.value.remarks,
    })
    selectedRequest.value = {
      ...selectedRequest.value,
      applicant: editForm.value.applicant,
      phone: editForm.value.phone,
      people: editForm.value.people,
      courseName: editForm.value.courseName,
      requiredSoftware: editForm.value.requiredSoftware,
      remarks: editForm.value.remarks,
    }
    editing.value = false
    await loadApplications()
  } catch (err) {
    alert(err instanceof Error ? err.message : '保存申请信息失败')
  } finally {
    savingEdit.value = false
  }
}

async function updateSlot(slot: ApprovalSlot, state: SlotState) {
  if (!selectedRequest.value) return
  try {
    await api.updateApplicationSlot(selectedRequest.value.id, slot.bid, state)
    const res = await api.getApplications(appStatus.value, appPage.value, appPageSize.value, {
      date: filters.value.date, courseName: filters.value.courseName.trim(), teacher: filters.value.teacher.trim(),
    })
    const refreshed = res.items.find((item) => item.id === selectedRequest.value?.id)
    if (refreshed) {
      selectedRequest.value = {
        ...selectedRequest.value,
        state: refreshed.state,
        details: refreshed.details,
        detailList: refreshed.detailList,
        slotList: refreshed.slotList || [],
      }
    }
    await loadApplications()
  } catch (err) {
    alert(err instanceof Error ? err.message : '时段状态更新失败')
  }
}

onMounted(() => {
  loadApplications()
  loadApplicationFilters()
})
</script>

<template>
  <section class="admin-main">
    <div class="admin-title">
      <div><span class="kicker">REQUEST REVIEW</span><h1>申请审批</h1><p>共 {{ appTotal }} 条申请，{{ adminStore.pendingTotal }} 条待处理。</p></div>
      <span class="date-card"><CalendarDays /><b>审批管理员</b><small>管理后台</small></span>
    </div>

    <div class="admin-toolbar">
      <div class="status-tabs">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          :class="{ active: appStatus === opt.value }"
          @click="changeStatus(opt.value)"
        >
          {{ opt.label }}<b v-if="opt.value === 'pending' && adminStore.pendingTotal">{{ adminStore.pendingTotal }}</b>
        </button>
      </div>
      <form class="approval-filters" @submit.prevent="applyFilters">
        <label>
          <span>按时间查询</span>
          <input v-model="filters.date" type="date">
        </label>
        <label>
          <span>按课程名称查询</span>
          <input v-model.trim="filters.courseName" list="approval-course-options" maxlength="50" placeholder="输入或选择课程">
          <datalist id="approval-course-options">
            <option v-for="course in applicationFilters.courses" :key="course" :value="course" />
          </datalist>
        </label>
        <label>
          <span>按任课老师查询</span>
          <input v-model.trim="filters.teacher" list="approval-teacher-options" maxlength="20" placeholder="输入或选择老师">
          <datalist id="approval-teacher-options">
            <option v-for="teacher in applicationFilters.teachers" :key="teacher" :value="teacher" />
          </datalist>
        </label>
        <button class="filter-action primary-filter" type="submit" title="查询"><Search :size="15" />查询</button>
        <button class="filter-action reset-filter" type="button" title="重置" @click="resetFilters"><RotateCcw :size="15" />重置</button>
      </form>
    </div>

    <section class="panel approval-panel">
      <div class="approval-table-wrap">
        <table class="approval-table">
          <thead><tr><th>ID</th><th>姓名</th><th>电话</th><th>需要软件</th><th>学生人数</th><th>详细信息</th><th>课程名称</th><th>备注</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="request in requests" :key="request.id">
              <td class="request-id" data-label="ID"><button class="cell-link mono" @click="showDetail(request)">{{ request.id }}</button></td>
              <td data-label="姓名"><strong>{{ request.applicant }}</strong></td>
              <td class="nowrap" data-label="电话">{{ request.phone }}</td>
              <td data-label="需要软件"><button class="cell-link" @click="showDetail(request)">{{ request.requiredSoftware || '—' }}</button></td>
              <td class="people-count" data-label="学生人数">{{ request.people }}</td>
              <td class="request-detail" data-label="详细信息"><button class="cell-link" @click="showDetail(request)">{{ request.details || '—' }}</button></td>
              <td data-label="课程名称"><button class="cell-link strong" @click="showDetail(request)">{{ request.courseName || '—' }}</button></td>
              <td class="request-note" data-label="备注"><button class="cell-link" @click="showDetail(request)">{{ request.remarks || '—' }}</button></td>
              <td data-label="状态"><span class="status" :class="request.state">{{ statusLabels[request.state] }}</span></td>
              <td data-label="操作">
                <div class="approval-actions">
                  <button class="view-detail" title="查看详情" @click="showDetail(request)"><Eye />详情</button>
                  <button v-if="request.state === 'pending'" class="approve" title="通过" @click="updateRequest(request.id, 'approved')"><Check />通过</button>
                  <button v-if="request.state === 'pending'" class="reject" title="驳回" @click="updateRequest(request.id, 'rejected')"><X />驳回</button>
                  <button v-if="request.state === 'approved'" class="approve" title="撤销通过" @click="revokeApproval(request.id)"><RotateCcw />撤销通过</button>
                  <button v-if="request.state === 'rejected' || request.state === 'deleted'" :class="request.state === 'rejected' ? 'reject' : 'restore'" :title="request.state === 'deleted' ? '撤销删除' : '撤销驳回'" @click="updateRequest(request.id, 'pending')"><RotateCcw />{{ request.state === 'deleted' ? '撤销删除' : '撤销驳回' }}</button>
                  <button v-if="request.state !== 'deleted'" class="delete" title="标记删除" @click="deleteRequest(request.id)"><Trash2 />删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="appLoading"><td colspan="10" class="approval-empty">加载中…</td></tr>
            <tr v-else-if="appError"><td colspan="10" class="approval-empty" style="color:#b34e3c">{{ appError }}</td></tr>
            <tr v-else-if="!requests.length"><td colspan="10" class="approval-empty">暂无申请记录</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <div class="page-size-selector">
          <span class="filter-label">每页</span>
          <select :value="appPageSize" @change="changePageSize(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }} 条</option>
          </select>
        </div>
        <div class="page-controls">
          <button :disabled="appPage <= 1" @click="changePage(-1)"><ChevronLeft :size="16" /><span class="page-btn-text">上一页</span></button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            :class="{ active: appPage === p }"
            @click="goToPage(p)"
          >{{ p }}</button>
          <button :disabled="appPage >= totalPages" @click="changePage(1)"><span class="page-btn-text">下一页</span><ChevronRight :size="16" /></button>
        </div>
        <div class="page-jump" v-if="totalPages > 5">
          <span>跳至</span>
          <input v-model="jumpPage" type="number" :min="1" :max="totalPages" placeholder="页" @keyup.enter="doJumpPage" />
          <button @click="doJumpPage">Go</button>
        </div>
      </div>
    </section>
    <div class="approval-page-summary">第 {{ appPage }} / {{ totalPages }} 页 · 共 {{ appTotal }} 条</div>

    <div v-if="selectedRequest" class="overlay approval-detail-overlay" @mousedown.self="closeDetail">
      <div class="approval-detail-dialog">
        <div class="slot-detail-head">
          <div><span class="kicker">REQUEST DETAIL</span><h3>{{ selectedRequest.courseName || '申请详情' }}</h3></div>
          <div class="approval-detail-head-actions">
            <button v-if="!editing" class="detail-edit-btn" type="button" @click="startEditing"><Pencil :size="14" />编辑</button>
            <button v-else class="detail-edit-btn save" type="button" :disabled="savingEdit" @click="saveEditing">{{ savingEdit ? '保存中…' : '保存' }}</button>
            <button v-if="editing" class="detail-edit-btn cancel" type="button" @click="cancelEditing">取消</button>
            <button class="icon-btn" aria-label="关闭" @click="closeDetail"><X /></button>
          </div>
        </div>
        <ul class="approval-detail-list">
          <li><UserRound :size="16" /><span>申请人</span><input v-if="editing" v-model.trim="editForm.applicant" maxlength="10" required><strong v-else>{{ selectedRequest.applicant }}</strong></li>
          <li><Phone :size="16" /><span>联系电话</span><input v-if="editing" v-model.trim="editForm.phone" maxlength="25" required><strong v-else>{{ selectedRequest.phone || '—' }}</strong></li>
          <li><BookOpen :size="16" /><span>课程名称</span><input v-if="editing" v-model.trim="editForm.courseName" maxlength="50" required><strong v-else>{{ selectedRequest.courseName || '—' }}</strong></li>
          <li><Monitor :size="16" /><span>需要软件</span><input v-if="editing" v-model.trim="editForm.requiredSoftware" maxlength="200"><strong v-else>{{ selectedRequest.requiredSoftware || '—' }}</strong></li>
          <li><Users :size="16" /><span>学生人数</span><input v-if="editing" v-model.number="editForm.people" type="number" min="1" max="9999" required><strong v-else>{{ selectedRequest.people }}</strong></li>
          <li><FileText :size="16" /><span>备注</span><input v-if="editing" v-model.trim="editForm.remarks" maxlength="200"><strong v-else>{{ selectedRequest.remarks || '—' }}</strong></li>
        </ul>
          <div class="approval-slot-section">
          <div class="approval-slot-title"><Clock3 :size="16" /><span>预约时段</span></div>
          <div class="approval-slot-list">
            <div v-for="slot in selectedRequest.slotList" :key="slot.bid" class="approval-slot-row">
              <span class="approval-slot-label">{{ slot.label }}</span>
              <span class="status" :class="slot.state">{{ statusLabels[slot.state] }}</span>
              <div class="approval-actions">
                <button v-if="slot.state === 'approved'" class="approve" title="撤销通过" @click="updateSlot(slot, 'pending')"><RotateCcw />撤销通过</button>
                <button v-else class="approve" title="通过时段" @click="updateSlot(slot, 'approved')"><Check />通过</button>
                <button v-if="slot.state === 'rejected'" class="reject" title="撤销驳回" @click="updateSlot(slot, 'pending')"><RotateCcw />撤销驳回</button>
                <button v-else class="reject" title="驳回时段" @click="updateSlot(slot, 'rejected')"><X />驳回</button>
                <button v-if="slot.state === 'deleted'" class="restore" title="撤销删除" @click="updateSlot(slot, 'pending')"><RotateCcw />撤销删除</button>
                <button v-else class="delete" title="删除时段" @click="updateSlot(slot, 'deleted')"><Trash2 />删除</button>
              </div>
            </div>
            <span v-if="!selectedRequest.slotList.length">{{ selectedRequest.details || '—' }}</span>
          </div>
        </div>
        <div class="approval-detail-footer">
          <span class="status" :class="selectedRequest.state">{{ statusLabels[selectedRequest.state] }}</span>
          <div class="approval-actions">
            <button v-if="selectedRequest.state === 'pending'" class="approve" title="通过" @click="updateRequest(selectedRequest.id, 'approved'); closeDetail()"><Check />通过</button>
            <button v-if="selectedRequest.state === 'pending'" class="reject" title="驳回" @click="updateRequest(selectedRequest.id, 'rejected'); closeDetail()"><X />驳回</button>
            <button v-if="selectedRequest.state === 'approved'" class="approve" title="撤销通过" @click="revokeApproval(selectedRequest.id); closeDetail()"><RotateCcw />撤销通过</button>
            <button v-if="selectedRequest.state === 'rejected' || selectedRequest.state === 'deleted'" :class="selectedRequest.state === 'rejected' ? 'reject' : 'restore'" :title="selectedRequest.state === 'deleted' ? '撤销删除' : '撤销驳回'" @click="updateRequest(selectedRequest.id, 'pending'); closeDetail()"><RotateCcw />{{ selectedRequest.state === 'deleted' ? '撤销删除' : '撤销驳回' }}</button>
            <button v-if="selectedRequest.state !== 'deleted'" class="delete" title="标记删除" @click="deleteRequest(selectedRequest.id); closeDetail()"><Trash2 />删除</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
