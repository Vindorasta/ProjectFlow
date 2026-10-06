// Skema & aturan validasi data proyek.
// Dipisah dari komponen agar file komponen tetap hanya mengekspor komponen
// (mengikuti pola src/context/dataContext.js) dan Fast Refresh tetap jalan.

import { isValidDate } from '../utils/date.js'

// Nilai status harus konsisten dengan seed data dan pemetaan warna badge.
export const PROJECT_STATUS_OPTIONS = ['Belum Mulai', 'Berjalan', 'Tertunda', 'Selesai']

export const PROJECT_COLOR_OPTIONS = [
  '#0d6efd',
  '#198754',
  '#6f42c1',
  '#fd7e14',
  '#dc3545',
  '#20c997',
]

// Lengkapi field proyek yang belum ada (data lama / LocalStorage tidak lengkap)
// dan buang entri yang sama sekali tidak valid.
export function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null

  const startDate = isValidDate(project.startDate) ? project.startDate : ''
  const endDate = isValidDate(project.endDate) ? project.endDate : startDate
  const progressRaw = Number(project.progress)
  const progress = Number.isFinite(progressRaw)
    ? Math.min(100, Math.max(0, Math.trunc(progressRaw)))
    : 0

  return {
    id: String(project.id ?? ''),
    name: String(project.name ?? '').trim(),
    code: String(project.code ?? '').trim(),
    description: String(project.description ?? ''),
    startDate,
    endDate,
    status: PROJECT_STATUS_OPTIONS.includes(project.status) ? project.status : 'Belum Mulai',
    progress,
    color: typeof project.color === 'string' && project.color ? project.color : '#0d6efd',
  }
}

export function normalizeProjects(projects) {
  const list = Array.isArray(projects) ? projects : []
  const seen = new Set()

  return list
    .map(normalizeProject)
    .filter((project) => {
      if (!project || !project.id || !project.name) return false
      if (seen.has(project.id)) return false
      seen.add(project.id)
      return true
    })
}

export function emptyProjectValues() {
  return {
    name: '',
    code: '',
    description: '',
    startDate: '',
    endDate: '',
    progress: '0',
    status: 'Belum Mulai',
    color: '#0d6efd',
  }
}

// Ubah objek proyek menjadi nilai form (selalu string agar cocok dengan input).
export function projectToFormValues(project) {
  return {
    name: project.name ?? '',
    code: project.code ?? '',
    description: project.description ?? '',
    startDate: project.startDate ?? '',
    endDate: project.endDate ?? '',
    progress: String(project.progress ?? 0),
    status: project.status ?? 'Belum Mulai',
    color: project.color ?? '#0d6efd',
  }
}

// Validasi form proyek.
// Mengembalikan objek { field: pesan } bila ada kesalahan, atau null bila valid.
export function validateProject(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Nama proyek wajib diisi.'
  }

  if (!values.startDate) {
    errors.startDate = 'Tanggal mulai wajib diisi.'
  }

  if (!values.endDate) {
    errors.endDate = 'Tanggal selesai wajib diisi.'
  }

  // Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
  // Perbandingan string aman karena format input type="date" adalah YYYY-MM-DD.
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = 'Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.'
  }

  const progress = Number(values.progress)
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    errors.progress = 'Progres harus berupa bilangan bulat antara 0 dan 100.'
  }

  return Object.keys(errors).length > 0 ? errors : null
}