// Helper hierarki tugas untuk Gantt chart.
//
// TaskForm/taskSchema menyimpan hubungan induk-subtask lewat `parentTaskId`.
// Modul ini mengubah daftar tugas datar menjadi baris berurutan (urutan
// berdasarkan tanggal mulai) tanpa menghasilkan duplikasi dan aman terhadap
// data rusak (mis. parentTaskId menunjuk ke tugas yang tidak ada / siklus).

import { normalizeTask } from '../data/taskSchema.js'

const ROOT_KEY = '__root__'

function compareTasks(a, b) {
  const startA = a.startDate || '9999-12-31'
  const startB = b.startDate || '9999-12-31'
  if (startA !== startB) return startA.localeCompare(startB)
  if (a.code !== b.code) return (a.code || 'zz').localeCompare(b.code || 'zz')
  return a.name.localeCompare(b.name)
}

/**
 * Ubah daftar tugas menjadi baris Gantt.
 * Setiap baris: { task, depth, hasChildren, childCount }.
 */
export function buildTaskRows(tasks) {
  const list = (Array.isArray(tasks) ? tasks : [])
    .map(normalizeTask)
    .filter((task) => task && task.id)

  const byId = new Map(list.map((task) => [task.id, task]))
  const childrenMap = new Map()

  list.forEach((task) => {
    const parentId = task.parentTaskId && byId.has(task.parentTaskId) ? task.parentTaskId : null
    const key = parentId ?? ROOT_KEY
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key).push(task)
  })

  childrenMap.forEach((children) => children.sort(compareTasks))

  const rows = []
  const visited = new Set()

  const walk = (key, depth) => {
    const children = childrenMap.get(key) ?? []
    children.forEach((task) => {
      if (visited.has(task.id)) return
      visited.add(task.id)
      const ownChildren = childrenMap.get(task.id) ?? []
      rows.push({
        task,
        depth,
        hasChildren: ownChildren.length > 0,
        childCount: ownChildren.length,
      })
      walk(task.id, depth + 1)
    })
  }

  walk(ROOT_KEY, 0)

  // Tugas yang tidak dapat dicapai (mis. siklus parentTaskId) tetap ditampilkan
  // di akhir daftar agar data pengguna tidak hilang.
  list.forEach((task) => {
    if (visited.has(task.id)) return
    rows.push({ task, depth: 0, hasChildren: false, childCount: 0 })
  })

  return rows
}

// Subtask langsung dari sebuah tugas.
export function childTasksOf(tasks, parentId) {
  return (Array.isArray(tasks) ? tasks : [])
    .map(normalizeTask)
    .filter((task) => task && task.parentTaskId === parentId)
}
