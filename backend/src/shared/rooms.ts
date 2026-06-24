interface RoomRow {
  cid: number
  cname: string
  cintro: string
}

function parseName(cname: string) {
  const withoutIndex = String(cname).replace(/^（\d+）/, '').trim()
  const label = withoutIndex.replace(/[（(][^（()）]*[)）]\s*$/, '').trim()
  const match = label.match(/^(.*?楼|附\s*\d+)[\-－]?\s*(\d+.*)$/)
  if (!match) return { building: '', name: label, label: withoutIndex }
  return {
    building: match[1].includes('楼') ? match[1] : `${match[1]}楼`,
    name: match[2],
    label: withoutIndex,
  }
}

function parseIntro(cintro: string) {
  const text = String(cintro || '').replace(/\r/g, '')
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const intro = lines[0] && !/^机位|^管理员|^联系电话/.test(lines[0]) ? lines[0] : undefined
  const administrator = text.match(/管理员[:：]\s*([^\n]+)/)?.[1].trim()
  const phone = text.match(/联系电话[:：]\s*([^\n]+)/)?.[1].trim()
  const introSeats = Number(text.match(/机位[:：]\s*(\d+)/)?.[1] || 0)
  return { intro, administrator, phone, introSeats }
}

export function rowToRoom(row: RoomRow) {
  const { building, name, label } = parseName(row.cname)
  const { intro, administrator, phone, introSeats } = parseIntro(row.cintro)
  const seatMatch = String(row.cname).match(/(\d+)\s*座/)
  const audienceMatch = String(row.cname).match(/座[,，]\s*([^()（）]+)[)）]/)
  return {
    id: row.cid,
    name: name || label,
    building,
    seats: seatMatch ? Number(seatMatch[1]) : introSeats,
    audience: audienceMatch?.[1].trim() || '实验教学中心',
    equipment: [] as string[],
    intro,
    administrator,
    phone,
  }
}
