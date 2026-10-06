import Icon from './Icon.jsx'
import { DEPENDENCY_TYPE_LABELS, normalizeDependencies } from '../../data/taskSchema.js'
import { durationInDays, formatDate } from '../../utils/date.js'
import { dependencyShortLabel, priorityTone, statusTone } from '../../utils/presentation.js'

// Detail satu tugas: data dasar, dependensi, subtask, dan hasil perhitungan
// penjadwalan (ES/EF/LS/LF/slack) bila tersedia.
// Dialog dibuat dengan React state (bukan Modal Bootstrap) agar konsisten
// dengan halaman lain.
export default function TaskDetail({
  task,
  projects,
  resources,
  tasks,
  scheduleRow,
  calendar,
  onClose,
  onEdit,
}) {
  if (!task) return null

  const project = projects.find((item) => item.id === task.projectId)
  const assignee = resources.find((item) => item.id === task.assigneeId)
  const parent = tasks.find((item) => item.id === task.parentTaskId)
  const subtasks = tasks.filter((item) => item.parentTaskId === task.id)
  const dependencies = normalizeDependencies(task.dependencies)
  const calendarDays = durationInDays(task.startDate, task.endDate)
  const workingDays = calendar
    ? calendar.workingDaysBetween(task.startDate, task.endDate)
    : calendarDays

  return (
    <div className="pf-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pf-dialog pf-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pf-task-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pf-dialog__head">
          <div>
            <span className="pf-chip pf-chip--soft">
              {task.code ? `Aktivitas ${task.code}` : 'Aktivitas'}
            </span>
            <h3 id="pf-task-detail-title">{task.name}</h3>
            <small className="pf-dialog__sub">
              {project?.name ?? 'Tanpa proyek'}
              {parent ? ` · Induk: ${parent.code || parent.name}` : ''}
            </small>
          </div>
          <button
            type="button"
            className="pf-iconbtn"
            onClick={onClose}
            aria-label="Tutup detail tugas"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="pf-dialog__body">
          {task.description && <p className="pf-detail__desc">{task.description}</p>}

          <div className="pf-detail__grid">
            <div className="pf-detail__item">
              <span>Status</span>
              <strong>
                <span className={`pf-badge pf-badge--${statusTone(task.status)}`}>
                  {task.status}
                </span>
              </strong>
            </div>
            <div className="pf-detail__item">
              <span>Prioritas</span>
              <strong>
                <span className={`pf-badge pf-badge--${priorityTone(task.priority)}`}>
                  {task.priority}
                </span>
              </strong>
            </div>
            <div className="pf-detail__item">
              <span>Mulai</span>
              <strong>{formatDate(task.startDate)}</strong>
            </div>
            <div className="pf-detail__item">
              <span>Selesai</span>
              <strong>{formatDate(task.endDate)}</strong>
            </div>
            <div className="pf-detail__item">
              <span>Durasi</span>
              <strong>
                {workingDays} hari kerja{task.isMilestone ? ' · milestone' : ''}
              </strong>
            </div>
            <div className="pf-detail__item">
              <span>Penanggung jawab</span>
              <strong>{assignee ? `${assignee.name} (${assignee.role})` : 'Belum ditentukan'}</strong>
            </div>
            <div className="pf-detail__item">
              <span>Progres</span>
              <strong>
                <div className="progress" role="progressbar" aria-label="Progres tugas">
                  <div className="progress-bar" style={{ width: `${task.progress}%` }} />
                </div>
                {task.progress}%
              </strong>
            </div>
            <div className="pf-detail__item">
              <span>Rentang kalender</span>
              <strong>{calendarDays} hari</strong>
            </div>
          </div>

          <h4 className="pf-detail__title">Dependensi (pendahulu)</h4>
          {dependencies.length === 0 ? (
            <p className="pf-empty">Tidak ada dependensi. Aktivitas dapat dimulai kapan saja.</p>
          ) : (
            <ul className="pf-dep-list">
              {dependencies.map((dependency) => {
                const predecessor = tasks.find((item) => item.id === dependency.id)
                return (
                  <li key={dependency.id} className="pf-dep-list__item">
                    <strong>{predecessor ? predecessor.code || predecessor.name : dependency.id}</strong>
                    <span className="pf-chip pf-chip--soft">
                      {dependencyShortLabel(dependency)}
                    </span>
                    <small>
                      {DEPENDENCY_TYPE_LABELS[dependency.type]} ·{' '}
                      {predecessor ? predecessor.name : 'Tugas tidak ditemukan'}
                      {dependency.lag ? ` · lag ${dependency.lag} hari` : ''}
                    </small>
                  </li>
                )
              })}
            </ul>
          )}

          {subtasks.length > 0 && (
            <>
              <h4 className="pf-detail__title">Subtask ({subtasks.length})</h4>
              <ul className="pf-dep-list">
                {subtasks.map((subtask) => (
                  <li key={subtask.id} className="pf-dep-list__item">
                    <strong>{subtask.code || subtask.name}</strong>
                    <span className={`pf-badge pf-badge--${statusTone(subtask.status)}`}>
                      {subtask.status}
                    </span>
                    <small>
                      {subtask.name} · {subtask.progress}%
                    </small>
                  </li>
                ))}
              </ul>
            </>
          )}

          {scheduleRow && (
            <>
              <h4 className="pf-detail__title">Hasil perhitungan penjadwalan</h4>
              <div className="pf-detail__grid pf-detail__grid--4">
                <div className="pf-detail__item">
                  <span>ES (mulai paling awal)</span>
                  <strong>{formatDate(scheduleRow.es)}</strong>
                </div>
                <div className="pf-detail__item">
                  <span>EF (selesai paling awal)</span>
                  <strong>{formatDate(scheduleRow.ef)}</strong>
                </div>
                <div className="pf-detail__item">
                  <span>LS (mulai paling akhir)</span>
                  <strong>{formatDate(scheduleRow.ls)}</strong>
                </div>
                <div className="pf-detail__item">
                  <span>LF (selesai paling akhir)</span>
                  <strong>{formatDate(scheduleRow.lf)}</strong>
                </div>
              </div>
              <div className="pf-detail__item">
                <span>Slack (kelonggaran)</span>
                <strong className={scheduleRow.critical ? 'is-critical' : ''}>
                  {scheduleRow.slack} hari kerja
                  {scheduleRow.critical ? ' · termasuk jalur kritis' : ''}
                </strong>
              </div>
            </>
          )}
        </div>

        <div className="pf-dialog__actions">
          {onEdit && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}>
              <Icon name="list" size={16} className="me-1" /> Edit Tugas
            </button>
          )}
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
