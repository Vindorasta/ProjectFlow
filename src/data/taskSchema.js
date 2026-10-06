// Skema, normalisasi, dan validasi data tugas.
//
// File ini sengaja dipisah dari komponen agar komponen tetap hanya mengekspor
// komponen (pola yang sama seperti src/data/projectSchema.js) dan Fast Refresh
// tetap berjalan dengan baik.
//
// Semua field baru bersifat opsional: `normalizeTask()` providing default
// sehingga data lama di LocalStorage tetap bisa dibuka tanpa error.

import { durationInDays, isValidDate } from '../utils/date.js'

// Nilai status disamakan dengan status proyek agar konsisten di seluruh aplikasi.
export const TASK_STATUS_OPTIONS = ['Belum Mulai', 'Berjalan', 'Tertunda', 'Selesai']

export const TASK_PRIORITY_OPTIONS = ['Rendah', 'Sedang', 'Tinggi', 'Kritis']

// Jenis hubungan antar aktivitas.
// FS = Finish to Start, SS = Start to Start, FF = Finish to Finish, SF = Start to Finish.
export const DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF']

export const DEPENDENCY_TYPE_LABELS = {
  FS: 'Finish to Start',
  SS: 'Start to Start',
  FF: 'Finish to Finish',
  SF: 'Start to Finish',
}

export const DEFAULT_DEPENDENCY_TYPE = 'FS'

// Ubah satu entri dependensi menjadi bentuk baku { id, type, lag }.
// Menerima data lama (string id) maupun data rusak agar tidak membuat crash.
export function normalizeDependency(value) {
  if (typeof value === 'string') {
    return value.trim()
      ? { id: value.trim(), type: DEFAULT_DEPENDENCY_TYPE, lag: 0 }
      : null
  }

  if (!value || typeof value !== 'object') return null
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  if (!id) return null

  const type = DEPENDENCY_TYPES.includes(value.type) ? value.type : DEFAULT_DEPENDENCY_TYPE
  const lagRaw = Number(value.lag)
  const lag = Number.isFinite(lagRaw) ? Math.trunc(lagRaw) : 0

  return { id, type, lag }
}

export function normalizeDependencies(list) {
  const source = Array.isArray(list) ? list : []
  const seen = new Map()

  source.forEach((item) => {
    const dependency = normalizeDependency(item)
    if (dependency && !seen.has(dependency.id)) {
      seen.set(dependency.id, dependency)
    }
  })

  return [...seen.values()]
}

// Lengkapi field tugas yang belum ada (data lama / LocalStorage tidak lengkap).
export function normalizeTask(task) {
  if (!task || typeof task !== 'object') return null

  const startDate = isValidDate(task.startDate) ? task.startDate : ''
  const endDate = isValidDate(task.endDate) ? task.endDate : startDate
  const progressRaw = Number(task.progress)
  const progress = Number.isFinite(progressRaw)
    ? Math.min(100, Math.max(0, Math.trunc(progressRaw)))
    : 0

  return {
    id: String(task.id ?? ''),
    projectId: String(task.projectId ?? ''),
    code: String(task.code ?? '').trim(),
    name: String(task.name ?? '').trim(),
    description: String(task.description ?? ''),
    parentTaskId: task.parentTaskId ? String(task.parentTaskId) : null,
    assigneeId: task.assigneeId ? String(task.assigneeId) : null,
    startDate,
    endDate,
    status: TASK_STATUS_OPTIONS.includes(task.status) ? task.status : 'Belum Mulai',
    priority: TASK_PRIORITY_OPTIONS.includes(task.priority) ? task.priority : 'Sedang',
    progress,
    dependencies: normalizeDependencies(task.dependencies),
    isMilestone: Boolean(task.isMilestone),
  }
}

export function normalizeTasks(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  const seen = new Set()

  return list
    .map(normalizeTask)
    .filter((task) => {
      if (!task || !task.id || !task.name) return false
      if (seen.has(task.id)) return false
      seen.add(task.id)
      return true
    })
    .map((task) => ({
      ...task,
      code: task.code ? task.code.toUpperCase() : '',
    }))
}

export function emptyTaskValues() {
  return {
    name: '',
    code: '',
    description: '',
    projectId: '',
    parentTaskId: '',
    assigneeId: '',
    startDate: '',
    endDate: '',
    progress: '0',
    status: 'Belum Mulai',
    priority: 'Sedang',
    isMilestone: false,
  }
}

// Ubah objek tugas menjadi nilai form (semua field kontrol menjadi string/boolean).
export function taskToFormValues(task) {
  const normalized = normalizeTask(task) ?? emptyTaskValues()
  return {
    name: normalized.name,
    code: normalized.code,
    description: normalized.description,
    projectId: normalized.projectId,
    parentTaskId: normalized.parentTaskId ?? '',
    assigneeId: normalized.assigneeId ?? '',
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    progress: String(normalized.progress),
    status: normalized.status,
    priority: normalized.priority,
    isMilestone: normalized.isMilestone,
  }
}

// Durasi kerja tugas dalam hari (fallback ke hari kalender bila tanggal kosong).
export function taskDuration(task) {
  if (!task) return 0
  if (!isValidDate(task.startDate) || !isValidDate(task.endDate)) return 0
  return Math.max(1, durationInDays(task.startDate, task.endDate))
}

// Validasi form tugas.
// Mengembalikan objek { field: pesan } bila ada kesalahan, atau null bila valid.
// options: { tasks, taskId } -> dipakai untuk memeriksa kode & parent task agar unik.
export function validateTask(values, projects, options = {}) {
  const errors = {}
  const { tasks = [], taskId = null } = options

  if (!values.name.trim()) {
    errors.name = 'Nama tugas wajib diisi.'
  }

  const isMilestone = Boolean(values.isMilestone)

  const code = (values.code ?? '').trim().toUpperCase()
  const duplicateCode = tasks.some(
    (task) =>
      task.id !== taskId &&
      task.code &&
      task.code.toUpperCase() === code &&
      (!values.projectId || task.projectId === values.projectId),
  )
  if (code && duplicateCode) {
    errors.code = 'Kode aktivitas sudah dipakai aktivitas lain pada proyek ini.'
  }

  // Proyek induk wajib dipilih dan harus benar-benar ada.
  if (!values.projectId) {
    errors.projectId = 'Proyek induk wajib dipilih.'
  } else if (Array.isArray(projects) && !projects.some((p) => p.id === values.projectId)) {
    errors.projectId = 'Proyek yang dipilih tidak ditemukan.'
  }

  if (!values.startDate) {
    errors.startDate = 'Tanggal mulai wajib diisi.'
  } else if (!isValidDate(values.startDate)) {
    errors.startDate = 'Tanggal mulai tidak valid.'
  }

  if (!values.endDate) {
    errors.endDate = 'Tanggal selesai wajib diisi.'
  } else if (!isValidDate(values.endDate)) {
    errors.endDate = 'Tanggal selesai tidak valid.'
  }

  // Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
  // Perbandingan string aman karena format input type="date" adalah YYYY-MM-DD.
  if (
    isValidDate(values.startDate) &&
    isValidDate(values.endDate) &&
    values.endDate < values.startDate
  ) {
    errors.endDate = 'Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.'
  }

  if (values.parentTaskId) {
    if (values.parentTaskId === taskId) {
      errors.parentTaskId = 'Aktivitas tidak dapat menjadi subtask dari dirinya sendiri.'
    } else {
      const parent = tasks.find((task) => task.id === values.parentTaskId)
      if (!parent) {
        errors.parentTaskId = 'Induk aktivitas yang dipilih tidak ditemukan.'
      } else if (parent.projectId !== values.projectId) {
        errors.parentTaskId = 'Induk aktivitas harus berasal dari proyek yang sama.'
      }
    }
  }

  const progress = Number(values.progress)
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    errors.progress = 'Progres harus berupa bilangan bulat antara 0 dan 100.'
  }

  // Milestone adalah titik dadakan tanpa pekerjaan: lasts satu hari.
  if (isMilestone && isValidDate(values.startDate) && values.startDate !== values.endDate) {
    errors.endDate = 'Milestone hanya memiliki satu tanggal, samakan dengan tanggal mulai.'
  }

  return Object.keys(errors).length > 0 ? errors : null
}
