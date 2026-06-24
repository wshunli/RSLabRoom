// 新后端 API 入口。所有业务接口统一使用 /api 前缀，连接历史系统 hall 数据库。
// 历史库（表结构、数据、hall 目录内容）保持不变，本服务只做读写适配。

import { createHash } from 'node:crypto'
import cors from 'cors'
import express from 'express'

import { serverConfig } from './config.js'
import { ping, query, queryOne } from './db.js'
import { rowToRoom } from './rooms.js'
import { issueToken, requireAdmin, revokeToken } from './auth.js'
import {
  PERIOD_NAMES,
  currentWeek,
  dayIndexOf,
  formatDate,
  parseDate,
  periodToTag,
  slotDate,
  weekRange,
} from './time.js'

const app = express()
app.use(cors())
app.use(express.json())

const md5 = (text) => createHash('md5').update(String(text)).digest('hex')

// 统一包装异步路由的错误处理。
const wrap = (handler) => (req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error(`[api] ${req.method} ${req.path}`, err.message)
    res.status(503).json({ error: '数据库暂时不可用', detail: err.message })
  })
}

// ---- 配置（console 表） -----------------------------------------------------

async function loadConsole() {
  const rows = await query('SELECT name, value FROM console')
  const map = {}
  for (const row of rows) map[row.name] = row.value
  return map
}

// GET /api/config —— 首页所需的学期与联系人信息。
app.get('/api/config', wrap(async (_req, res) => {
  const c = await loadConsole()
  const begtime = c.begtime || formatDate(new Date())
  const totalWeeks = Number(c.week || 0)
  const week = currentWeek(begtime)
  res.json({
    semesterStart: begtime,
    totalWeeks,
    currentWeek: Math.min(Math.max(week, 1), totalWeeks || week),
    contact: { name: c.lianxiren || '', phone: c.lianxidianhua || '' },
  })
}))

// ---- 机房（class 表） -------------------------------------------------------

// GET /api/rooms —— 机房列表。
app.get('/api/rooms', wrap(async (_req, res) => {
  // 历史代码会忽略 cid=611 的脏数据，这里同样排除。
  const rows = await query('SELECT cid, cname, cintro FROM class WHERE cid <> 611 ORDER BY cname, cid')
  res.json(rows.map(rowToRoom))
}))

// ---- 一周占用情况（borrow 表） ---------------------------------------------

// GET /api/availability?week=N —— 指定教学周的占用时段。
// 返回 busySlots: ["roomId-day-period", ...]，与前端 RoomRow 的键一致（day 0=周日）。
app.get('/api/availability', wrap(async (req, res) => {
  const c = await loadConsole()
  const begtime = c.begtime || formatDate(new Date())
  const totalWeeks = Number(c.week || 0)
  const week = Number(req.query.week) || currentWeek(begtime)
  const { start, end } = weekRange(begtime, week)

  const rows = await query(
    'SELECT bid, btime, bname, bperson, tag, bclassid FROM borrow WHERE btime >= ? AND btime <= ? AND status = 1',
    [start, end],
  )

  const slots = []
  const busySlots = []
  for (const row of rows) {
    const day = dayIndexOf(begtime, week, row.btime)
    if (day < 0 || day > 6) continue
    const period = Number(row.tag) - 1
    const key = `${row.bclassid}-${day}-${period}`
    busySlots.push(key)
    slots.push({
      key,
      bid: row.bid,
      roomId: row.bclassid,
      day,
      period,
      courseName: row.bname,
      teacher: row.bperson,
      date: String(row.btime).slice(0, 10),
    })
  }

  res.json({ week, totalWeeks, range: { start, end }, busySlots, slots })
}))

// ---- 提交申请（borrow + submit 表） ----------------------------------------

// POST /api/applications
// body: { applicantName, phone, attendees, courseName, requiredSoftware, remarks,
//         slots: [{ roomId, week, day, period }] }
app.post('/api/applications', wrap(async (req, res) => {
  const {
    applicantName, phone, attendees, courseName,
    requiredSoftware = '', remarks = '', slots = [],
  } = req.body || {}

  if (!applicantName || !phone || !courseName || !Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: '缺少必要字段或未选择时段' })
  }

  const c = await loadConsole()
  const begtime = c.begtime || formatDate(new Date())

  // 同一次提交共用一个 btimeid / stimeid（时间戳 + 随机数），对齐历史实现。
  const groupId = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  const people = String(attendees ?? '')

  for (const slot of slots) {
    const date = slot.date || slotDate(begtime, Number(slot.week), Number(slot.day))
    const tag = periodToTag(slot.period)
    await query(
      `INSERT INTO borrow
        (btimeid, bperson, bname, btime, tag, bclassid, status, bphone, bsoftware, bnumer, bmore)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [groupId, applicantName, courseName, date, tag, Number(slot.roomId), phone, requiredSoftware, people, remarks],
    )
  }

  await query(
    `INSERT INTO submit
      (stimeid, sperson, sphone, ssoftware, snumer, sname, smore, sstatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [groupId, applicantName, phone, requiredSoftware, people, courseName, remarks],
  )

  res.status(201).json({ id: groupId, slots: slots.length, state: 'pending' })
}))

// ---- 管理员登录（user 表） -------------------------------------------------

// POST /api/admin/login —— body: { username, password }
app.post('/api/admin/login', wrap(async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: '请输入管理员账号和密码' })
  }
  const row = await queryOne('SELECT username, upwd FROM user WHERE username = ?', [username])
  if (!row || row.upwd !== md5(password)) {
    return res.status(401).json({ error: '账号或密码错误' })
  }
  const token = issueToken(username)
  res.json({ token, user: { username, displayName: username } })
}))

// POST /api/admin/logout
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const header = req.headers.authorization || ''
  revokeToken(header.slice(7))
  res.json({ ok: true })
})

// ---- 申请审批（submit + borrow 表） ----------------------------------------

const STATE_BY_CODE = { 0: 'pending', 1: 'approved' }

// 把某个 stimeid 下的 borrow 行汇总为可读的“详细信息”。
async function buildDetails(stimeid) {
  const rows = await query(
    `SELECT b.btime, b.tag, b.bclassid, c.cname
       FROM borrow b LEFT JOIN class c ON b.bclassid = c.cid
      WHERE b.btimeid = ? ORDER BY b.btime, b.tag`,
    [stimeid],
  )
  return rows.map((r) => {
    const room = rowToRoom({ cid: r.bclassid, cname: r.cname || '', cintro: '' })
    return `${room.name || '机房' + r.bclassid} · ${String(r.btime).slice(0, 10)} · ${PERIOD_NAMES[r.tag - 1] || ''}`
  })
}

// GET /api/admin/applications?status=pending|approved|all
app.get('/api/admin/applications', requireAdmin, wrap(async (req, res) => {
  const status = String(req.query.status || 'all')
  let sql = 'SELECT sid, stimeid, sperson, sphone, ssoftware, snumer, sname, smore, sstatus FROM submit'
  const params = []
  if (status === 'pending') { sql += ' WHERE sstatus = 0' }
  else if (status === 'approved') { sql += ' WHERE sstatus = 1' }
  sql += ' ORDER BY sid DESC'

  const rows = await query(sql, params)
  const result = []
  for (const row of rows) {
    const details = await buildDetails(row.stimeid)
    result.push({
      id: row.stimeid,
      sid: row.sid,
      applicant: row.sperson,
      phone: row.sphone,
      requiredSoftware: row.ssoftware,
      people: Number(row.snumer) || 0,
      details: details.join('；'),
      detailList: details,
      courseName: row.sname,
      remarks: row.smore,
      state: STATE_BY_CODE[row.sstatus] || 'pending',
    })
  }
  res.json(result)
}))

// POST /api/admin/applications/:id/approve —— 通过（含时段冲突检查，对齐历史 access 逻辑）。
app.post('/api/admin/applications/:id/approve', requireAdmin, wrap(async (req, res) => {
  const id = req.params.id
  const slots = await query('SELECT btime, bclassid, tag FROM borrow WHERE btimeid = ?', [id])

  for (const slot of slots) {
    const conflict = await queryOne(
      `SELECT b.bname, b.bperson, b.btime, c.cname
         FROM borrow b LEFT JOIN class c ON b.bclassid = c.cid
        WHERE b.status = 1 AND b.btime = ? AND b.bclassid = ? AND b.tag = ?`,
      [String(slot.btime).slice(0, 10), slot.bclassid, slot.tag],
    )
    if (conflict) {
      return res.status(409).json({
        error: '操作失败，该时间段已存在已通过课程',
        conflict: {
          courseName: conflict.bname,
          teacher: conflict.bperson,
          date: String(conflict.btime).slice(0, 10),
          room: conflict.cname,
        },
      })
    }
  }

  await query('UPDATE borrow SET status = 1 WHERE btimeid = ?', [id])
  await query('UPDATE submit SET sstatus = 1 WHERE stimeid = ?', [id])
  res.json({ id, state: 'approved' })
}))

// POST /api/admin/applications/:id/reject —— 驳回/撤销（历史库无独立“驳回”态，置回 0）。
app.post('/api/admin/applications/:id/reject', requireAdmin, wrap(async (req, res) => {
  const id = req.params.id
  await query('UPDATE borrow SET status = 0 WHERE btimeid = ?', [id])
  await query('UPDATE submit SET sstatus = 0 WHERE stimeid = ?', [id])
  res.json({ id, state: 'pending' })
}))

// DELETE /api/admin/applications/:id —— 删除申请及其占用。
app.delete('/api/admin/applications/:id', requireAdmin, wrap(async (req, res) => {
  const id = req.params.id
  await query('DELETE FROM borrow WHERE btimeid = ?', [id])
  await query('DELETE FROM submit WHERE stimeid = ?', [id])
  res.json({ id, deleted: true })
}))

// ---- 系统设置（console 表） -------------------------------------------------

// GET /api/admin/settings
app.get('/api/admin/settings', requireAdmin, wrap(async (_req, res) => {
  const c = await loadConsole()
  const beg = parseDate(c.begtime || formatDate(new Date()))
  res.json({
    startYear: beg.getFullYear(),
    startMonth: beg.getMonth() + 1,
    startDay: beg.getDate(),
    semesterWeeks: Number(c.week || 0),
    contactName: c.lianxiren || '',
    contactPhone: c.lianxidianhua || '',
  })
}))

// PUT /api/admin/settings
// body: { startYear, startMonth, startDay, semesterWeeks, contactName, contactPhone }
app.put('/api/admin/settings', requireAdmin, wrap(async (req, res) => {
  const { startYear, startMonth, startDay, semesterWeeks, contactName, contactPhone } = req.body || {}
  const begtime = `${startYear}-${startMonth}-${startDay}`

  const upsert = async (name, value) => {
    const existing = await queryOne('SELECT name FROM console WHERE name = ?', [name])
    if (existing) await query('UPDATE console SET value = ? WHERE name = ?', [String(value), name])
    else await query('INSERT INTO console (name, value) VALUES (?, ?)', [name, String(value)])
  }

  await upsert('begtime', begtime)
  await upsert('week', semesterWeeks)
  await upsert('lianxiren', contactName)
  await upsert('lianxidianhua', contactPhone)
  res.json({ ok: true })
}))

// ---- 占位接口（历史库无对应表，保留参数供后续接入） ------------------------

// 用户管理：历史库仅有管理员账号表（user），无普通用户档案。
// 这里从 submit 表中聚合申请人作为只读占位列表；启用/停用/删除无法持久化。
app.get('/api/admin/users', requireAdmin, wrap(async (_req, res) => {
  const rows = await query(
    'SELECT sperson, sphone, MIN(sid) AS sid FROM submit GROUP BY sperson, sphone ORDER BY sid',
  )
  res.json(rows.map((r) => ({
    id: r.sid,
    name: r.sperson,
    phone: r.sphone,
    unit: '—',        // 占位：历史库未存储单位
    role: '教师',      // 占位：历史库未存储角色
    enabled: true,    // 占位：无启用状态字段
    placeholder: true,
  })))
}))

// 机房排期规则：历史库按日期逐条存 borrow，无“每周/单周/双周”重复规则表。
// 接口保留参数，当前不持久化，返回占位说明。
app.get('/api/admin/schedules', requireAdmin, (_req, res) => {
  res.json({ rules: [], placeholder: true, note: '历史库无排期规则表，前端使用占位数据。' })
})
app.post('/api/admin/schedules', requireAdmin, (req, res) => {
  // 期望 body: { courseName, roomId, weekday, period, startWeek, endWeek, recurrence }
  res.status(202).json({ accepted: true, persisted: false, rule: req.body, placeholder: true })
})
app.delete('/api/admin/schedules/:id', requireAdmin, (req, res) => {
  res.status(202).json({ accepted: true, persisted: false, id: req.params.id, placeholder: true })
})

// ---- 健康检查 ---------------------------------------------------------------

app.get('/api/health', wrap(async (_req, res) => {
  let db = false
  try { db = await ping() } catch { db = false }
  res.json({ ok: true, db })
}))

app.listen(serverConfig.port, () => {
  console.log(`[api] RSLabRoom backend listening on http://localhost:${serverConfig.port}`)
  console.log('[api] /api 前缀；数据库凭据见 src/config.js 默认值（可用环境变量覆盖）。')
})
