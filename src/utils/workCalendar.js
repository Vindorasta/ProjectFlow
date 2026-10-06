// Kalender kerja ProjectFlow.
//
// Satu-satunya sumber kebenaran untuk pertanyaan "apakah tanggal ini hari kerja?".
// Diakai oleh Gantt chart (penandaan hari non-kerja), halaman Kalender Kerja,
// dan mesin penjadwalan / jalur kritis (src/utils/schedule.js).

import { addDays, dayOfWeek, diffInDays, isValidDate } from './date.js'

// Batas iterasi sebagai pengaman agar loop tidak berjalan tanpa henti.
const MAX_ITERATION = 4000

// Buang nilai di luar rentang 0-6 (0 = Minggu) dan kembalikan sebagai Set.
export function normalizeWorkDays(workDays) {
  const list = Array.isArray(workDays) ? workDays : []
  return new Set(
    list
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
  )
}

// Buang hari libur yang tidak valid / duplikat agar data lama tidak merusak halaman.
export function normalizeHolidays(holidays) {
  const list = Array.isArray(holidays) ? holidays : []
  const seen = new Map()

  list.forEach((item) => {
    if (typeof item === 'string') {
      if (isValidDate(item) && !seen.has(item)) {
        seen.set(item, { date: item, name: 'Hari libur' })
      }
      return
    }
    if (item && typeof item === 'object' && isValidDate(item.date)) {
      const date = item.date
      if (!seen.has(date)) {
        seen.set(date, { date, name: String(item.name ?? 'Hari libur') || 'Hari libur' })
      }
    }
  })

  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date))
}

// Kalender kerja siap pakai.
// Perilaku: bila tidak ada hari kerja yang dicentang, semua hari dianggap
// hari kerja (fallback aman) alih-alih membuat aplikasi tidak bisa menghitung.
export function createWorkCalendar(settings = {}) {
  const workDays = normalizeWorkDays(settings.workDays)
  const fallbackAllDays = workDays.size === 0
  const holidays = normalizeHolidays(settings.holidays)
  const holidayMap = new Map(holidays.map((holiday) => [holiday.date, holiday]))

  const isHoliday = (value) => holidayMap.has(value)

  const isWorkdayIndex = (value) => {
    const weekday = dayOfWeek(value)
    if (weekday === null) return false
    return fallbackAllDays ? true : workDays.has(weekday)
  }

  // Hari libur selalu non-kerja, apa pun pengaturan hari kerja mingguannya.
  const isWorkingDay = (value) => isValidDate(value) && !isHoliday(value) && isWorkdayIndex(value)

  const nextWorkingDay = (value) => {
    if (!isValidDate(value)) return ''
    let cursor = value
    for (let i = 0; i < MAX_ITERATION; i += 1) {
      if (isWorkingDay(cursor)) return cursor
      cursor = addDays(cursor, 1)
    }
    return addDays(value, 7)
  }

  const previousWorkingDay = (value) => {
    if (!isValidDate(value)) return ''
    let cursor = value
    for (let i = 0; i < MAX_ITERATION; i += 1) {
      if (isWorkingDay(cursor)) return cursor
      cursor = addDays(cursor, -1)
    }
    return addDays(value, -7)
  }

  // Jumlah hari kerja di antara dua tanggal (inklusive kedua ujung).
  // Bila salah satu tanggal bukan hari kerja, tetap dihitung sebagai rentang kalender.
  const workingDaysBetween = (start, end) => {
    if (!isValidDate(start) || !isValidDate(end)) return 0
    const span = diffInDays(start, end)
    if (span <= 0) return isWorkingDay(start) ? 1 : 0

    const base = isWorkingDay(start) ? start : nextWorkingDay(start)
    const limit = isWorkingDay(end) ? end : previousWorkingDay(end)
    if (!base || !limit) return 0
    if (diffInDays(base, limit) < 0) return 0

    let count = 0
    let cursor = base
    for (let i = 0; i < MAX_ITERATION; i += 1) {
      if (diffInDays(cursor, limit) < 0) break
      if (isWorkingDay(cursor)) count += 1
      cursor = addDays(cursor, 1)
    }
    return count
  }

  // Geser sejumlah hari kerja ke depan. count = 1 berarti hari kerja pertama
  // pada tanggal tersebut (atau setelahnya bila tanggal itu non-kerja).
  const addWorkingDays = (start, count) => {
    if (!isValidDate(start)) return ''
    const steps = Math.max(0, Math.floor(Number(count) || 0))
    let cursor = nextWorkingDay(start)
    let remaining = steps - 1
    let guard = 0

    while (remaining > 0 && guard < MAX_ITERATION) {
      cursor = addDays(cursor, 1)
      if (isWorkingDay(cursor)) remaining -= 1
      guard += 1
    }
    return cursor
  }

  const subtractWorkingDays = (start, count) => {
    if (!isValidDate(start)) return ''
    const steps = Math.max(0, Math.floor(Number(count) || 0))
    let cursor = previousWorkingDay(start)
    let remaining = steps - 1
    let guard = 0

    while (remaining > 0 && guard < MAX_ITERATION) {
      cursor = addDays(cursor, -1)
      if (isWorkingDay(cursor)) remaining -= 1
      guard += 1
    }
    return cursor
  }

  // Durasi kerja sebuah tugas: minimal 1 hari (mis. milestone).
  const taskDuration = (start, end) => {
    const calendarDays = isValidDate(start) && isValidDate(end) ? diffInDays(start, end) + 1 : 0
    if (calendarDays <= 0) return 0
    const working = workingDaysBetween(start, end)
    return Math.max(1, working > 0 ? working : calendarDays)
  }

  return {
    workDays,
    holidays,
    holidayMap,
    isHoliday,
    isWorkingDay,
    isWorkdayIndex,
    nextWorkingDay,
    previousWorkingDay,
    workingDaysBetween,
    addWorkingDays,
    subtractWorkingDays,
    taskDuration,
  }
}
