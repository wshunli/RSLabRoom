<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  Activity, CalendarClock, CalendarDays, CalendarRange,
  Clock, DoorOpen, ListChecks, Trophy, User, Users,
} from '@lucide/vue'
import { api } from '../../api'
import type { AdminStats } from '../../api'
import type { Room } from '../../types'
import { periods } from '../../data'
import StatCard from '../../components/StatCard.vue'

const rooms = ref<Room[]>([])
const stats = ref<AdminStats | null>(null)
// 今日各机房各时段占用信息，key = `${roomId}-${period}`。
const slotInfo = ref<Map<string, { courseName: string; teacher: string; people: number; software: string }>>(new Map())
const loading = ref(true)
const error = ref('')

const today = (() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
})()

// 三个教学时段的真实时间（分钟）。时段之间的空隙（如午休 12:00–14:00）
// 在时间轴上被折叠掉，按各时段时长比例首尾相接排布。
const PERIOD_TIMES = [
  { start: 8 * 60, end: 12 * 60 }, // 上午
  { start: 14 * 60, end: 18 * 60 }, // 下午
  { start: 18 * 60, end: 22 * 60 }, // 晚上
]
const DAY_START = PERIOD_TIMES[0].start
const DAY_END = PERIOD_TIMES[PERIOD_TIMES.length - 1].end
const TOTAL = PERIOD_TIMES.reduce((sum, p) => sum + (p.end - p.start), 0)
const clock = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// 各时段在轴上的几何位置（首尾相接，无空隙）。
const periodGeo = (() => {
  let acc = 0
  return periods.map((name, i) => {
    const dur = PERIOD_TIMES[i].end - PERIOD_TIMES[i].start
    const geo = {
      name, index: i,
      left: (acc / TOTAL) * 100,
      width: (dur / TOTAL) * 100,
      range: `${clock(PERIOD_TIMES[i].start)}–${clock(PERIOD_TIMES[i].end)}`,
    }
    acc += dur
    return geo
  })
})()

// 真实时间 -> 轴位置百分比（分段线性，跳过时段间隙）。
function timeToPct(min: number) {
  let acc = 0
  for (const p of PERIOD_TIMES) {
    if (min <= p.start) return (acc / TOTAL) * 100
    if (min <= p.end) return ((acc + (min - p.start)) / TOTAL) * 100
    acc += p.end - p.start
  }
  return 100
}

// 当前时间红线，每分钟刷新一次。
const nowMin = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
const refreshNow = () => {
  const d = new Date()
  nowMin.value = d.getHours() * 60 + d.getMinutes()
}
const nowFrac = computed(() => timeToPct(nowMin.value) / 100)
const showNow = computed(() => nowMin.value >= DAY_START && nowMin.value <= DAY_END)
const nowLabel = computed(() => clock(nowMin.value))

const rows = computed(() =>
  rooms.value.map((room) => ({
    room,
    cells: periodGeo.map((g) => ({
      ...g,
      info: slotInfo.value.get(`${room.id}-${g.index}`) || null,
    })),
  })),
)
const usingCount = computed(
  () => rows.value.filter((r) => r.cells.some((c) => c.info)).length,
)

const statCards = computed(() => {
  const s = stats.value
  return [
    {
      label: '本周课时', value: s?.week.hours ?? 0, icon: CalendarRange, tone: 'green',
      note: `${s?.week.count ?? 0} 次排课 · ${s?.week.days ?? 0} 天有课`,
    },
    {
      label: '本月课时', value: s?.month.hours ?? 0, icon: CalendarDays, tone: 'blue',
      note: `${s?.month.count ?? 0} 次 · ${s?.month.rooms ?? 0} 间机房`,
    },
    {
      label: '今日排课', value: s?.today.count ?? 0, icon: CalendarClock, tone: 'purple',
      note: `${s?.today.hours ?? 0} 课时 · ${usingCount.value} 间使用`,
    },
    {
      label: '待审批', value: s?.applications.pending ?? 0, icon: ListChecks, tone: 'orange',
      note: `累计 ${s?.applications.total ?? 0} 份申请`,
    },
  ]
})

const highlights = computed(() => {
  const s = stats.value
  return [
    {
      icon: Trophy, tone: 'gold', label: '本月最常用机房',
      value: s?.topRoom?.name || '—',
      sub: s?.topRoom ? `${s.topRoom.count} 次排课` : '暂无数据',
    },
    {
      icon: Clock, tone: 'blue', label: '本月最忙时段',
      value: s?.busiestPeriod || '—',
      sub: s?.monthLabel || '本月',
    },
    {
      icon: Activity, tone: 'green', label: '本月活跃机房',
      value: `${s?.month.rooms ?? 0} 间`,
      sub: `覆盖 ${s?.month.days ?? 0} 个教学日`,
    },
    {
      icon: Users, tone: 'purple', label: '系统用户',
      value: `${s?.users ?? 0} 人`,
      sub: '管理后台账号',
    },
  ]
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [roomList, data] = await Promise.all([
      api.getAdminRooms().catch(() => [] as Room[]),
      api.getStats(),
    ])
    rooms.value = roomList
    stats.value = data
    const map = new Map<string, { courseName: string; teacher: string; people: number; software: string }>()
    for (const t of data.todayList) {
      map.set(`${t.roomId}-${t.period}`, {
        courseName: t.courseName, teacher: t.teacher, people: t.people, software: t.software,
      })
    }
    slotInfo.value = map
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载概览数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshNow()
  timer = setInterval(refreshNow, 60 * 1000)
  load()
})
onUnmounted(() => timer && clearInterval(timer))
</script>

<template>
  <section class="admin-main">
    <div class="admin-title">
      <div>
        <span class="kicker">DASHBOARD</span>
        <h1>概览</h1>
        <p>机房预约与排课工作量一览。</p>
      </div>
      <span class="date-card">
        <CalendarDays />
        <b>{{ stats?.monthLabel || '本月' }}</b>
        <small>{{ today }}</small>
      </span>
    </div>

    <div class="admin-stats">
      <StatCard
        v-for="c in statCards"
        :key="c.label"
        :label="c.label"
        :value="c.value"
        :note="c.note"
        :icon="c.icon"
        :tone="c.tone"
      />
    </div>

    <div class="highlights">
      <div v-for="h in highlights" :key="h.label" class="highlight">
        <span class="hl-icon" :class="h.tone"><component :is="h.icon" /></span>
        <div>
          <small>{{ h.label }}</small>
          <strong>{{ h.value }}</strong>
          <span class="hl-sub">{{ h.sub }}</span>
        </div>
      </div>
    </div>

    <p v-if="error" class="dashboard-error">{{ error }}</p>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>今日机房占用</h2>
          <p>{{ today }} · {{ usingCount }} / {{ rooms.length }} 间机房有课</p>
        </div>
        <div class="timeline-legend">
          <span><i class="seg p0" />上午</span>
          <span><i class="seg p1" />下午</span>
          <span><i class="seg p2" />晚上</span>
          <span class="now-tag"><i />当前时间</span>
        </div>
      </div>

      <div class="timeline-scroll">
        <div class="timeline-body">
          <!-- 时段表头：上午 / 下午 / 晚上 -->
          <div class="tl-head">
            <span
              v-for="g in periodGeo"
              :key="g.index"
              class="tl-period"
              :class="'p' + g.index"
              :style="{ left: g.left + '%', width: g.width + '%' }"
            >
              <b>{{ g.name }}</b>
              <em>{{ g.range }}</em>
            </span>
          </div>

          <template v-if="loading">
            <div class="tl-row"><div class="tl-room">加载中…</div><div class="tl-track" /></div>
          </template>
          <template v-else-if="!rooms.length">
            <div class="tl-row"><div class="tl-room">暂无机房</div><div class="tl-track" /></div>
          </template>
          <div v-else v-for="r in rows" :key="r.room.id" class="tl-row">
            <div class="tl-room">
              <strong>{{ r.room.name }}</strong>
              <small>{{ r.room.building }} · {{ r.room.seats }} 座</small>
            </div>
            <div class="tl-track">
              <span
                v-for="c in r.cells"
                :key="c.index"
                class="tl-seg"
                :class="[c.info ? 'busy' : 'free', 'p' + c.index]"
                :style="{ left: c.left + '%', width: c.width + '%' }"
                :title="c.info
                  ? `${c.name} ${c.range}｜${c.info.courseName || '已占用'}${c.info.teacher ? '·' + c.info.teacher : ''}`
                  : `${c.name} ${c.range}｜空闲`"
              >
                <template v-if="c.info">
                  <b>{{ c.info.courseName || '已占用' }}</b>
                  <em>
                    <User :size="9" v-if="c.info.teacher" />{{ c.info.teacher }}
                    <template v-if="c.info.people"> · {{ c.info.people }}人</template>
                  </em>
                </template>
              </span>
            </div>
          </div>

          <!-- 当前时间红线，跨越表头与所有行 -->
          <div
            v-if="showNow && rooms.length"
            class="tl-now"
            :style="{ left: 'calc(160px + (100% - 160px) * ' + nowFrac + ')' }"
          >
            <span class="tl-now-label">{{ nowLabel }}</span>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
