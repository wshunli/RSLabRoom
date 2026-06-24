// 把历史 class 表的一行解析为前端 Room 结构。
//
// class.cname 形如：'（5）附3-201机房(81座,本科生院)'、'（1）5号楼318机房(52座,遥感学院)'
// class.cintro 形如：'地理信息与国情监测实验室\r\n机位:52个\r\n管理员: 孙朝晖\r\n联系电话:13707145509'
//
// 设备（equipment）历史库未存储，返回空数组占位，前端可用默认标签兜底。

const DEFAULT_AUDIENCE = '实验教学中心'

function parseName(cname) {
  // 去掉前缀编号 '（5）'
  const withoutIndex = String(cname).replace(/^（\d+）/, '').trim()
  // 去掉末尾的 '(81座,本科生院)' 容量/单位说明
  const label = withoutIndex.replace(/[（(][^（()）]*[)）]\s*$/, '').trim()

  // 拆分楼宇与房间号，尽力而为，失败时整体作为名称。
  let building = ''
  let name = label
  const m = label.match(/^(.*?楼|附\s*\d+)[\-－]?\s*(\d+.*)$/)
  if (m) {
    building = m[1].includes('楼') ? m[1] : `${m[1]}楼`
    name = m[2]
  }
  return { building, name, label: withoutIndex }
}

function parseIntro(cintro) {
  const text = String(cintro || '').replace(/\r/g, '')
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const intro = lines[0] && !/^机位|^管理员|^联系电话/.test(lines[0]) ? lines[0] : undefined

  const adminMatch = text.match(/管理员[:：]\s*([^\n]+)/)
  const phoneMatch = text.match(/联系电话[:：]\s*([^\n]+)/)
  const seatMatch = text.match(/机位[:：]\s*(\d+)/)
  return {
    intro,
    administrator: adminMatch ? adminMatch[1].trim() : undefined,
    phone: phoneMatch ? phoneMatch[1].trim() : undefined,
    introSeats: seatMatch ? Number(seatMatch[1]) : undefined,
  }
}

export function rowToRoom(row) {
  const { building, name, label } = parseName(row.cname)
  const { intro, administrator, phone, introSeats } = parseIntro(row.cintro)

  const seatMatch = String(row.cname).match(/(\d+)\s*座/)
  const audienceMatch = String(row.cname).match(/座[,，]\s*([^()（）]+)[)）]/)

  return {
    id: row.cid,
    name: name || label,
    building: building || '',
    seats: seatMatch ? Number(seatMatch[1]) : introSeats ?? 0,
    audience: audienceMatch ? audienceMatch[1].trim() : DEFAULT_AUDIENCE,
    // 历史库无设备字段，留空占位（接口字段保留）。
    equipment: [],
    intro,
    administrator,
    phone,
  }
}
