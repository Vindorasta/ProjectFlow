// Skema + normalisasi pengaturan aplikasi (LocalStorage key "settings").
// Berisi kalender kerja (hari kerja per minggu, jam kerja, hari libur) dan
// mata uang tampilan. Semua field punya default sehingga data lama tetap aman.

import { isValidDate } from '../utils/date.js'
import { normalizeHolidays, normalizeWorkDays } from '../utils/workCalendar.js'

export const CURRENCY_OPTIONS = ['IDR', 'USD', 'EUR', 'MYR', 'SGD']

export const DEFAULT_SETTINGS = {
  workDays: [1, 2, 3, 4, 5], // Senin - Jumat
  workHoursPerDay: 8,
  currency: 'IDR',
  holidays: [],
}

export function normalizeSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {}
  const workDays = normalizeWorkDays(source.workDays)
  const hoursRaw = Number(source.workHoursPerDay)
  const workHoursPerDay =
    Number.isFinite(hoursRaw) && hoursRaw > 0 && hoursRaw <= 24
      ? Math.round(hoursRaw * 100) / 100
      : DEFAULT_SETTINGS.workHoursPerDay

  return {
    workDays: workDays.size > 0 ? [...workDays].sort((a, b) => a - b) : [...DEFAULT_SETTINGS.workDays],
    workHoursPerDay,
    currency: CURRENCY_OPTIONS.includes(source.currency)
      ? source.currency
      : DEFAULT_SETTINGS.currency,
    holidays: normalizeHolidays(source.holidays),
  }
}

// Format biaya menjadi mata uang settings (dengan pemisah ribuan id-ID).
export function formatCurrency(value, currency = 'IDR') {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '-'

  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${Math.trunc(amount).toLocaleString('id-ID')}`
  }
}

// Cek cepat sebelum menyimpan hari libur baru.
export function validateHoliday(date, name, existingHolidays = []) {
  const errors = {}
  if (!isValidDate(date)) {
    errors.date = 'Tanggal hari libur tidak valid.'
  } else if (existingHolidays.some((holiday) => holiday.date === date)) {
    errors.date = 'Tanggal tersebut sudah terdaftar sebagai hari libur.'
  }
  if (!String(name ?? '').trim()) {
    errors.name = 'Nama hari libur wajib diisi.'
  }
  return Object.keys(errors).length > 0 ? errors : null
}
