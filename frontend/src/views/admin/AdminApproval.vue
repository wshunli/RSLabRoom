<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Trash2, X } from '@lucide/vue'
import { api } from '../../api'
import type { BookingRequest, RequestState } from '../../types'
import { adminStore } from '../../stores/admin'

const requests = ref<BookingRequest[]>([])

type StatusFilter = 'all' | 'pending' | 'approved'
const appStatus = ref<StatusFilter>('all')
const appPage = ref(1)
const appPageSize = ref(10)
const appTotal = ref(0)
const appLoading = ref(false)
const appError = ref('')
const jumpPage = ref('')
const pageSizeOptions = [5, 10, 15, 20]
const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已通过' },
]

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
    const res = await api.getApplications(appStatus.value, appPage.value, appPageSize.value)
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
    </div>

    <section class="panel approval-panel">
      <div class="approval-table-wrap">
        <table class="approval-table">
          <thead><tr><th>ID</th><th>姓名</th><th>电话</th><th>需要软件</th><th>学生人数</th><th>详细信息</th><th>课程名称</th><th>备注</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="request in requests" :key="request.id">
              <td class="request-id">{{ request.id }}</td>
              <td><strong>{{ request.applicant }}</strong></td>
              <td class="nowrap">{{ request.phone }}</td>
              <td>{{ request.requiredSoftware }}</td>
              <td class="people-count">{{ request.people }}</td>
              <td class="request-detail">{{ request.details }}</td>
              <td>{{ request.courseName }}</td>
              <td class="request-note">{{ request.remarks || '—' }}</td>
              <td><span class="status" :class="request.state">{{ request.state === 'approved' ? '已通过' : '待审批' }}</span></td>
              <td>
                <div class="approval-actions">
                  <button v-if="request.state === 'pending'" class="approve" title="通过" @click="updateRequest(request.id, 'approved')"><Check />通过</button>
                  <button v-else class="reject" title="撤销" @click="updateRequest(request.id, 'rejected')"><X />撤销</button>
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
        <span class="page-info">第 {{ appPage }} / {{ totalPages }} 页 · 共 {{ appTotal }} 条</span>
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
  </section>
</template>
