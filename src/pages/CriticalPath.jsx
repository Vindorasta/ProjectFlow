import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/common/Icon.jsx'
import ProjectPicker from '../components/common/ProjectPicker.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import { useData } from '../context/dataContext.js'
import { useProjectSchedule } from '../hooks/useProjectSchedule.js'
import { formatDate } from '../utils/date.js'
import { dayLabel } from '../utils/presentation.js'

// Halaman Jalur Kritis (CPM).
// Angka ES/EF/LS/LF/slack dihitung dari dependensi + durasi kerja tugas,
// bukan nilai yang ditulis manual. Halaman ini juga bisa "menerapkan" jadwal
// hasil hitungan ke data tugas sehingga Gantt ikut berubah.
export default function CriticalPath() {
  const { tasks, updateTask } = useData()
  const { projects: allProjects, project, projectId, setProjectId, schedule } =
    useProjectSchedule()

  const [applyConfirm, setApplyConfirm] = useState(false)
  const [notice, setNotice] = useState(null)

  const counts = useMemo(() => {
    const map = {}
    tasks.forEach((task) => {
      map[task.projectId] = (map[task.projectId] ?? 0) + 1
    })
    return map
  }, [tasks])

  const rows = useMemo(() => {
    return [...schedule.tasks].sort((a, b) => {
      if (a.es !== b.es) return (a.es || '').localeCompare(b.es || '')
      return (a.task.code || a.task.name).localeCompare(b.task.code || b.task.name)
    })
  }, [schedule])

  const sortedPaths = useMemo(
    () => [...schedule.paths].sort((a, b) => b.duration - a.duration),
    [schedule.paths],
  )

  const criticalRows = rows.filter((row) => schedule.criticalIds.has(row.id))

  // Tugas yang tanggal tersimpannya berbeda dari tanggal hasil hitungan CPM.
  const drifted = useMemo(
    () =>
      schedule.tasks.filter(
        (row) => row.es && (row.task.startDate !== row.es || row.task.endDate !== row.ef),
      ),
    [schedule.tasks],
  )

  const nameOf = (id) => {
    const row = schedule.byId.get(id)
    return row ? row.task.code || row.task.name : id
  }

  const applySchedule = () => {
    schedule.tasks.forEach((row) => {
      if (!row.es || !row.ef) return
      if (row.task.startDate === row.es && row.task.endDate === row.ef) return
      updateTask(row.id, { startDate: row.es, endDate: row.ef })
    })
    setApplyConfirm(false)
    setNotice({
      tone: 'success',
      text: `Jadwal hasil perhitungan CPM diterapkan ke ${drifted.length} aktivitas. Gantt chart ikut diperbarui.`,
    })
  }

  return (
    <div className="pf-page">
      <div className="pf-page__head d-flex flex-wrap gap-2 justify-content-between align-items-start">
        <div>
          <h2>Jalur Kritis</h2>
          <p>
            Jalur terpanjang dari awal sampai akhir - aktivitas di jalur ini menentukan durasi
            proyek.
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
          <Icon name="check" size={17} />
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

      {schedule.leafCount === 0 ? (
        <div className="pf-empty-state">
          <span className="pf-empty-state__icon">
            <Icon name="target" size={26} />
          </span>
          <h3>Belum ada aktivitas untuk dianalisis</h3>
          <p>Tambahkan tugas dan dependensi agar jalur kritis dapat dihitung.</p>
          <Link to="/dependencies" className="btn btn-primary btn-sm">
            <Icon name="link" size={16} className="me-1" /> Atur Dependensi
          </Link>
        </div>
      ) : (
        <>
          {(!schedule.ok || schedule.issues.dangling.length > 0) && (
            <div className="pf-notice pf-notice--warning" role="status">
              <Icon name="warning" size={17} />
              <span>
                Perhitungan berjalan dengan data yang sudah dibersihkan otomatis:{' '}
                {schedule.issues.cycles.length} dependensi melingkar dan{' '}
                {schedule.issues.dangling.length} dependensi tidak valid diabaikan.{' '}
                <Link to="/dependencies" className="pf-link">
                  Perbaiki sekarang
                </Link>
              </span>
            </div>
          )}

          <div className="row g-3 pf-section">
            <div className="col-6 col-lg-3">
              <StatCard
                icon="clock"
                label="Durasi Proyek"
                value={`${schedule.duration} hari`}
                hint={`${formatDate(schedule.projectStart)} - ${formatDate(schedule.projectFinish)}`}
                tone="primary"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="target"
                label="Aktivitas Kritis"
                value={criticalRows.length}
                hint={`dari ${schedule.leafCount} aktivitas`}
                tone="purple"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="share"
                label="Jumlah Jalur"
                value={schedule.paths.length}
                hint={schedule.pathsTruncated ? 'daftar dibatasi 500 jalur' : 'jalur awal ke akhir'}
                tone="warning"
              />
            </div>
            <div className="col-6 col-lg-3">
              <StatCard
                icon="trending"
                label="Slack Terbesar"
                value={`${Math.max(...rows.map((row) => row.slack))} hari`}
                hint="kelonggaran aktivitas paling fleksibel"
                tone="success"
              />
            </div>
          </div>

          <section className="pf-card pf-section">
            <div className="pf-card__head">
              <h3>Jalur Kritis (terpanjang)</h3>
              <span className="pf-chip pf-chip--soft">
                {schedule.criticalPath.length} aktivitas · {dayLabel(schedule.duration)}
              </span>
            </div>
            <div className="pf-card__body">
              {schedule.criticalPath.length === 0 ? (
                <p className="pf-empty">Belum ada jalur yang dapat dihitung.</p>
              ) : (
                <div className="pf-path-chain">
                  {schedule.criticalPath.map((id, index) => (
                    <span key={id} className="pf-path-chain__item">
                      <span className="pf-path-chain__code">
                        {schedule.byId.get(id)?.task.code || nameOf(id)}
                      </span>
                      <span className="pf-path-chain__name">
                        {schedule.byId.get(id)?.task.name ?? id}
                      </span>
                      <span className="pf-path-chain__dur">
                        {schedule.byId.get(id)?.duration ?? 0} hari
                      </span>
                      {index < schedule.criticalPath.length - 1 && (
                        <Icon name="link" size={14} className="pf-path-chain__arrow" />
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="pf-card pf-section">
            <div className="pf-card__head">
              <h3>Perhitungan Aktivitas</h3>
              <div className="pf-card__actions">
                {drifted.length > 0 && !applyConfirm && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setApplyConfirm(true)}
                  >
                    Terapkan jadwal ({drifted.length} aktivitas)
                  </button>
                )}
              </div>
            </div>
            <div className="table-responsive">
              <table className="table align-middle pf-table mb-0" id="pf-cpm-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Aktivitas</th>
                    <th>Durasi</th>
                    <th>ES</th>
                    <th>EF</th>
                    <th>LS</th>
                    <th>LF</th>
                    <th>Slack</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={schedule.criticalIds.has(row.id) ? 'is-critical-row' : ''}
                    >
                      <td className="fw-semibold">{row.task.code || '-'}</td>
                      <td>
                        {row.task.name}
                        {row.childCount > 0 && (
                          <span className="pf-chip pf-chip--soft ms-2">
                            ringkasan {row.childCount} subtask
                          </span>
                        )}
                      </td>
                      <td>{dayLabel(row.duration)}</td>
                      <td>{formatDate(row.es)}</td>
                      <td>{formatDate(row.ef)}</td>
                      <td>{formatDate(row.ls)}</td>
                      <td>{formatDate(row.lf)}</td>
                      <td>{row.slack} hari</td>
                      <td>
                        <span
                          className={`pf-badge pf-badge--${
                            schedule.criticalIds.has(row.id) ? 'danger' : 'secondary'
                          }`}
                        >
                          {schedule.criticalIds.has(row.id) ? 'KRITIS' : 'Fleksibel'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pf-card__foot">
              <p className="pf-hint mb-0">
                ES/EF = mulai &amp; selesai paling awal, LS/LF = mulai &amp; selesai paling akhir.
                Slack 0 berarti aktivitas tidak boleh terlambat. Semua angka memakai kalender kerja
                aktif ({dayLabel(schedule.duration)} untuk rentang proyek).
              </p>
            </div>
          </section>

          <section className="pf-card pf-section">
            <div className="pf-card__head">
              <h3>Daftar Jalur ({schedule.paths.length})</h3>
              <span className="pf-chip pf-chip--soft">diurutkan dari yang terpanjang</span>
            </div>
            <div className="pf-card__body">
              {schedule.paths.length === 0 ? (
                <p className="pf-empty">Belum ada jalur (setiap aktivitas sudah merupakan akhir).</p>
              ) : (
                <ol className="pf-path-list">
                  {sortedPaths.slice(0, 25).map((path, index) => {
                    const longest = path.duration === sortedPaths[0]?.duration
                    return (
                      <li key={path.ids.join('-')} className={longest ? 'is-longest' : ''}>
                        <span className="pf-path-list__rank">#{index + 1}</span>
                        <span className="pf-path-list__codes">
                          {path.ids.map((id) => nameOf(id)).join(' → ')}
                        </span>
                        <span className="pf-path-list__dur">{path.duration} hari</span>
                        {longest && <span className="pf-badge pf-badge--purple">terpanjang</span>}
                      </li>
                    )
                  })}
                </ol>
              )}
              {schedule.paths.length > 25 && (
                <p className="pf-hint">Menampilkan 25 jalur terpanjang dari {schedule.paths.length}.</p>
              )}
            </div>
          </section>

          {project && (
            <p className="pf-hint">
              Analisis untuk proyek <strong>{project.name}</strong> · {schedule.leafCount} aktivitas
              daun dihitung, {schedule.scopedCount - schedule.leafCount} baris ringkasan induk
              aktivitas mengikuti jadwal anak-anaknya.
            </p>
          )}
        </>
      )}

      {applyConfirm && (
        <div className="pf-dialog-backdrop" role="presentation">
          <div className="pf-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-apply-title">
            <h3 id="pf-apply-title">Terapkan jadwal hasil hitungan?</h3>
            <p>
              Tanggal mulai &amp; selesai <strong>{drifted.length} aktivitas</strong> akan diganti
              dengan hasil perhitungan CPM (ES/EF) agar Gantt chart dan jalur kritis memakai jadwal
              yang sama. Durasi, progres, dan dependensi tidak berubah.
            </p>
            <div className="pf-dialog__actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={applySchedule}>
                Ya, Terapkan
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setApplyConfirm(false)}
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
