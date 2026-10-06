import { useState } from 'react'
import Icon from './Icon.jsx'
import {
  RESOURCE_CAPACITY_OPTIONS,
  emptyResourceValues,
  resourceToFormValues,
  validateResource,
} from '../../data/resourceSchema.js'

// Form personnel: nama, peran, kontak, kapasitas, biaya harian, dan catatan.
// Data dikirim ke DataProvider; tidak ada penyimpanan sendiri di komponen ini.
export default function ResourceForm({
  initialResource,
  currency = 'IDR',
  onSubmit,
  onCancel,
}) {
  const isEdit = Boolean(initialResource)
  const [values, setValues] = useState(() =>
    initialResource ? resourceToFormValues(initialResource) : emptyResourceValues(),
  )
  const [errors, setErrors] = useState({})

  const setField = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const found = validateResource(values)
    if (found) {
      setErrors(found)
      return
    }

    onSubmit({
      name: values.name.trim(),
      role: values.role.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      capacity: Number(values.capacity),
      cost: Number(values.cost),
      notes: values.notes.trim(),
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
        <h3>{isEdit ? 'Edit Personel' : 'Personel Baru'}</h3>
        <p>Kontak, peran, dan biaya harian untuk alokasi tugas.</p>
      </header>

      <form className="pf-form" onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="pf-field__label" htmlFor="pf-resource-name">
              Nama <span className="pf-required">*</span>
            </label>
            <input
              id="pf-resource-name"
              type="text"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              value={values.name}
              onChange={setField('name')}
              placeholder="Contoh: Siti Nurhaliza"
            />
            {errorFor('name')}
          </div>

          <div className="col-12 col-md-6">
            <label className="pf-field__label" htmlFor="pf-resource-role">
              Peran / Jabatan <span className="pf-required">*</span>
            </label>
            <input
              id="pf-resource-role"
              type="text"
              className={`form-control ${errors.role ? 'is-invalid' : ''}`}
              value={values.role}
              onChange={setField('role')}
              placeholder="Contoh: System Analyst"
            />
            {errorFor('role')}
          </div>

          <div className="col-12 col-md-6">
            <label className="pf-field__label" htmlFor="pf-resource-email">
              Email
            </label>
            <input
              id="pf-resource-email"
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              value={values.email}
              onChange={setField('email')}
              placeholder="nama@contoh.com"
            />
            {errorFor('email')}
          </div>

          <div className="col-12 col-md-6">
            <label className="pf-field__label" htmlFor="pf-resource-phone">
              Kontak / Telepon
            </label>
            <input
              id="pf-resource-phone"
              type="text"
              className="form-control"
              value={values.phone}
              onChange={setField('phone')}
              placeholder="0812-0000-0000"
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="pf-field__label" htmlFor="pf-resource-capacity">
              Kapasitas (%)
            </label>
            <select
              id="pf-resource-capacity"
              className={`form-select ${errors.capacity ? 'is-invalid' : ''}`}
              value={values.capacity}
              onChange={setField('capacity')}
            >
              {RESOURCE_CAPACITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}%
                </option>
              ))}
            </select>
            {errorFor('capacity')}
          </div>

          <div className="col-12 col-md-4">
            <label className="pf-field__label" htmlFor="pf-resource-cost">
              Biaya / hari ({currency})
            </label>
            <input
              id="pf-resource-cost"
              type="number"
              min="0"
              step="1000"
              className={`form-control ${errors.cost ? 'is-invalid' : ''}`}
              value={values.cost}
              onChange={setField('cost')}
            />
            {errorFor('cost')}
          </div>

          <div className="col-12">
            <label className="pf-field__label" htmlFor="pf-resource-notes">
              Catatan
            </label>
            <textarea
              id="pf-resource-notes"
              className="form-control"
              rows={2}
              value={values.notes}
              onChange={setField('notes')}
              placeholder="Spesialisasi, batasan, atau catatan alokasi."
            />
          </div>
        </div>

        <div className="pf-form-actions">
          <button type="submit" className="btn btn-primary btn-sm">
            <Icon name="check" size={16} className="me-1" />
            {isEdit ? 'Simpan Perubahan' : 'Simpan Personel'}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
            Batal
          </button>
        </div>
      </form>
    </section>
  )
}
