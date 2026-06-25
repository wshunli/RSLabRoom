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

type ApprovalRequest = BookingRequest & { detailList: string[] }

const requests = ref<ApprovalRequest[]>([])
const selectedRequest = ref<ApprovalRequest | null>(null)

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'
const appStatus = ref<StatusFilter>('all')
const appPage = ref(1)
const appPageSize = ref(15)
const appTotal = ref(0)
const appLoading = ref(false)
const appError = ref('')
const jumpPage = ref('')
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
]
const statusLabels: Record<RequestState, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
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
    await loadApplications()
  } catch (err) {
    alert(err instanceof Error ? err.message : '操作失败')
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
}

function closeDetail() {
  selectedRequest.value = null
}

onMounted(() => {
  loadApplications()
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
          <input v-model.trim="filters.courseName" maxlength="50" placeholder="输入课程名称">
        </label>
        <label>
          <span>按任课老师查询</span>
          <input v-model.trim="filters.teacher" maxlength="20" placeholder="输入任课老师">
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
                  <button v-if="request.state !== 'rejected'" class="reject" title="驳回" @click="updateRequest(request.id, 'rejected')"><X />驳回</button>
                  <button class="delete" title="删除" @click="deleteRequest(request.id)"><Trash2 />删除</button>
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
          <button class="icon-btn" aria-label="关闭" @click="closeDetail"><X /></button>
        </div>
        <ul class="approval-detail-list">
          <li><UserRound :size="16" /><span>申请人</span><strong>{{ selectedRequest.applicant }}</strong></li>
          <li><Phone :size="16" /><span>联系电话</span><strong>{{ selectedRequest.phone || '—' }}</strong></li>
          <li><BookOpen :size="16" /><span>课程名称</span><strong>{{ selectedRequest.courseName || '—' }}</strong></li>
          <li><Monitor :size="16" /><span>需要软件</span><strong>{{ selectedRequest.requiredSoftware || '—' }}</strong></li>
          <li><Users :size="16" /><span>学生人数</span><strong>{{ selectedRequest.people }}</strong></li>
          <li><FileText :size="16" /><span>备注</span><strong>{{ selectedRequest.remarks || '—' }}</strong></li>
        </ul>
        <div class="approval-slot-section">
          <div class="approval-slot-title"><Clock3 :size="16" /><span>预约时段</span></div>
          <div class="approval-slot-list">
            <span v-for="detail in selectedRequest.detailList" :key="detail">{{ detail }}</span>
            <span v-if="!selectedRequest.detailList.length">{{ selectedRequest.details || '—' }}</span>
          </div>
        </div>
        <div class="approval-detail-footer">
          <span class="status" :class="selectedRequest.state">{{ statusLabels[selectedRequest.state] }}</span>
          <div class="approval-actions">
            <button v-if="selectedRequest.state === 'pending'" class="approve" title="通过" @click="updateRequest(selectedRequest.id, 'approved'); closeDetail()"><Check />通过</button>
            <button v-if="selectedRequest.state !== 'rejected'" class="reject" title="驳回" @click="updateRequest(selectedRequest.id, 'rejected'); closeDetail()"><X />驳回</button>
            <button class="delete" title="删除" @click="deleteRequest(selectedRequest.id); closeDetail()"><Trash2 />删除</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
