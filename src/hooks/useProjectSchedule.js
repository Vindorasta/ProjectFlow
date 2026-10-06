import { useMemo, useState } from 'react'
import { useData } from '../context/dataContext.js'
import { computeSchedule } from '../utils/schedule.js'

// Hook bersama untuk halaman penjadwalan (Gantt, Diagram Jaringan, Jalur Kritis,
// Dependensi): memilih proyek aktif lalu menghitung jadwalnya.
// Data tetap berasal dari DataProvider - tidak ada state data kedua.
export function useProjectSchedule() {
  const { projects, tasks, settings } = useData()
  const [selectedProjectId, setProjectId] = useState(null)

  // Proyek aktif divalidasi saat render: bila proyek yang dipilih dihapus,
  // tampilan otomatis memakai proyek yang tersedia tanpa perlu efek tambahan.
  const projectId =
    selectedProjectId && projects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : (projects[0]?.id ?? null)

  const project = projects.find((item) => item.id === projectId) ?? null
  const projectTasks = useMemo(
    () => tasks.filter((task) => task.projectId === projectId),
    [projectId, tasks],
  )

  const schedule = useMemo(
    () => computeSchedule(tasks, settings, { projectId }),
    [projectId, settings, tasks],
  )

  return { projects, project, projectId, setProjectId, projectTasks, schedule, tasks, settings }
}
