// 与后端约定一致的静态枚举。
// period 索引 0/1/2 -> 上午/下午/晚上；weekday 索引 0=周日 ... 6=周六。

export const periods = ['上午', '下午', '晚上']

export const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 判断某周起始日（YYYY-MM-DD）后的第 day 天是否已过期（含当天，仅比较日期，不含时分）。
// 当天也视为已过期，不再可预约。
export function isDayPast(rangeStart: string, day: number): boolean {
  if (!rangeStart) return false
  const [y, m, d] = rangeStart.split('-').map(Number)
  const target = new Date(y, m - 1, d + day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return target.getTime() <= today.getTime()
}
