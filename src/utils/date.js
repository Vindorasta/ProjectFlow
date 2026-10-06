// Helper tanggal ProjectFlow.
//
// Semua tanggal aplikasi disimpan sebagai string "YYYY-MM-DD" (format native
// <input type="date">). String tanggal diparse sebagai tengah malam UTC agar
// tidak bergeser karena zona waktu, sehingga perhitungan hari (Gantt chart,
// durasi kerja, jalur kritis) selalu konsisten.

// Batas iterasi sebagai pengaman agar loop kalender tidak pernah berjalan tanpa henti.
const MAX_ITERATION = 4000
const MS_PER_DAY = 1000 * 60 * 60 * 24
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

// Parse tanggal apa pun (string ISO, Date, atau timestamp) menjadi Date UTC
// pada pukul 00:00. Mengembalikan null bila tidak valid.
export function parseISODate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    const match = ISO_RE.exec(trimmed)
    if (match) {
      const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const fallback = new Date(trimmed)
    if (Number.isNaN(fallback.getTime())) return null
    return new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()))
  }

  return null
}

export function isValidDate(value) {
  return parseISODate(value) !== null
}

// Ubah Date menjadi string "YYYY-MM-DD".
export function toISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Tanggal hari ini sebagai "YYYY-MM-DD" (mengikuti kalender lokal pengguna).
export function todayISO() {
  const now = new Date()
  return toISODate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())))
}

// Geser tanggal sejumlah hari kalender.
export function addDays(value, amount) {
  const base = parseISODate(value)
  if (!base) return ''
  return toISODate(new Date(base.getTime() + amount * MS_PER_DAY))
}

// Selisih hari kalender antara dua tanggal (bisa negatif).
export function diffInDays(start, end) {
  const a = parseISODate(start)
  const b = parseISODate(end)
  if (!a || !b) return 0
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY)
}

// Durasi inklusif: 1 hari untuk tanggal yang sama.
export function durationInDays(start, end) {
  const span = diffInDays(start, end)
  return span + 1
}

// Indeks hari dalam seminggu: 0 = Minggu ... 6 = Sabtu.
export function dayOfWeek(value) {
  const date = parseISODate(value)
  return date ? date.getUTCDay() : null
}

// Daftar tanggal dari start sampai end (inklusif). Dibatasi agar aman.
export function eachDay(start, end, limit = MAX_ITERATION) {
  const from = parseISODate(start)
  const to = parseISODate(end)
  if (!from || !to || to.getTime() < from.getTime()) return []

  const days = []
  let cursor = from
  while (cursor.getTime() <= to.getTime() && days.length < limit) {
    days.push(toISODate(cursor))
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
  }
  return days
}

// Awal minggu (Senin) untuk tanggal yang diberikan.
export function startOfWeek(value) {
  const date = parseISODate(value)
  if (!date) return ''
  const weekday = date.getUTCDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  return toISODate(new Date(date.getTime() + offset * MS_PER_DAY))
}

// Tanggal terkecil / terbesar dari sekumpulan tanggal yang valid.
export function minDate(values) {
  const valid = values.filter(isValidDate)
  return valid.length ? valid.reduce((acc, cur) => (cur < acc ? cur : acc)) : ''
}

export function maxDate(values) {
  const valid = values.filter(isValidDate)
  return valid.length ? valid.reduce((acc, cur) => (cur > acc ? cur : acc)) : ''
}

export function formatDate(value) {
  const date = parseISODate(value)
  if (!date) return '-'
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Versi ringkas untuk header Gantt (mis. "05 Sep").
export function formatDayLabel(value) {
  const date = parseISODate(value)
  if (!date) return ''
  return String(date.getUTCDate()).padStart(2, '0')
}

export function formatMonthLabel(value) {
  const date = parseISODate(value)
  if (!date) return '-'
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Jarak hari dari "hari ini" (positif = akan datang, negatif = sudah lewat).
export function daysFromToday(value) {
  const date = parseISODate(value)
  if (!date) return null
  const today = parseISODate(todayISO())
  return Math.round((date.getTime() - today.getTime()) / MS_PER_DAY)
}

export function isOverdue(value) {
  const remaining = daysFromToday(value)
  return remaining !== null && remaining < 0
}

// Digit nama hari sesuai getUTCDay (0 = Minggu).
export const DAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
]

export const DAY_SHORT_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
