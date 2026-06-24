import { useMemo, useState } from 'react'
import {
  Bell, Building2, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, DoorOpen, LayoutDashboard, ListChecks, LogOut,
  MapPin, Menu, Monitor, Search, Settings2, ShieldCheck, Sparkles,
  Users, X,
} from 'lucide-react'

type SlotState = 'free' | 'busy' | 'selected'
type Room = { id: number; name: string; building: string; seats: number; audience: string; equipment: string[] }
type RequestState = 'pending' | 'approved' | 'rejected'
type BookingRequest = { id: string; applicant: string; unit: string; room: string; date: string; period: string; purpose: string; people: number; state: RequestState }

const days = [
  { week: '周一', date: '06/22' }, { week: '周二', date: '06/23' }, { week: '周三', date: '06/24' },
  { week: '周四', date: '06/25' }, { week: '周五', date: '06/26' }, { week: '周六', date: '06/27' },
]
const periods = ['上午', '下午', '晚上']
const rooms: Room[] = [
  { id: 1, name: '318 机房', building: '信息学部 5 号楼', seats: 52, audience: '遥感学院', equipment: ['图形工作站', '投影', '空调'] },
  { id: 2, name: '325 机房', building: '信息学部 5 号楼', seats: 48, audience: '遥感学院', equipment: ['高性能电脑', '投影', '空调'] },
  { id: 3, name: '221 机房', building: '信息学部 5 号楼', seats: 48, audience: '遥感学院', equipment: ['双屏工位', '投影', '空调'] },
  { id: 4, name: '220 机房', building: '信息学部 5 号楼', seats: 48, audience: '本科生院', equipment: ['教学终端', '投影', '空调'] },
  { id: 5, name: '201 机房', building: '附 3 楼', seats: 81, audience: '本科生院', equipment: ['大容量机房', '电子白板', '空调'] },
  { id: 6, name: '202 机房', building: '附 3 楼', seats: 42, audience: '本科生院', equipment: ['教学终端', '投影', '空调'] },
]

const busySeed = new Set(['1-0-0','1-0-1','1-1-0','1-1-1','1-2-1','1-2-2','1-3-0','1-3-1','1-4-0','1-4-1','1-5-0','1-5-1',
  '2-0-1','2-1-1','2-2-1','2-3-1','2-4-1','2-5-1','3-0-0','3-0-1','3-1-0','3-1-1','3-2-1','3-2-2','3-3-0','3-3-1','3-4-0','3-4-1','3-5-0','3-5-1',
  '5-0-0','5-0-1','5-1-0','5-1-1','5-2-2','5-3-0','5-3-1','5-4-0','5-4-1','5-5-0','5-5-1'])

const initialRequests: BookingRequest[] = [
  { id: 'AP2026062108', applicant: '陈雨欣', unit: '遥感科学与技术系', room: '318 机房', date: '2026-06-25', period: '晚上 18:00–22:00', purpose: '遥感影像处理课程小组实验', people: 36, state: 'pending' },
  { id: 'AP2026062107', applicant: '李明泽', unit: '测绘工程系', room: '202 机房', date: '2026-06-26', period: '下午 14:00–18:00', purpose: '本科生创新项目数据处理', people: 28, state: 'pending' },
  { id: 'AP2026062006', applicant: '王老师', unit: '空间信息工程系', room: '201 机房', date: '2026-06-23', period: '上午 08:00–12:00', purpose: 'GIS 开发课程补充实验', people: 64, state: 'approved' },
]

function App() {
  const [mode, setMode] = useState<'user' | 'admin'>('user')
  const [mobileNav, setMobileNav] = useState(false)
  return <div className="app-shell">
    <Header mode={mode} onMode={setMode} mobileNav={mobileNav} onMenu={() => setMobileNav(v => !v)} />
    {mode === 'user' ? <UserPortal /> : <AdminPortal />}
    <footer><span>© 2026 武汉大学遥感信息工程学院实验教学中心</span><span>服务电话：027-6877 0000</span></footer>
  </div>
}

function Header({ mode, onMode, mobileNav, onMenu }: { mode: 'user'|'admin'; onMode: (v:'user'|'admin')=>void; mobileNav:boolean; onMenu:()=>void }) {
  return <header className="topbar">
    <div className="brand-mark"><Building2 size={24}/></div>
    <div className="brand-copy"><strong>实验教学中心</strong><span>机房预约与管理平台</span></div>
    <nav className={mobileNav ? 'open' : ''}>
      <button className={mode === 'user' ? 'active' : ''} onClick={() => onMode('user')}>预约大厅</button>
      <button className={mode === 'admin' ? 'active' : ''} onClick={() => onMode('admin')}>管理工作台</button>
      <button>使用指南</button>
    </nav>
    <div className="top-actions"><button className="icon-btn" aria-label="通知"><Bell size={19}/><i /></button><span className="avatar">珞</span><span className="user-name">张同学</span></div>
    <button className="menu-btn" onClick={onMenu} aria-label="菜单">{mobileNav ? <X/> : <Menu/>}</button>
  </header>
}

function UserPortal() {
  const [query, setQuery] = useState('')
  const [capacity, setCapacity] = useState('全部容量')
  const [selected, setSelected] = useState<{room:Room; day:number; period:number}|null>(null)
  const [submitted, setSubmitted] = useState(false)
  const filtered = useMemo(() => rooms.filter(r => (r.name + r.building).includes(query) && (capacity === '全部容量' || r.seats >= Number(capacity))), [query, capacity])
  return <main>
    <section className="hero">
      <div><div className="eyebrow"><Sparkles size={15}/> 让教学空间更好用</div><h1>找到合适的机房，<br/><em>现在就能预约。</em></h1><p>实时查看实验教学中心机房使用情况，在线提交申请，审批进度随时可查。</p></div>
      <div className="hero-stats">
        <div><span className="stat-icon mint"><DoorOpen/></span><strong>7</strong><small>开放机房</small></div>
        <div><span className="stat-icon amber"><Clock3/></span><strong>36</strong><small>本周空闲时段</small></div>
        <div><span className="stat-icon lilac"><ListChecks/></span><strong>2</strong><small>我的进行中申请</small></div>
      </div>
    </section>

    <section className="content-section">
      <div className="section-heading"><div><span className="kicker">ROOM AVAILABILITY</span><h2>本周机房安排</h2><p>点击空闲时段即可发起预约申请</p></div><div className="week-switch"><button><ChevronLeft size={17}/></button><span><CalendarDays size={17}/>2026.06.21 — 06.27 <b>第 17 周</b></span><button><ChevronRight size={17}/></button></div></div>
      <div className="filters"><label><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索机房或楼宇"/></label><select value={capacity} onChange={e=>setCapacity(e.target.value)}><option>全部容量</option><option value="50">50 人以上</option><option value="70">70 人以上</option></select><button className="my-bookings"><ListChecks size={17}/> 我的申请</button><div className="legend"><span><i className="free"/>空闲</span><span><i className="busy"/>已占用</span></div></div>
      <div className="room-list">
        {filtered.map(room => <RoomRow room={room} key={room.id} onSelect={(day, period) => {setSelected({room, day, period});setSubmitted(false)}} />)}
      </div>
      {!filtered.length && <div className="empty"><Search/><h3>没有找到符合条件的机房</h3><p>试试调整关键词或容量筛选。</p></div>}
    </section>
    {selected && <BookingDrawer value={selected} submitted={submitted} onClose={()=>setSelected(null)} onSubmit={()=>setSubmitted(true)} />}
  </main>
}

function RoomRow({room, onSelect}:{room:Room;onSelect:(day:number,period:number)=>void}) {
  return <article className="room-row">
    <div className="room-meta"><div className="room-number">{String(room.id).padStart(2,'0')}</div><div><h3>{room.name}</h3><p><MapPin size={14}/>{room.building}</p><div className="room-tags"><span><Users size={13}/>{room.seats} 座</span><span>{room.audience}</span></div></div></div>
    <div className="schedule"><div className="schedule-head"><span className="period-label">时段</span>{days.map(d=><span key={d.date}><b>{d.week}</b><small>{d.date}</small></span>)}</div>
      {periods.map((period,p)=><div className="schedule-line" key={period}><span className="period-label">{period}</span>{days.map((_,d)=>{const busy=busySeed.has(`${room.id}-${d}-${p}`);return <button key={d} disabled={busy} className={busy?'busy':'free'} onClick={()=>onSelect(d,p)}>{busy?<><span>课程</span><small>遥感原理</small></>:<><span>空闲</span><small>可预约</small></>}</button>})}</div>)}
    </div>
  </article>
}

function BookingDrawer({value, submitted, onClose, onSubmit}:{value:{room:Room;day:number;period:number};submitted:boolean;onClose:()=>void;onSubmit:()=>void}) {
  return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="drawer">
    <div className="drawer-head"><div><span className="kicker">NEW REQUEST</span><h2>提交机房借用申请</h2></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    {submitted ? <div className="success"><span><Check/></span><h2>申请已提交</h2><p>申请编号 AP2026062409，管理员审核后会通过站内消息通知你。</p><button className="primary" onClick={onClose}>完成</button></div> : <form onSubmit={e=>{e.preventDefault();onSubmit()}}>
      <div className="chosen-slot"><Monitor/><div><strong>{value.room.name} · {days[value.day].week} {periods[value.period]}</strong><span>{value.room.building}　{days[value.day].date}　{periods[value.period] === '上午' ? '08:00–12:00' : periods[value.period] === '下午' ? '14:00–18:00' : '18:00–22:00'}</span></div></div>
      <label>借用事由<textarea required defaultValue="课程实验与小组实践" /></label>
      <div className="form-grid"><label>使用人数<input type="number" min="1" max={value.room.seats} defaultValue="30" required/></label><label>联系电话<input type="tel" defaultValue="138 0000 0000" required/></label></div>
      <label>指导教师<input defaultValue="王老师" required/></label>
      <label className="checkline"><input type="checkbox" required/>我已阅读并同意《实验教学中心机房使用规范》</label>
      <button className="primary submit" type="submit">确认提交申请 <ChevronRight size={18}/></button>
    </form>}
  </aside></div>
}

function AdminPortal() {
  const [requests, setRequests] = useState(initialRequests)
  const [active, setActive] = useState('概览')
  const pending = requests.filter(r=>r.state==='pending').length
  const update = (id:string,state:RequestState)=>setRequests(v=>v.map(r=>r.id===id?{...r,state}:r))
  const nav = [{name:'概览',icon:LayoutDashboard},{name:'申请审批',icon:ListChecks,badge:pending},{name:'机房排期',icon:CalendarDays},{name:'机房管理',icon:DoorOpen},{name:'系统设置',icon:Settings2}]
  return <div className="admin-layout"><aside className="admin-side"><div className="admin-label">管理控制台</div>{nav.map(n=>{const Icon=n.icon;return <button key={n.name} className={active===n.name?'active':''} onClick={()=>setActive(n.name)}><Icon size={18}/>{n.name}{n.badge?<b>{n.badge}</b>:null}</button>})}<div className="side-bottom"><button><CircleHelp size={18}/>帮助与反馈</button><button><LogOut size={18}/>退出管理端</button></div></aside>
    <section className="admin-main"><div className="admin-title"><div><span className="kicker">ADMIN CONSOLE</span><h1>下午好，王老师</h1><p>这里是实验教学中心今天的运行概况。</p></div><span className="date-card"><CalendarDays/><b>2026 年 6 月 24 日</b><small>星期三 · 第 17 周</small></span></div>
      <div className="admin-stats"><Stat label="待审批申请" value={pending} note="较昨日新增 2 条" icon={ListChecks} tone="orange"/><Stat label="今日使用机房" value="5 / 7" note="71% 使用率" icon={Monitor} tone="blue"/><Stat label="今日课程" value="12" note="涉及 436 名学生" icon={Users} tone="green"/><Stat label="本周异常" value="0" note="全部设备运行正常" icon={ShieldCheck} tone="purple"/></div>
      <div className="admin-grid"><section className="panel requests-panel"><div className="panel-head"><div><h2>最新借用申请</h2><p>按提交时间倒序</p></div><button className="text-btn">查看全部 <ChevronRight size={16}/></button></div>
        <div className="request-list">{requests.map(r=><div className="request" key={r.id}><span className="request-avatar">{r.applicant[0]}</span><div className="request-main"><div><strong>{r.applicant}</strong><small>{r.unit} · {r.id}</small></div><p>{r.purpose}</p><div className="request-meta"><span><DoorOpen/>{r.room}</span><span><CalendarDays/>{r.date}</span><span><Clock3/>{r.period}</span><span><Users/>{r.people} 人</span></div></div><div className="request-actions">{r.state==='pending'?<><button className="approve" onClick={()=>update(r.id,'approved')}><Check/>通过</button><button className="reject" onClick={()=>update(r.id,'rejected')}><X/>驳回</button></>:<span className={`status ${r.state}`}>{r.state==='approved'?'已通过':'已驳回'}</span>}</div></div>)}</div>
      </section><section className="panel today-panel"><div className="panel-head"><div><h2>今日机房动态</h2><p>当前使用状态</p></div><span className="live"><i/>实时</span></div>{rooms.slice(0,5).map((r,i)=><div className="today-room" key={r.id}><span className={`room-state ${i<3?'using':'idle'}`}><Monitor/></span><div><strong>{r.name}</strong><small>{i<3?'遥感原理与应用课程设计':'当前空闲'}</small></div><span>{i<3?(i===2?'18:00 结束':'12:00 结束'):'可预约'}</span></div>)}</section></div>
    </section></div>
}

function Stat({label,value,note,icon:Icon,tone}:{label:string;value:number|string;note:string;icon:typeof Monitor;tone:string}) { return <div className="admin-stat"><span className={`stat-icon ${tone}`}><Icon/></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></div> }

export default App
