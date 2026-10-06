import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/common/Icon.jsx'
import ProjectPicker from '../components/common/ProjectPicker.jsx'
import TaskDetail from '../components/common/TaskDetail.jsx'
import NetworkDiagramView from '../components/network/NetworkDiagramView.jsx'
import { useData } from '../context/dataContext.js'
import { useProjectSchedule } from '../hooks/useProjectSchedule.js'

// Halaman Diagram Jaringan (PERT): node = aktivitas, panah = dependensi.
// Seluruh gambar diturunkan dari data tugas yang tersimpan, bukan gambar statis.
export default function NetworkDiagram() {
  const { resources, projects, tasks } = useData()
  const { projects: allProjects, projectId, setProjectId, projectTasks, schedule } =
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

  const relationCount = projectTasks.reduce(
    (sum, task) => sum + task.dependencies.length,
    0,
  )
  const dangling = schedule.issues.dangling

  return (
    <div className="pf-page">
      <div className="pf-page__head d-flex flex-wrap gap-2 justify-content-between align-items-start">
        <div>
          <h2>Diagram Jaringan</h2>
          <p>Node adalah aktivitas, panah adalah urutan (dependensi) antar aktivitas.</p>
        </div>
        <ProjectPicker
          projects={allProjects}
          projectId={projectId}
          onChange={setProjectId}
          counts={counts}
        />
      </div>

      {schedule.leafCount === 0 ? (
        <div className="pf-empty-state">
          <span className="pf-empty-state__icon">
            <Icon name="share" size={26} />
          </span>
          <h3>Belum ada aktivitas</h3>
          <p>Tambahkan tugas dan dependensinya agar diagram jaringan terbentuk.</p>
          <Link to="/dependencies" className="btn btn-primary btn-sm">
            <Icon name="link" size={16} className="me-1" /> Atur Dependensi
          </Link>
        </div>
      ) : (
        <>
          <div className="pf-mini-stats">
            <span className="pf-chip pf-chip--soft">{schedule.leafCount} node</span>
            <span className="pf-chip pf-chip--soft">{relationCount} panah dependensi</span>
            <span className="pf-chip pf-chip--soft">{schedule.paths.length} jalur</span>
            <span className="pf-chip pf-chip--soft is-critical">
              {schedule.criticalIds.size} node kritis
            </span>
          </div>

          {(!schedule.ok || dangling.length > 0) && (
            <div className="pf-notice pf-notice--warning" role="status">
              <Icon name="warning" size={17} />
              <span>
                {schedule.issues.cycles.length} dependensi melingkar dan {dangling.length} dependensi
                tidak valid (menunjuk tugas yang tidak ada / dirujuk dirinya sendiri) diabaikan saat
                menggambar diagram.
              </span>
              <Link to="/dependencies" className="pf-link ms-auto">
                Perbaiki
              </Link>
            </div>
          )}

          <NetworkDiagramView
            schedule={schedule}
            resources={resources}
            onSelectTask={(task) => setDetailId(task.id)}
          />

          <p className="pf-hint">
            Klik node untuk melihat detail aktivitas. Node berbingkai merah termasuk jalur kritis
            (slack 0). Label pada panah menunjukkan jenis dependensi (FS/SS/FF/SF) dan lag hari.
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
