import { useState } from 'react'
import Icon from './Icon.jsx'
import {
  PROJECT_COLOR_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  emptyProjectValues,
  projectToFormValues,
  validateProject,
} from '../../data/projectSchema.js'

// ProjectForm dipakai untuk membuat maupun mengedit proyek.
// Sengaja memakai state React (bukan Modal/Collapse Bootstrap) karena
// JavaScript Bootstrap belum diimpor di aplikasi ini.
export default function ProjectForm({ initialProject, onSubmit, onCancel }) {
  const isEdit = Boolean(initialProject)
  const [values, setValues] = useState(() =>
    initialProject ? projectToFormValues(initialProject) : emptyProjectValues(),
  )
  const [errors, setErrors] = useState({})

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
    const found = validateProject(values)
    if (found) {
      setErrors(found)
      return
    }

    onSubmit({
      name: values.name.trim(),
      code: values.code.trim(),
      description: values.description.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      progress: Number(values.progress),
      status: values.status,
      color: values.color,
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
        <h3>{isEdit ? 'Edit Proyek' : 'Proyek Baru'}</h3>
        <p>
          {isEdit
            ? 'Perbarui data proyek lalu simpan perubahan.'
            : 'Isi data proyek untuk menambahkannya ke daftar.'}
        </p>
      </header>

      <form className="pf-form" onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-12 col-md-7">
            <label className="pf-field__label" htmlFor="pf-project-name">
              Nama Proyek <span className="pf-required">*</span>
            </label>
            <input
              id="pf-project-name"
              type="text"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              value={values.name}
              onChange={setField('name')}
              placeholder="Contoh: Implementasi Sistem ERP"
            />
            {errorFor('name')}
          </div>

          <div className="col-12 col-md-5">
            <label className="pf-field__label" htmlFor="pf-project-code">
              Kode Proyek
            </label>
            <input
              id="pf-project-code"
              type="text"
              className="form-control"
              value={values.code}
              onChange={setField('code')}
              placeholder="Contoh: ERP-2026"
            />
          </div>

          <div className="col-12">
            <label className="pf-field__label" htmlFor="pf-project-desc">
              Deskripsi
            </label>
            <textarea
              id="pf-project-desc"
              className="form-control"
              rows="3"
              value={values.description}
              onChange={setField('description')}
              placeholder="Ringkasan singkat tujuan dan cakupan proyek."
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="pf-field__label" htmlFor="pf-project-start">
              Tanggal Mulai <span className="pf-required">*</span>
            </label>
            <input
              id="pf-project-start"
              type="date"
              className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
              value={values.startDate}
              onChange={setField('startDate')}
            />
            {errorFor('startDate')}
          </div>

          <div className="col-12 col-md-6">
            <label className="pf-field__label" htmlFor="pf-project-end">
              Tanggal Selesai <span className="pf-required">*</span>
            </label>
            <input
              id="pf-project-end"
              type="date"
              className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
              value={values.endDate}
              onChange={setField('endDate')}
            />
            {errorFor('endDate')}
          </div>

          <div className="col-12 col-md-4">
            <label className="pf-field__label" htmlFor="pf-project-progress">
              Progres (%)
            </label>
            <input
              id="pf-project-progress"
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

          <div className="col-12 col-md-4">
            <label className="pf-field__label" htmlFor="pf-project-status">
              Status
            </label>
            <select
              id="pf-project-status"
              className="form-select"
              value={values.status}
              onChange={setField('status')}
            >
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-4">
            <label className="pf-field__label" htmlFor="pf-project-color">
              Warna Penanda
            </label>
            <div className="pf-color-picker">
              {PROJECT_COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`pf-color-dot ${values.color === color ? 'is-active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setValues((prev) => ({ ...prev, color }))}
                  aria-label={`Pilih warna ${color}`}
                  aria-pressed={values.color === color}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="pf-form-actions">
          <button type="submit" className="btn btn-primary btn-sm">
            <Icon name="check" size={16} className="me-1" />
            {isEdit ? 'Simpan Perubahan' : 'Simpan Proyek'}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
            Batal
          </button>
        </div>
      </form>
    </section>
  )
}