import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/dataContext.js'
import { createWorkCalendar } from '../utils/workCalendar.js'
import { buildTaskRows } from '../utils/taskTree.js'
import { durationInDays, formatDate } from '../utils/date.js'
import { priorityTone } from '../utils/presentation.js'
import Icon from '../components/common/Icon.jsx'
import TaskForm from '../components/common/TaskForm.jsx'
import TaskDetail from '../components/common/TaskDetail.jsx'

// Halaman Daftar Tugas - CRUD penuh (create, read, update, delete) plus detail.
// Data disimpan lewat DataProvider (useLocalStorage), tanpa sistem lain.

const STATUS_TONE = {
  Selesai: 'success',
  Berjalan: 'primary',
  'Belum Mulai': 'secondary',
  Tertunda: 'warning',
}

// Halaman Daftar Tugas - CRUD penuh (create, read, update, delete).
// Data disimpan lewat DataProvider (useLocalStorage), tanpa sistem lain.
export default function Tasks() {
  const { tasks, projects, resources, settings, addTask, updateTask, removeTask } = useData()

  // null = form tersembunyi; { mode, task } = form sedang aktif
  const [form, setForm] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [notice, setNotice] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [projectFilter, setProjectFilter] = useState('')
  const [query, setQuery] = useState('')

  const calendar = useMemo(() => createWorkCalendar(settings), [settings])

  const rows = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchProject = !projectFilter || task.projectId === projectFilter
      const term = query.trim().toLowerCase()
      const matchQuery =
        !term ||
        task.name.toLowerCase().includes(term) ||
        (task.code ?? '').toLowerCase().includes(term)
      return matchProject && matchQuery
    })
    return buildTaskRows(filtered)
  }, [projectFilter, query, tasks])

  const detailTask = tasks.find((task) => task.id === detailId) ?? null

  const resourceName = (id) => resources.find((r) => r.id === id)?.name ?? '-'
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? 'Tanpa proyek'

  const showNotice = (tone, text) => setNotice({ tone, text })

  const openCreate = () => {
    setNotice(null)
    setPendingDelete(null)
    setForm({ mode: 'create', task: null })
  }

  const openEdit = (task) => {
    setNotice(null)
    setPendingDelete(null)
    setForm({ mode: 'edit', task })
  }

  const closeForm = () => setForm(null)

  const handleSubmit = (values) => {
    if (form.mode === 'edit') {
      // Perbarui berdasarkan id; field lain (dependencies) tetap dipertahankan
      // karena updateTask hanya menggabungkan field yang dikirim.
      updateTask(form.task.id, values)
      showNotice('success', `Tugas "${values.name}" berhasil diperbarui.`)
    } else {
      // Tugas baru selalu dimulai tanpa dependensi (atur di halaman Dependensi).
      addTask({ ...values, dependencies: [] })
      showNotice('success', `Tugas "${values.name}" berhasil ditambahkan.`)
    }
    setForm(null)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    removeTask(pendingDelete.id)
    showNotice('success', `Tugas "${pendingDelete.name}" telah dihapus.`)
    setPendingDelete(null)
  }

  return (
    <div className="pf-page">
      <div className="pf-page__head d-flex flex-wrap gap-2 justify-content-between align-items-start">
        <div>
          <h2>Daftar Tugas</h2>
          <p>Rincian tugas tiap proyek beserta durasi dan penanggung jawab.</p>
        </div>
        {!form && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Icon name="list" size={16} className="me-1" /> Tugas Baru
          </button>
        )}
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

      {form && (
        <TaskForm
          initialTask={form.task}
          projects={projects}
          resources={resources}
          tasks={tasks}
          settings={settings}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      <div className="pf-filters">
        <div className="pf-filters__field">
          <label className="pf-field__label" htmlFor="pf-task-filter-project">
            Proyek
          </label>
          <select
            id="pf-task-filter-project"
            className="form-select form-select-sm"
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
          >
            <option value="">Semua proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="pf-filters__field">
          <label className="pf-field__label" htmlFor="pf-task-filter-search">
            Cari
          </label>
          <input
            id="pf-task-filter-search"
            type="search"
            className="form-control form-control-sm"
            placeholder="Nama atau kode aktivitas"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="pf-filters__field pf-filters__field--meta">
          <span className="pf-chip pf-chip--soft">
            {rows.length} baris dari {tasks.length} tugas
          </span>
          <Link to="/dependencies" className="btn btn-outline-secondary btn-sm">
            <Icon name="link" size={15} className="me-1" /> Kelola Dependensi
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="pf-empty-state">
          <span className="pf-empty-state__icon">
            <Icon name="list" size={26} />
          </span>
          <h3>{tasks.length === 0 ? 'Belum ada tugas' : 'Tidak ada tugas yang cocok'}</h3>
          <p>
            {tasks.length === 0
              ? 'Tambahkan tugas pertama dan hubungkan ke proyek induknya.'
              : 'Ubah kata kunci atau filter proyek untuk melihat data lain.'}
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Icon name="list" size={16} className="me-1" /> Tugas Baru
          </button>
        </div>
      ) : (
        <div className="pf-card">
          <div className="table-responsive">
            <table className="table align-middle pf-table mb-0" id="pf-task-table">
              <thead>
                <tr>
                  <th>Tugas</th>
                  <th>Proyek</th>
                  <th>Penanggung Jawab</th>
                  <th>Mulai</th>
                  <th>Selesai</th>
                  <th>Durasi</th>
                  <th>Status</th>
                  <th>Prioritas</th>
                  <th>Progres</th>
                  <th className="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { task, depth } = row
                  return (
                    <tr key={task.id} className={row.hasChildren ? 'pf-table__group' : ''}>
                      <td>
                        <span style={{ paddingLeft: depth * 14, display: 'inline-block' }}>
                          {task.code && <span className="pf-gantt__code me-1">{task.code}</span>}
                          <strong>{task.name}</strong>
                        </span>
                        {task.isMilestone && (
                          <span className="pf-badge pf-badge--purple ms-2">Milestone</span>
                        )}
                        {row.hasChildren && (
                          <span className="pf-chip pf-chip--soft ms-2">
                            {row.childCount} subtask
                          </span>
                        )}
                        {task.dependencies.length > 0 && (
                          <span className="pf-chip pf-chip--soft ms-1">
                            <Icon name="link" size={13} /> {task.dependencies.length}
                          </span>
                        )}
                      </td>
                      <td>{projectName(task.projectId)}</td>
                      <td>{resourceName(task.assigneeId)}</td>
                      <td>{formatDate(task.startDate)}</td>
                      <td>{formatDate(task.endDate)}</td>
                      <td title={`${durationInDays(task.startDate, task.endDate)} hari kalender`}>
                        {calendar.taskDuration(task.startDate, task.endDate) || 0} hari kerja
                      </td>
                      <td>
                        <span className={`pf-badge pf-badge--${STATUS_TONE[task.status] ?? 'secondary'}`}>
                          {task.status}
                        </span>
                      </td>
                      <td>
                        <span className={`pf-badge pf-badge--${priorityTone(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <div className="progress" role="progressbar" aria-label={`Progres ${task.name}`}>
                          <div className="progress-bar" style={{ width: `${task.progress}%` }} />
                        </div>
                      </td>
                      <td>
                        <div className="pf-cell-actions">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setDetailId(task.id)}
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => openEdit(task)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => {
                              setForm(null)
                              setNotice(null)
                              setPendingDelete(task)
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailTask && (
        <TaskDetail
          task={detailTask}
          projects={projects}
          resources={resources}
          tasks={tasks}
          calendar={calendar}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setDetailId(null)
            openEdit(detailTask)
          }}
        />
      )}

      {/* Dialog konfirmasi hapus. Dibuat manual (bukan Modal Bootstrap) karena
          JavaScript Bootstrap belum diimpor. */}
      {pendingDelete && (
        <div className="pf-dialog-backdrop" role="presentation">
          <div className="pf-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-task-dialog-title">
            <h3 id="pf-task-dialog-title">Hapus tugas?</h3>
            <p>
              Tugas <strong>{pendingDelete.name}</strong> akan dihapus permanen dari LocalStorage
              browser ini. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="pf-dialog__actions">
              <button type="button" className="btn btn-danger btn-sm" onClick={confirmDelete}>
                Ya, Hapus
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setPendingDelete(null)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}