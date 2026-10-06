// Helper tampilan yang dipakai banyak halaman agar warna badge, label
// prioritas, dan format angka konsisten di seluruh aplikasi.

import { DEPENDENCY_TYPE_LABELS } from '../data/taskSchema.js'

export const STATUS_TONE = {
  Selesai: 'success',
  Berjalan: 'primary',
  'Belum Mulai': 'secondary',
  Tertunda: 'warning',
}

export const PRIORITY_TONE = {
  Rendah: 'secondary',
  Sedang: 'primary',
  Tinggi: 'warning',
  Kritis: 'purple',
}

export function toneOf(map, value) {
  return map[value] ?? 'secondary'
}

export function statusTone(status) {
  return toneOf(STATUS_TONE, status)
}

export function priorityTone(priority) {
  return toneOf(PRIORITY_TONE, priority)
}

// Inisial untuk avatar (maks. 2 huruf).
export function initials(name) {
  return String(name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// "FS", "SS + 2h", "FS - 3h" untuk badge dependensi.
export function dependencyLabel(dependency) {
  const type = dependency?.type ?? 'FS'
  const lag = Number(dependency?.lag) || 0
  const base = DEPENDENCY_TYPE_LABELS[type] ?? DEPENDENCY_TYPE_LABELS.FS
  if (lag === 0) return base
  return `${base} ${lag > 0 ? '+' : '-'} ${Math.abs(lag)}h`
}

// Label ringkas untuk badge dependensi (mis. "FS+2").
export function dependencyShortLabel(dependency) {
  const type = dependency?.type ?? 'FS'
  const lag = Number(dependency?.lag) || 0
  if (lag === 0) return type
  return `${type}${lag > 0 ? '+' : ''}${lag}`
}

// "3 hari kerja" / "1 hari kerja".
export function dayLabel(days) {
  const value = Number(days) || 0
  return `${value} hari kerja`
}
