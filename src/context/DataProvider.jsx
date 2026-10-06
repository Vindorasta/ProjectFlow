import { useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { STORAGE_KEYS } from '../data/storage.js'
import { createSeedData } from '../data/seed.js'
import { normalizeProject, normalizeProjects } from '../data/projectSchema.js'
import { normalizeTask, normalizeTasks } from '../data/taskSchema.js'
import { normalizeResource, normalizeResources } from '../data/resourceSchema.js'
import { normalizeSettings } from '../data/settingsSchema.js'
import { DataContext } from './dataContext.js'

// Nilai seed dipakai sekali untuk inisialisasi LocalStorage.
const seed = createSeedData()

// DataProvider membungkus seluruh aplikasi dan menyediakan data + operasi dasar.
// Fitur lanjutan (Gantt, dependensi, sumber daya, kalender, jalur kritis)
// memakai data dan fungsi yang sama - tidak ada sistem penyimpanan kedua.
export function DataProvider({ children }) {
  // Data lama dinormalisasi saat dibaca agar field baru (code, priority,
  // holidays, ...) selalu punya default dan aplikasi tidak pernah crash.
  const [projects, setProjects, resetProjects] = useLocalStorage(
    STORAGE_KEYS.projects,
    seed.projects,
    normalizeProjects,
  )
  const [tasks, setTasks, resetTasks] = useLocalStorage(
    STORAGE_KEYS.tasks,
    seed.tasks,
    normalizeTasks,
  )
  const [resources, setResources, resetResources] = useLocalStorage(
    STORAGE_KEYS.resources,
    seed.resources,
    normalizeResources,
  )
  const [settings, setSettings] = useLocalStorage(
    STORAGE_KEYS.settings,
    seed.settings,
    normalizeSettings,
  )

  // Penomoran id sederhana; cukup sampai backend/id generator sungguhan ditambahkan.
  const makeId = useCallback((prefix) => `${prefix}-${Date.now().toString(36)}`, [])

  const addProject = useCallback(
    (project) => {
      const newProject = normalizeProject({ ...project, id: project.id ?? makeId('p') })
      setProjects((prev) => [...prev, newProject])
      return newProject
    },
    [makeId, setProjects],
  )

  const updateProject = useCallback(
    (id, changes) => {
      setProjects((prev) =>
        prev.map((project) =>
          project.id === id ? normalizeProject({ ...project, ...changes }) : project,
        ),
      )
    },
    [setProjects],
  )

  // Hapus proyek. Demi integritas data, proyek yang masih memiliki tugas
  // TIDAK boleh dihapus dan tugas tidak pernah dihapus otomatis.
  // Mengembalikan { ok } agar pemanggil bisa menampilkan penjelasan.
  const removeProject = useCallback(
    (id) => {
      if (tasks.some((task) => task.projectId === id)) {
        return { ok: false, reason: 'HAS_TASKS' }
      }
      setProjects((prev) => prev.filter((project) => project.id !== id))
      return { ok: true }
    },
    [setProjects, tasks],
  )

  const addTask = useCallback(
    (task) => {
      const newTask = normalizeTask({ ...task, id: task.id ?? makeId('t') })
      setTasks((prev) => [...prev, newTask])
      return newTask
    },
    [makeId, setTasks],
  )

  const updateTask = useCallback(
    (id, changes) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? normalizeTask({ ...task, ...changes }) : task,
        ),
      )
    },
    [setTasks],
  )

  // Hapus tugas sekaligus membersihkan rujukan menggantung:
  //  - dependensi tugas lain yang menunjuk ke tugas ini dihapus;
  //  - subtask tanpa induk menjadi baris tingkat atas.
  const removeTask = useCallback(
    (id) => {
      setTasks((prev) =>
        prev
          .filter((task) => task.id !== id)
          .map((task) => {
            const next = { ...task }
            let changed = false

            if (Array.isArray(next.dependencies) && next.dependencies.length > 0) {
              const filtered = next.dependencies.filter(
                (dependency) => (dependency?.id ?? dependency) !== id,
              )
              if (filtered.length !== next.dependencies.length) {
                next.dependencies = filtered
                changed = true
              }
            }

            if (next.parentTaskId === id) {
              next.parentTaskId = null
              changed = true
            }

            return changed ? next : task
          }),
      )
    },
    [setTasks],
  )

  const addResource = useCallback(
    (resource) => {
      const newResource = normalizeResource({ ...resource, id: resource.id ?? makeId('r') })
      setResources((prev) => [...prev, newResource])
      return newResource
    },
    [makeId, setResources],
  )

  const updateResource = useCallback(
    (id, changes) => {
      setResources((prev) =>
        prev.map((resource) =>
          resource.id === id ? normalizeResource({ ...resource, ...changes }) : resource,
        ),
      )
    },
    [setResources],
  )

  // Personnel yang dihapus tidak lagi ditugaskan pada tugas mana pun.
  const removeResource = useCallback(
    (id) => {
      setResources((prev) => prev.filter((resource) => resource.id !== id))
      setTasks((prev) =>
        prev.map((task) =>
          task.assigneeId === id ? { ...task, assigneeId: null } : task,
        ),
      )
    },
    [setResources, setTasks],
  )

  // Kembalikan seluruh data ke contoh awal (berguna saat demo/presentasi).
  const resetToSeed = useCallback(() => {
    resetProjects()
    resetTasks()
    resetResources()
    setSettings(seed.settings)
  }, [resetProjects, resetTasks, resetResources, setSettings])

  const value = useMemo(
    () => ({
      projects,
      tasks,
      resources,
      settings,
      setSettings,
      addProject,
      updateProject,
      removeProject,
      addTask,
      updateTask,
      removeTask,
      addResource,
      updateResource,
      removeResource,
      resetToSeed,
    }),
    [
      projects,
      tasks,
      resources,
      settings,
      setSettings,
      addProject,
      updateProject,
      removeProject,
      addTask,
      updateTask,
      removeTask,
      addResource,
      updateResource,
      removeResource,
      resetToSeed,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
