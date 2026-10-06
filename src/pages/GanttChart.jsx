import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/common/Icon.jsx'
import ProjectPicker from '../components/common/ProjectPicker.jsx'
import TaskDetail from '../components/common/TaskDetail.jsx'
import GanttChartView from '../components/gantt/GanttChartView.jsx'
import { useData } from '../context/dataContext.js'
import { useProjectSchedule } from '../hooks/useProjectSchedule.js'
import { formatDate } from '../utils/date.js'

// Halaman Gantt chart. Bar mengikuti tanggal & durasi yang tersimpan di
// DataProvider, sehingga perubahan tanggal tugas langsung terlihat di sini.
export default function GanttChart() {
  const { resources, projects, tasks } = useData()
  const { projects: allProjects, project, projectId, setProjectId, projectTasks, schedule } =
    useProjectSchedule()

  const [detailId, setDetailId] = useState(null)

  const counts = useMemo(() => {
    const map = {}
    tasks.forEach((task) => {
      map[task.projectId] = (map[task.projectId] ?? 0) + 1
    })
    return map
  }, [tasks])

  const detailTask = tasks.find((task) => task.id === detailId) ?? null
  const detailRow = detailId ? schedule.byId.get(detailId) : null

  const summary = useMemo(() => {
    if (schedule.leafCount === 0) return null
    const milestones = projectTasks.filter((task) => task.isMilestone).length
    const critical = schedule.tasks.filter((row) => schedule.criticalIds.has(row.id)).length
    return {
      activities: schedule.leafCount,
      milestones,
      critical,
      span: `${formatDate(schedule.projectStart)} - ${formatDate(schedule.projectFinish)}`,
    }
  }, [projectTasks, schedule])

  return (
    <div className="pf-page">
      <div className="pf-page__head d-flex flex-wrap gap-2 justify-content-between align-items-start">
        <div>
          <h2>Gantt Chart</h2>
          <p>Bar sesuai tanggal, durasi, progres, dan dependensi yang tersimpan.</p>
        </div>
        <ProjectPicker
          projects={allProjects}
          projectId={projectId}
          onChange={setProjectId}
          counts={counts}
        />
      </div>

      {project && summary && (
        <div className="pf-mini-stats">
          <span className="pf-chip pf-chip--soft">
            <Icon name="folder" size={15} /> {project.name}
          </span>
          <span className="pf-chip pf-chip--soft">{summary.activities} aktivitas</span>
          <span className="pf-chip pf-chip--soft">{summary.milestones} milestone</span>
          <span className="pf-chip pf-chip--soft is-critical">{summary.critical} jalur kritis</span>
          <span className="pf-chip pf-chip--soft">
            <Icon name="calendar" size={15} /> {summary.span}
          </span>
        </div>
      )}

      {schedule.leafCount === 0 ? (
        <div className="pf-empty-state">
          <span className="pf-empty-state__icon">
            <Icon name="bars" size={26} />
          </span>
          <h3>Belum ada aktivitas untuk divisualkan</h3>
          <p>Tambahkan tugas pada proyek terpilih agar bar Gantt dapat digambar.</p>
          <Link to="/tasks" className="btn btn-primary btn-sm">
            <Icon name="list" size={16} className="me-1" /> Ke Daftar Tugas
          </Link>
        </div>
      ) : (
        <>
          {!schedule.ok && (
            <div className="pf-notice pf-notice--warning" role="status">
              <Icon name="warning" size={17} />
              <span>
                Terdapat dependensi melingkar pada data. Sisi yang membentuk siklus
                diabaikan saat perhitungan sampai dependensinya diperbaiki.
              </span>
              <Link to="/dependencies" className="pf-link ms-auto">
                Perbaiki
              </Link>
            </div>
          )}

          <GanttChartView
            project={project}
            tasks={projectTasks}
            schedule={schedule}
            resources={resources}
            calendar={schedule.calendar}
            onSelectTask={(task) => setDetailId(task.id)}
          />

          <p className="pf-hint">
            Klik nama aktivitas untuk melihat detail, dependensi, dan hasil perhitungan
            penjadwalan. Kolom abu-abu adalah hari non-kerja (akhir pekan / hari libur) dari
            kalender kerja aktif, dan garis merah menandai <strong>tanggal hari ini</strong>.
          </p>
        </>
      )}

      {detailTask && (
        <TaskDetail
          task={detailTask}
          projects={projects}
          resources={resources}
          tasks={tasks}
          scheduleRow={detailRow}
          calendar={schedule.calendar}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}
