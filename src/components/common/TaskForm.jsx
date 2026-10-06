import { useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  emptyTaskValues,
  taskToFormValues,
  validateTask,
} from '../../data/taskSchema.js'
import { childTasksOf } from '../../utils/taskTree.js'
import { createWorkCalendar } from '../../utils/workCalendar.js'
import { durationInDays, formatDate } from '../../utils/date.js'

// TaskForm dipakai untuk membuat maupun mengedit tugas.
// Field diambil dari context, bukan dari sistem penyimpanan terpisah.
// Field `dependencies` tidak dikirim dari sini supaya relasi dependensi yang
// sudah disetel di halaman Dependensi tetap utuh (lihat catatan di bawah).
export default function TaskForm({
  initialTask,
  projects,
  resources,
  tasks = [],
  settings = {},
  onSubmit,
  onCancel,
}) {
  const isEdit = Boolean(initialTask)
  const [values, setValues] = useState(() =>
    initialTask ? taskToFormValues(initialTask) : emptyTaskValues(),
  )
  const [errors, setErrors] = useState({})

  const calendar = useMemo(() => createWorkCalendar(settings), [settings])

  // Kandidat induk aktivitas: tugas lain pada proyek yang sama, kecualikan
  // dirinya sendiri dan seluruh keturunannya (mencegah subtask berulang).
  const parentOptions = useMemo(() => {
    if (!values.projectId) return []
    const excluded = new Set()
    if (initialTask) {
      excluded.add(initialTask.id)
      childTasksOf(tasks, initialTask.id).forEach((child) => {
        excluded.add(child.id)
        childTasksOf(tasks, child.id).forEach((grandChild) => excluded.add(grandChild.id))
      })
    }

    return tasks
      .filter((task) => task.projectId === values.projectId && !excluded.has(task.id))
      .sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name))
  }, [initialTask, tasks, values.projectId])

  const durationInfo = useMemo(() => {
    if (!values.startDate || !values.endDate || values.endDate < values.startDate) return null
    const calendarDays = durationInDays(values.startDate, values.endDate)
    const workingDays = calendar.workingDaysBetween(values.startDate, values.endDate)
    return { calendarDays, workingDays }
  }, [calendar, values.endDate, values.startDate])

  const setField = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
    // Hapus pesan error bidang ini begitu pengguna memperbaiki input.
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const found = validateTask(values, projects, { tasks, taskId: initialTask?.id ?? null })
    if (found) {
      setErrors(found)
      return
    }

    // Sengaja `dependencies` tidak disertakan: updateTask hanya menggabungkan
    // field yang dikirim, sehingga dependensi lama tetap terjaga.
    onSubmit({
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      description: values.description.trim(),
      projectId: values.projectId,
      parentTaskId: values.parentTaskId || null,
      assigneeId: values.assigneeId || null,
      startDate: values.startDate,
      endDate: values.endDate,
      progress: Number(values.progress),
      status: values.status,
      priority: values.priority,
      isMilestone: values.isMilestone,
    })
  }

  const errorFor = (field) =>
    errors[field] ? (
      <div className="pf-field__error" role="alert">
        {errors[field]}
      </div>
    ) : null

  return (
    <section className="pf-form-panel">
      <header className="pf-form-panel__head">
        <h3>{isEdit ? 'Edit Tugas' : 'Tugas Baru'}</h3>
        <p>
          {isEdit
            ? 'Perbarui data tugas lalu simpan perubahan.'
            : 'Isi data tugas dan pilih proyek induknya.'}
        </p>
      </header>

      <form className="pf-form" onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-12 col-md-7">
            <label className="pf-field__label" htmlFor="pf-task-name">
              Nama Tugas <span className="pf-required">*</span>
            </label>
            <input
              id="pf-task-name"
              type="text"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              value={values.name}
              onChange={setField('name')}
              placeholder="Contoh: Analisis kebutuhan bisnis"
            />
            {errorFor('name')}
          </div>

          <div className="col-6 col-md-2">
            <label className="pf-field__label" htmlFor="pf-task-code">
              Kode
            </label>
            <input
              id="pf-task-code"
              type="text"
              className={`form-control ${errors.code ? 'is-invalid' : ''}`}
              value={values.code}
              onChange={setField('code')}
              placeholder="A"
              maxLength={12}
            />
            {errorFor('code')}
          </div>

          <div className="col-12 col-md-3">
            <label className="pf-field__label" htmlFor="pf-task-project">
              Proyek Induk <span className="pf-required">*</span>
            </label>
            <select
              id="pf-task-project"
              className={`form-select ${errors.projectId ? 'is-invalid' : ''}`}
              value={values.projectId}
              onChange={(event) => {
                // Proyek berubah -> kosongkan induk subtask dari proyek lama.
                setValues((prev) => ({
                  ...prev,
                  projectId: event.target.value,
                  parentTaskId: '',
                }))
                setErrors((prev) => {
                  const next = { ...prev }
                  delete next.projectId
                  delete next.parentTaskId
                  return next
                })
              }}
            >
              <option value="">-- Pilih proyek --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errorFor('projectId')}
          </div>

          <div className="col-12">
            <label className="pf-field__label" htmlFor="pf-task-description">
              Deskripsi
            </label>
            <textarea
              id="pf-task-description"
              className="form-control"
              rows={2}
              value={values.description}
              onChange={setField('description')}
              placeholder="Ringkasan pekerjaan, deliverable, atau catatan tim."
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="pf-field__label" htmlFor="pf-task-parent">
              Induk Aktivitas (Subtask)
            </label>
            <select
              id="pf-task-parent"
              className={`form-select ${errors.parentTaskId ? 'is-invalid' : ''}`}
              value={values.parentTaskId}
              onChange={setField('parentTaskId')}
              disabled={!values.projectId}
            >
              <option value="">-- Tugas tingkat atas --</option>
              {parentOptions.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.code ? `${task.code} - ` : ''}
                  {task.name}
                </option>
              ))}
            </select>
            {errorFor('parentTaskId')}
          </div>

          <div className="col-12 col-md-6">
            <label className="pf-field__label" htmlFor="pf-task-assignee">
              Penanggung Jawab
            </label>
            <select
              id="pf-task-assignee"
              className="form-select"
              value={values.assigneeId}
              onChange={setField('assigneeId')}
            >
              <option value="">-- Belum ditentukan --</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} ({resource.role})
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3">
            <label className="pf-field__label" htmlFor="pf-task-status">
              Status
            </label>
            <select
              id="pf-task-status"
              className="form-select"
              value={values.status}
              onChange={setField('status')}
            >
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3">
            <label className="pf-field__label" htmlFor="pf-task-priority">
              Prioritas
            </label>
            <select
              id="pf-task-priority"
              className="form-select"
              value={values.priority}
              onChange={setField('priority')}
            >
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-3">
            <label className="pf-field__label" htmlFor="pf-task-progress">
              Progres (%)
            </label>
            <input
              id="pf-task-progress"
              type="number"
              min="0"
              max="100"
              step="1"
              className={`form-control ${errors.progress ? 'is-invalid' : ''}`}
              value={values.progress}
              onChange={setField('progress')}
            />
            {errorFor('progress')}
          </div>

          <div className="col-12 col-md-3 d-flex align-items-end">
            <div className="pf-field-hint w-100">
              <strong>Durasi kerja</strong>
              <span>
                {durationInfo
                  ? `${durationInfo.workingDays} hari kerja (${durationInfo.calendarDays} hari kalender)`
                  : 'Isi tanggal mulai & selesai untuk melihat durasi.'}
              </span>
              {durationInfo && durationInfo.workingDays < durationInfo.calendarDays && (
                <small>Mengikuti kalender kerja aktif.</small>
              )}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <label className="pf-field__label" htmlFor="pf-task-start">
              Tanggal Mulai <span className="pf-required">*</span>
            </label>
            <input
              id="pf-task-start"
              type="date"
              className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
              value={values.startDate}
              onChange={setField('startDate')}
            />
            {errorFor('startDate')}
          </div>

          <div className="col-12 col-md-4">
            <label className="pf-field__label" htmlFor="pf-task-end">
              Tanggal Selesai <span className="pf-required">*</span>
            </label>
            <input
              id="pf-task-end"
              type="date"
              className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
              value={values.endDate}
              onChange={setField('endDate')}
            />
            {errorFor('endDate')}
          </div>

          <div className="col-12 col-md-4 d-flex align-items-end">
            <div className="form-check mb-2">
              <input
                id="pf-task-milestone"
                type="checkbox"
                className="form-check-input"
                checked={values.isMilestone}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    isMilestone: event.target.checked,
                    // Milestone adalah titik tanpa pekerjaan: hanya satu hari.
                    endDate: event.target.checked ? prev.startDate || prev.endDate : prev.endDate,
                  }))
                }
              />
              <label className="form-check-label" htmlFor="pf-task-milestone">
                Tandai sebagai milestone
              </label>
            </div>
          </div>
        </div>

        <div className="pf-form-actions">
          <button type="submit" className="btn btn-primary btn-sm">
            <Icon name="check" size={16} className="me-1" />
            {isEdit ? 'Simpan Perubahan' : 'Simpan Tugas'}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
            Batal
          </button>
          {durationInfo && (
            <span className="pf-form-actions__hint">
              {formatDate(values.startDate)} &rarr; {formatDate(values.endDate)}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}
