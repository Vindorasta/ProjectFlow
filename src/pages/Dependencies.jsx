import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/common/Icon.jsx'
import ProjectPicker from '../components/common/ProjectPicker.jsx'
import { useData } from '../context/dataContext.js'
import { useProjectSchedule } from '../hooks/useProjectSchedule.js'
import { buildTaskRows } from '../utils/taskTree.js'
import { wouldCreateCycle } from '../utils/schedule.js'
import {
  DEFAULT_DEPENDENCY_TYPE,
  DEPENDENCY_TYPES,
  DEPENDENCY_TYPE_LABELS,
  normalizeDependencies,
} from '../data/taskSchema.js'
import { dependencyShortLabel } from '../utils/presentation.js'
import { formatDate } from '../utils/date.js'

// Halaman Dependensi Tugas.
// Setiap tugas dapat punya beberapa pendahulu, lengkap dengan jenis hubungan
// (FS/SS/FF/SF) dan lag. Penyimpanan tetap lewat DataProvider (LocalStorage).
export default function Dependencies() {
  const { tasks, updateTask } = useData()
  const { projects: allProjects, project, projectId, setProjectId, projectTasks, schedule } =
    useProjectSchedule()

  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState({
    successorId: '',
    predecessorId: '',
    type: DEFAULT_DEPENDENCY_TYPE,
    lag: '0',
  })
  const [formError, setFormError] = useState('')

  const counts = useMemo(() => {
    const map = {}
    tasks.forEach((task) => {
      map[task.projectId] = (map[task.projectId] ?? 0) + 1
    })
    return map
  }, [tasks])

  const rows = useMemo(() => buildTaskRows(projectTasks), [projectTasks])
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])

  const totalLinks = projectTasks.reduce((sum, task) => sum + task.dependencies.length, 0)

  const showNotice = (tone, text) => setNotice({ tone, text })

  // Tambah satu relasi pendahulu pada satu tugas.
  const addDependency = (event) => {
    event.preventDefault()
    const { successorId, predecessorId } = form
    if (!successorId || !predecessorId) {
      setFormError('Pilih aktivitas pemilik dan pendahulu.')
      return
    }

    const successor = taskById.get(successorId)
    const predecessor = taskById.get(predecessorId)
    if (!successor || !predecessor) {
      setFormError('Aktivitas yang dipilih tidak ditemukan.')
      return
    }
    if (successor.projectId !== predecessor.projectId) {
      setFormError('Dependensi hanya boleh antar aktivitas pada proyek yang sama.')
      return
    }
    if (successor.id === predecessor.id) {
      setFormError('Sebuah aktivitas tidak dapat bergantung pada dirinya sendiri.')
      return
    }

    const existing = normalizeDependencies(successor.dependencies)
    if (existing.some((dependency) => dependency.id === predecessor.id)) {
      setFormError('Relasi tersebut sudah terdaftar.')
      return
    }

    // Cegah siklus: menambahkan A -> B tidak boleh membuat B bisa menjangkau A.
    if (wouldCreateCycle(tasks, successorId, predecessorId)) {
      setFormError(
        'Penambahan ini akan membuat dependensi melingkar (siklus) sehingga jadwal tidak dapat dihitung.',
      )
      return
    }

    const lag = Number(form.lag)
    updateTask(successorId, {
      dependencies: [
        ...existing,
        {
          id: predecessorId,
          type: DEPENDENCY_TYPES.includes(form.type) ? form.type : DEFAULT_DEPENDENCY_TYPE,
          lag: Number.isFinite(lag) ? Math.trunc(lag) : 0,
        },
      ],
    })

    setForm({ successorId: '', predecessorId: '', type: DEFAULT_DEPENDENCY_TYPE, lag: '0' })
    setFormError('')
    showNotice(
      'success',
      `Dependensi ditambahkan: ${predecessor.code || predecessor.name} -> ${
        successor.code || successor.name
      }.`,
    )
  }

  const updateLink = (task, dependency, changes) => {
    const next = normalizeDependencies(task.dependencies).map((item) =>
      item.id === dependency.id ? { ...item, ...changes } : item,
    )
    updateTask(task.id, { dependencies: next })
  }

  const removeLink = (task, dependency) => {
    const next = normalizeDependencies(task.dependencies).filter(
      (item) => item.id !== dependency.id,
    )
    updateTask(task.id, { dependencies: next })
    showNotice(
      'success',
      `Dependensi ${dependency.id} pada "${task.code || task.name}" dihapus.`,
    )
  }

  return (
    <div className="pf-page">
      <div className="pf-page__head d-flex flex-wrap gap-2 justify-content-between align-items-start">
        <div>
          <h2>Dependensi Tugas</h2>
          <p>
            Hubungan antar aktivitas: Finish-to-Start, Start-to-Start, Finish-to-Finish, dan
            Start-to-Finish dengan jeda (lag).
          </p>
        </div>
        <ProjectPicker
          projects={allProjects}
          projectId={projectId}
          onChange={setProjectId}
          counts={counts}
        />
      </div>

      {notice && (
        <div className={`pf-notice pf-notice--${notice.tone}`} role="status" aria-live="polite">
          <Icon name={notice.tone === 'warning' ? 'warning' : 'check'} size={17} />
          <span>{notice.text}</span>
          <button
            type="button"
            className="pf-notice__close"
            onClick={() => setNotice(null)}
            aria-label="Tutup pesan"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      {projectTasks.length === 0 ? (
        <div className="pf-empty-state">
          <span className="pf-empty-state__icon">
            <Icon name="link" size={26} />
          </span>
          <h3>Belum ada aktivitas pada proyek ini</h3>
          <p>Tambahkan tugas terlebih dahulu sebelum mengatur dependensi.</p>
          <Link to="/tasks" className="btn btn-primary btn-sm">
            <Icon name="list" size={16} className="me-1" /> Ke Daftar Tugas
          </Link>
        </div>
      ) : (
        <>
          <section className="pf-card pf-section">
            <div className="pf-card__head">
              <h3>Tambah Dependensi</h3>
              <span className="pf-chip pf-chip--soft">{totalLinks} relasi aktif</span>
            </div>
            <div className="pf-card__body">
              <form className="pf-dep-form" onSubmit={addDependency}>
                <div>
                  <label className="pf-field__label" htmlFor="pf-dep-successor">
                    Aktivitas yang bergantung
                  </label>
                  <select
                    id="pf-dep-successor"
                    className="form-select form-select-sm"
                    value={form.successorId}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, successorId: event.target.value }))
                      setFormError('')
                    }}
                  >
                    <option value="">-- Pilih aktivitas --</option>
                    {rows
                      .filter((row) => !row.hasChildren)
                      .map((row) => (
                        <option key={row.task.id} value={row.task.id}>
                          {row.task.code ? `${row.task.code} - ` : ''}
                          {row.task.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="pf-field__label" htmlFor="pf-dep-predecessor">
                    Pendahulu (harus selesai)
                  </label>
                  <select
                    id="pf-dep-predecessor"
                    className="form-select form-select-sm"
                    value={form.predecessorId}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, predecessorId: event.target.value }))
                      setFormError('')
                    }}
                  >
                    <option value="">-- Pilih pendahulu --</option>
                    {rows
                      .filter((row) => !row.hasChildren && row.task.id !== form.successorId)
                      .map((row) => (
                        <option key={row.task.id} value={row.task.id}>
                          {row.task.code ? `${row.task.code} - ` : ''}
                          {row.task.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="pf-field__label" htmlFor="pf-dep-type">
                    Jenis
                  </label>
                  <select
                    id="pf-dep-type"
                    className="form-select form-select-sm"
                    value={form.type}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, type: event.target.value }))
                    }
                  >
                    {DEPENDENCY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type} - {DEPENDENCY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="pf-field__label" htmlFor="pf-dep-lag">
                    Lag (hari)
                  </label>
                  <input
                    id="pf-dep-lag"
                    type="number"
                    step="1"
                    className="form-control form-control-sm"
                    value={form.lag}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, lag: event.target.value }))
                    }
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-sm">
                  <Icon name="link" size={16} className="me-1" /> Tambahkan
                </button>
              </form>

              {formError && (
                <div className="pf-notice pf-notice--warning mt-2" role="alert">
                  <Icon name="warning" size={17} />
                  <span>{formError}</span>
                </div>
              )}

              {schedule.issues.cycles.length > 0 && (
                <div className="pf-notice pf-notice--warning mt-2" role="alert">
                  <Icon name="warning" size={17} />
                  <span>
                    Terdapat {schedule.issues.cycles.length} dependensi melingkar pada data lama
                    (mis. {schedule.issues.cycles[0].successorId} &rarr;{' '}
                    {schedule.issues.cycles[0].predecessorId}). Sisi tersebut diabaikan saat
                    perhitungan sampai dihapus di bawah.
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="pf-card pf-section">
            <div className="pf-card__head">
              <h3>Daftar Dependensi {project ? `· ${project.name}` : ''}</h3>
              <span className="pf-chip pf-chip--soft">{projectTasks.length} aktivitas</span>
            </div>
            <div className="table-responsive">
              <table className="table align-middle pf-table mb-0" id="pf-dep-table">
                <thead>
                  <tr>
                    <th>Aktivitas (bergantung)</th>
                    <th>Pendahulu</th>
                    <th>Jenis</th>
                    <th>Lag</th>
                    <th>Jadwal terhitung</th>
                    <th className="text-end">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const dependencies = normalizeDependencies(row.task.dependencies)
                    if (row.hasChildren) {
                      return (
                        <tr key={row.task.id} className="pf-table__group">
                          <td colSpan={6}>
                            <strong>
                              {row.task.code ? `${row.task.code} · ` : ''}
                              {row.task.name}
                            </strong>{' '}
                            <span className="pf-chip pf-chip--soft ms-2">
                              baris ringkasan {row.childCount} subtask
                            </span>
                          </td>
                        </tr>
                      )
                    }

                    if (dependencies.length === 0) {
                      return (
                        <tr key={row.task.id}>
                          <td>
                            <strong>{row.task.code ? `${row.task.code} · ` : ''}</strong>
                            {row.task.name}
                          </td>
                          <td colSpan={4} className="text-secondary">
                            Tidak ada pendahulu - dapat dimulai kapan saja.
                          </td>
                          <td />
                        </tr>
                      )
                    }

                    return dependencies.map((dependency, index) => {
                      const predecessor = taskById.get(dependency.id)
                      const rowSchedule = schedule.byId.get(row.task.id)
                      return (
                        <tr key={`${row.task.id}-${dependency.id}`}>
                          {index === 0 && (
                            <td rowSpan={dependencies.length}>
                              <strong>{row.task.code ? `${row.task.code} · ` : ''}</strong>
                              {row.task.name}
                            </td>
                          )}
                          <td>
                            {predecessor
                              ? `${predecessor.code ? `${predecessor.code} · ` : ''}${
                                  predecessor.name
                                }`
                              : `${dependency.id} (tidak ditemukan)`}
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm pf-dep-type"
                              aria-label={`Jenis dependensi ${row.task.name}`}
                              value={dependency.type}
                              onChange={(event) =>
                                updateLink(row.task, dependency, { type: event.target.value })
                              }
                            >
                              {DEPENDENCY_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="1"
                              className="form-control form-control-sm pf-dep-lag"
                              aria-label={`Lag dependensi ${row.task.name}`}
                              value={dependency.lag}
                              onChange={(event) =>
                                updateLink(row.task, dependency, {
                                  lag: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </td>
                          <td>
                            {rowSchedule
                              ? `${formatDate(rowSchedule.es)} → ${formatDate(rowSchedule.ef)}`
                              : '-'}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeLink(row.task, dependency)}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pf-card pf-section">
            <div className="pf-card__head">
              <h3>Legenda Jenis Dependensi</h3>
              <Link to="/critical-path" className="pf-link">
                Lihat jalur kritis <Icon name="trending" size={15} />
              </Link>
            </div>
            <div className="pf-card__body">
              <div className="pf-legend-grid">
                {DEPENDENCY_TYPES.map((type) => (
                  <div key={type} className="pf-legend-grid__item">
                    <span className="pf-chip pf-chip--soft">{dependencyShortLabel({ type, lag: 0 })}</span>
                    <strong>{DEPENDENCY_TYPE_LABELS[type]}</strong>
                    <small>
                      {type === 'FS' && 'Aktivitas B mulai setelah A selesai.'}
                      {type === 'SS' && 'Aktivitas B mulai bersamaan dengan A.'}
                      {type === 'FF' && 'Aktivitas B selesai setelah A selesai.'}
                      {type === 'SF' && 'Aktivitas B selesai setelah A mulai.'}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
