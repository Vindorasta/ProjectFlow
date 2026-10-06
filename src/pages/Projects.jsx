import { useState } from 'react'
import { useData } from '../context/dataContext.js'
import { formatDate } from '../utils/date.js'
import Icon from '../components/common/Icon.jsx'
import ProjectForm from '../components/common/ProjectForm.jsx'

const STATUS_TONE = {
  Selesai: 'success',
  Berjalan: 'primary',
  'Belum Mulai': 'secondary',
  Tertunda: 'warning',
}

// Halaman Manajemen Proyek - CRUD penuh (create, read, update, delete).
// Data tetap disimpan lewat DataProvider (useLocalStorage), tidak ada
// sistem penyimpanan lain di halaman ini.
export default function Projects() {
  const { projects, tasks, addProject, updateProject, removeProject } = useData()

  // null = form tersembunyi; { mode, project } = form sedang aktif
  const [form, setForm] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [notice, setNotice] = useState(null)

  const taskCountOf = (projectId) =>
    tasks.filter((task) => task.projectId === projectId).length

  const showNotice = (tone, text) => setNotice({ tone, text })

  const openCreate = () => {
    setNotice(null)
    setPendingDelete(null)
    setForm({ mode: 'create', project: null })
  }

  const openEdit = (project) => {
    setNotice(null)
    setPendingDelete(null)
    setForm({ mode: 'edit', project })
  }

  const closeForm = () => setForm(null)

  const handleSubmit = (values) => {
    if (form.mode === 'edit') {
      // Perbarui berdasarkan id sehingga data lama tidak berubah menjadi duplikat.
      updateProject(form.project.id, values)
      showNotice('success', `Proyek "${values.name}" berhasil diperbarui.`)
    } else {
      addProject(values)
      showNotice('success', `Proyek "${values.name}" berhasil ditambahkan.`)
    }
    setForm(null)
  }

  // Minta konfirmasi hapus; proyek yang masih punya tugas langsung ditolak.
  const requestDelete = (project) => {
    setForm(null)
    const total = taskCountOf(project.id)
    if (total > 0) {
      showNotice(
        'warning',
        `Proyek "${project.name}" masih memiliki ${total} tugas. ` +
          'Selesaikan atau hapus tugas tersebut terlebih dahulu sebelum proyek dihapus.',
      )
      return
    }
    setNotice(null)
    setPendingDelete(project)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    // Sabuk pengaman: DataProvider juga menolak bila ada tugas.
    const result = removeProject(pendingDelete.id)
    if (result && result.ok === false) {
      setPendingDelete(null)
      showNotice(
        'warning',
        `Proyek "${pendingDelete.name}" masih memiliki tugas dan tidak dapat dihapus.`,
      )
      return
    }
    showNotice('success', `Proyek "${pendingDelete.name}" telah dihapus.`)
    setPendingDelete(null)
  }

  return (
    <div className="pf-page">
      <div className="pf-page__head d-flex flex-wrap gap-2 justify-content-between align-items-start">
        <div>
          <h2>Manajemen Proyek</h2>
          <p>Kelola daftar proyek, jadwal, dan status pelaksanaan.</p>
        </div>
        {!form && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Icon name="list" size={16} className="me-1" /> Proyek Baru
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`pf-notice pf-notice--${notice.tone}`}
          role="status"
          aria-live="polite"
        >
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
        <ProjectForm
          initialProject={form.project}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      {projects.length === 0 ? (
        <div className="pf-empty-state">
          <span className="pf-empty-state__icon">
            <Icon name="folder" size={26} />
          </span>
          <h3>Belum ada proyek</h3>
          <p>Mulai dengan membuat proyek pertama Anda.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <Icon name="list" size={16} className="me-1" /> Proyek Baru
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {projects.map((project) => {
            const total = taskCountOf(project.id)
            return (
              <div className="col-12 col-md-6 col-xl-4" key={project.id}>
                <div className="pf-project-card">
                  <div className="pf-project-card__bar" style={{ background: project.color }} />
                  <div className="pf-project-card__body">
                    <div className="pf-project-card__head">
                      <strong>{project.name}</strong>
                      <span className={`pf-badge pf-badge--${STATUS_TONE[project.status] ?? 'secondary'}`}>
                        {project.status}
                      </span>
                    </div>
                    <small className="pf-project-card__code">{project.code || 'Tanpa kode'}</small>
                    <p>{project.description || 'Tanpa deskripsi.'}</p>
                    <div className="d-flex justify-content-between small text-secondary">
                      <span>
                        <Icon name="calendar" size={14} /> {formatDate(project.startDate)}
                      </span>
                      <span>{formatDate(project.endDate)}</span>
                    </div>
                    <div className="pf-project-card__progress">
                      <div
                        className="progress"
                        role="progressbar"
                        aria-label={`Progres ${project.name}`}
                        aria-valuenow={project.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="progress-bar"
                          style={{ width: `${project.progress}%`, background: project.color }}
                        />
                      </div>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="pf-project-card__foot">
                      <span className="pf-chip pf-chip--soft">{total} tugas</span>
                      <div className="pf-project-card__actions">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => openEdit(project)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => requestDelete(project)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog konfirmasi hapus. Dibuat manual (bukan Modal Bootstrap) karena
          JavaScript Bootstrap belum diimpor. */}
      {pendingDelete && (
        <div className="pf-dialog-backdrop" role="presentation">
          <div
            className="pf-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pf-dialog-title"
          >
            <h3 id="pf-dialog-title">Hapus proyek?</h3>
            <p>
              Proyek <strong>{pendingDelete.name}</strong> akan dihapus permanen dari
              LocalStorage browser ini. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="pf-dialog__actions">
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={confirmDelete}
              >
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