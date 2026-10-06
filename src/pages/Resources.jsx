import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/common/Icon.jsx'
import ResourceForm from '../components/common/ResourceForm.jsx'
import { useData } from '../context/dataContext.js'
import { formatCurrency } from '../data/settingsSchema.js'
import { createWorkCalendar } from '../utils/workCalendar.js'
import { formatDate } from '../utils/date.js'
import { initials } from '../utils/presentation.js'

// Halaman Sumber Daya: CRUD personel + alokasi personel ke tugas.
// Personnel yang dihapus otomatis dilepas dari tugas (lihat DataProvider).
export default function Resources() {
  const {
    resources,
    tasks,
    projects,
    settings,
    addResource,
    updateResource,
    removeResource,
    updateTask,
  } = useData()

  const [form, setForm] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [notice, setNotice] = useState(null)

  const calendar = useMemo(() => createWorkCalendar(settings), [settings])

  // Ringkasan alokasi per personel: jumlah tugas, hari kerja, dan biaya.
  const workload = useMemo(
    () =>
      resources.map((resource) => {
        const assigned = tasks.filter((task) => task.assigneeId === resource.id)
        const workingDays = assigned.reduce(
          (sum, task) => sum + (calendar.taskDuration(task.startDate, task.endDate) || 0),
          0,
        )
        const active = assigned.filter((task) => task.status !== 'Selesai')

        return {
          ...resource,
          taskCount: assigned.length,
          activeCount: active.length,
          workingDays,
          estimatedCost: workingDays * (resource.cost ?? 0),
        }
      }),
    [calendar, resources, tasks],
  )

  const taskName = (task) =>
    `${task.code ? `${task.code} · ` : ''}${task.name} (${formatDate(task.startDate)})`

  const showNotice = (tone, text) => setNotice({ tone, text })

  const handleSubmit = (values) => {
    if (form.mode === 'edit') {
      updateResource(form.resource.id, values)
      showNotice('success', `Personel "${values.name}" berhasil diperbarui.`)
    } else {
      addResource(values)
      showNotice('success', `Personel "${values.name}" berhasil ditambahkan.`)
    }
    setForm(null)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    removeResource(pendingDelete.id)
    showNotice(
      'success',
      `Personel "${pendingDelete.name}" dihapus dan dilepas dari tugas yang terkait.`,
    )
    setPendingDelete(null)
  }

  const totalCost = workload.reduce((sum, member) => sum + member.estimatedCost, 0)

  return (
    <div className="pf-page">
      <div className="pf-page__head d-flex flex-wrap gap-2 justify-content-between align-items-start">
        <div>
          <h2>Sumber Daya</h2>
          <p>Kelola personel, peran, biaya harian, dan alokasi ke setiap tugas.</p>
        </div>
        {!form && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setNotice(null)
              setPendingDelete(null)
              setForm({ mode: 'create', resource: null })
            }}
          >
            <Icon name="users" size={16} className="me-1" /> Personel Baru
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
        <ResourceForm
          initialResource={form.resource}
          currency={settings.currency}
          onSubmit={handleSubmit}
          onCancel={() => setForm(null)}
        />
      )}

      <div className="pf-mini-stats">
        <span className="pf-chip pf-chip--soft">{resources.length} personel</span>
        <span className="pf-chip pf-chip--soft">
          {tasks.filter((task) => task.assigneeId).length} tugas teralokasi
        </span>
        <span className="pf-chip pf-chip--soft">
          Estimasi biaya {formatCurrency(totalCost, settings.currency)}
        </span>
      </div>

      {resources.length === 0 ? (
        <div className="pf-empty-state">
          <span className="pf-empty-state__icon">
            <Icon name="users" size={26} />
          </span>
          <h3>Belum ada personel</h3>
          <p>Tambahkan anggota tim agar tugas dapat ditugaskan.</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setForm({ mode: 'create', resource: null })}
          >
            <Icon name="users" size={16} className="me-1" /> Personel Baru
          </button>
        </div>
      ) : (
        <div className="pf-card">
          <div className="table-responsive">
            <table className="table align-middle pf-table mb-0" id="pf-resource-table">
              <thead>
                <tr>
                  <th>Personel</th>
                  <th>Kontak</th>
                  <th>Kapasitas</th>
                  <th>Biaya / hari</th>
                  <th>Alokasi</th>
                  <th>Catatan</th>
                  <th className="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="pf-person">
                        <span className="pf-member__avatar">{initials(member.name)}</span>
                        <div>
                          <strong>{member.name}</strong>
                          <small>{member.role}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {member.email || '-'}
                      {member.phone && (
                        <small className="d-block text-secondary">{member.phone}</small>
                      )}
                    </td>
                    <td>
                      <span className="pf-chip pf-chip--soft">{member.capacity}%</span>
                    </td>
                    <td>{formatCurrency(member.cost, settings.currency)}</td>
                    <td>
                      <strong>{member.taskCount} tugas</strong>
                      <small className="d-block text-secondary">
                        {member.activeCount} aktif · {member.workingDays} hari kerja
                      </small>
                    </td>
                    <td className="pf-table__notes">{member.notes || '-'}</td>
                    <td>
                      <div className="pf-cell-actions justify-content-end">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            setNotice(null)
                            setPendingDelete(null)
                            setForm({ mode: 'edit', resource: member })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            setForm(null)
                            setNotice(null)
                            setPendingDelete(member)
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="pf-card pf-section">
        <div className="pf-card__head">
          <h3>Alokasi Personel ke Tugas</h3>
          <Link to="/tasks" className="pf-link">
            Kelola tugas <Icon name="trending" size={15} />
          </Link>
        </div>
        <div className="table-responsive">
          {tasks.length === 0 ? (
            <p className="pf-empty px-3">Belum ada tugas untuk dialokasikan.</p>
          ) : (
            <table className="table align-middle pf-table mb-0" id="pf-assign-table">
              <thead>
                <tr>
                  <th>Tugas</th>
                  <th>Proyek</th>
                  <th>Penanggung jawab</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{taskName(task)}</td>
                    <td>{projects.find((p) => p.id === task.projectId)?.name ?? 'Tanpa proyek'}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        aria-label={`Penanggung jawab ${task.name}`}
                        value={task.assigneeId ?? ''}
                        onChange={(event) =>
                          updateTask(task.id, { assigneeId: event.target.value || null })
                        }
                      >
                        <option value="">-- Belum ditentukan --</option>
                        {resources.map((resource) => (
                          <option key={resource.id} value={resource.id}>
                            {resource.name} ({resource.role})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        className={`pf-badge pf-badge--${
                          task.status === 'Selesai'
                            ? 'success'
                            : task.status === 'Berjalan'
                              ? 'primary'
                              : task.status === 'Tertunda'
                                ? 'warning'
                                : 'secondary'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {pendingDelete && (
        <div className="pf-dialog-backdrop" role="presentation">
          <div className="pf-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-res-dialog">
            <h3 id="pf-res-dialog">Hapus personel?</h3>
            <p>
              <strong>{pendingDelete.name}</strong> akan dihapus dan dilepas dari{' '}
              {tasks.filter((task) => task.assigneeId === pendingDelete.id).length} tugas. Riwayat
              tugas tidak ikut terhapus.
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
