import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/dataContext.js'
import StatCard from '../components/dashboard/StatCard.jsx'
import Icon from '../components/common/Icon.jsx'
import { computeSchedule } from '../utils/schedule.js'
import { daysFromToday, formatDate } from '../utils/date.js'

const STATUS_TONE = {
  Selesai: 'success',
  Berjalan: 'primary',
  'Belum Mulai': 'secondary',
  Tertunda: 'warning',
}

function statusClass(status) {
  return `pf-badge pf-badge--${STATUS_TONE[status] ?? 'secondary'}`
}

export default function Dashboard() {
  const { projects, tasks, resources, settings, resetToSeed } = useData()

  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === 'Berjalan').length
    const activeTasks = tasks.filter((t) => t.status === 'Berjalan').length
    const doneTasks = tasks.filter((t) => t.status === 'Selesai').length
    const avgProgress = projects.length
      ? Math.round(projects.reduce((sum, p) => sum + (p.progress ?? 0), 0) / projects.length)
      : 0
    // Tugas terlambat: belum selesai dan tanggal Lewat sudah terlewati.
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'Selesai' && daysFromToday(t.endDate) < 0,
    ).length

    return { activeProjects, activeTasks, doneTasks, avgProgress, overdueTasks }
  }, [projects, tasks])

  // Ringkasan jadwal + jalur kritis dihitung dari data yang sama dengan Gantt.
  const scheduleInsights = useMemo(() => {
    const list = projects
      .map((project) => {
        const schedule = computeSchedule(tasks, settings, { projectId: project.id })
        if (schedule.leafCount === 0) return null

        const criticalTasks = schedule.tasks.filter((row) => schedule.criticalIds.has(row.id))
        const criticalTotal = criticalTasks.reduce((sum, row) => sum + row.duration, 0)

        return {
          project,
          duration: schedule.duration,
          start: schedule.projectStart,
          finish: schedule.projectFinish,
          criticalCount: criticalTasks.length,
          activityCount: schedule.leafCount,
          criticalShare: schedule.duration
            ? Math.round((criticalTotal / schedule.duration) * 100)
            : 0,
          pathCount: schedule.paths.length,
          criticalNames: criticalTasks
            .slice(0, 4)
            .map((row) => row.task.code || row.task.name),
          ok: schedule.ok,
        }
      })
      .filter(Boolean)

    return {
      list,
      totalDuration: list.reduce((sum, item) => sum + item.duration, 0),
      criticalTotal: list.reduce((sum, item) => sum + item.criticalCount, 0),
      withIssues: list.filter((item) => !item.ok).length,
    }
  }, [projects, settings, tasks])

  // Tugas yang perlu perhatian: belum selesai dan tenggatnya paling dekat.
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'Selesai')
      .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
      .slice(0, 5)
  }, [tasks])

  const workload = useMemo(() => {
    return resources.map((resource) => {
      const assigned = tasks.filter(
        (t) => t.assigneeId === resource.id && t.status !== 'Selesai',
      )
      return { ...resource, activeTaskCount: assigned.length }
    })
  }, [resources, tasks])

  const projectName = (projectId) =>
    projects.find((p) => p.id === projectId)?.name ?? 'Tanpa proyek'

  return (
    <div className="pf-dashboard">
      {/* Banner sambutan */}
      <section className="pf-hero">
        <div className="pf-hero__text">
          <span className="pf-chip pf-chip--ghost">Manajemen Proyek & Penjadwalan</span>
          <h2>Selamat datang di ProjectFlow</h2>
          <p>
            Aplikasi manajemen proyek dengan pendekatan penjadwalan ala GanttProject: definisi
            aktivitas, durasi, dependensi, Gantt chart, diagram jaringan, dan jalur kritis.
            Dashboard ini merangkum seluruh proyek, tugas, dan sumber daya dalam satu tampilan.
          </p>
          <div className="pf-hero__actions">
            <Link to="/projects" className="btn btn-primary btn-sm">
              <Icon name="folder" size={16} className="me-1" /> Kelola Proyek
            </Link>
            <Link to="/gantt" className="btn btn-outline-light btn-sm">
              <Icon name="bars" size={16} className="me-1" /> Lihat Gantt Chart
            </Link>
          </div>
        </div>
        <div className="pf-hero__meter">
          <div className="pf-hero__meter-value">{stats.avgProgress}%</div>
          <div className="pf-hero__meter-label">Rata-rata progres proyek</div>
          <div className="progress pf-hero__meter-bar" role="progressbar" aria-label="Rata-rata progres">
            <div className="progress-bar" style={{ width: `${stats.avgProgress}%` }} />
          </div>
        </div>
      </section>

      {/* Kartu statistik */}
      <section className="row g-3 pf-section">
        <div className="col-6 col-lg-3">
          <StatCard
            icon="folder"
            label="Total Proyek"
            value={projects.length}
            hint={`${stats.activeProjects} sedang berjalan`}
            tone="primary"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon="list"
            label="Tugas Aktif"
            value={stats.activeTasks}
            hint={`${tasks.length} tugas total`}
            tone="success"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon="check"
            label="Tugas Selesai"
            value={stats.doneTasks}
            hint="Ditandai selesai"
            tone="purple"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon="users"
            label="Sumber Daya"
            value={resources.length}
            hint="Anggota tim"
            tone="warning"
          />
        </div>
      </section>

      <div className="row g-3 pf-section">
        <div className="col-6 col-lg-3">
          <StatCard
            icon="warning"
            label="Tugas Terlambat"
            value={stats.overdueTasks}
            hint="tenggat sudah lewat"
            tone="warning"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon="clock"
            label="Durasi Terjadwal"
            value={`${scheduleInsights.totalDuration} hari`}
            hint="total hari kerja proyek"
            tone="success"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon="target"
            label="Aktivitas Kritis"
            value={scheduleInsights.criticalTotal}
            hint="slack 0 hari kerja"
            tone="purple"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon="bars"
            label="Total Tugas"
            value={tasks.length}
            hint={`${stats.activeTasks} sedang berjalan`}
            tone="primary"
          />
        </div>
      </div>

      <div className="row g-3 pf-section">
        {/* Ringkasan jadwal & jalur kritis */}
        <div className="col-12 col-xl-7">
          <div className="pf-card h-100">
            <div className="pf-card__head">
              <h3>Ringkasan Jadwal & Jalur Kritis</h3>
              <Link to="/critical-path" className="pf-link">
                Analisis lengkap <Icon name="trending" size={15} />
              </Link>
            </div>
            <div className="pf-card__body pf-card__body--flush">
              {scheduleInsights.list.length === 0 && (
                <p className="pf-empty px-3">
                  Belum ada proyek dengan aktivitas untuk dihitung jadwalnya.
                </p>
              )}
              <ul className="pf-schedule-list">
                {scheduleInsights.list.map((item) => (
                  <li key={item.project.id} className="pf-schedule">
                    <div className="pf-schedule__top">
                      <div className="pf-schedule__name">
                        <span className="pf-dot" style={{ background: item.project.color }} />
                        <div>
                          <strong>{item.project.name}</strong>
                          <small>
                            {formatDate(item.start)} - {formatDate(item.finish)} ·{' '}
                            {item.activityCount} aktivitas · {item.pathCount} jalur
                          </small>
                        </div>
                      </div>
                      <span className={`pf-badge pf-badge--${item.ok ? 'success' : 'warning'}`}>
                        {item.duration} hari kerja
                      </span>
                    </div>
                    <div className="pf-schedule__meter">
                      <div className="progress" role="progressbar" aria-label="Porsi jalur kritis">
                        <div
                          className="progress-bar bg-danger"
                          style={{ width: `${item.criticalShare}%` }}
                        />
                      </div>
                      <span>
                        {item.criticalCount} aktivitas kritis ({item.criticalShare}% durasi)
                      </span>
                    </div>
                    <div className="pf-schedule__chips">
                      {item.criticalNames.map((name) => (
                        <span key={name} className="pf-chip pf-chip--soft">
                          {name}
                        </span>
                      ))}
                      {!item.ok && (
                        <span className="pf-chip pf-chip--soft">
                          <Icon name="warning" size={14} /> ada siklus dependensi
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>

      <div className="row g-3 pf-section">
        {/* Progres proyek */}
        <div className="col-12 col-xl-7">
          <div className="pf-card h-100">
            <div className="pf-card__head">
              <h3>Progres Proyek</h3>
              <Link to="/projects" className="pf-link">
                Kelola <Icon name="trending" size={15} />
              </Link>
            </div>
            <div className="pf-card__body">
              {projects.length === 0 && <p className="pf-empty">Belum ada proyek.</p>}
              {projects.map((project) => (
                <div className="pf-progress-row" key={project.id}>
                  <div className="pf-progress-row__top">
                    <div className="pf-progress-row__name">
                      <span className="pf-dot" style={{ background: project.color }} />
                      <div>
                        <strong>{project.name}</strong>
                        <small>
                          {project.code} · {formatDate(project.startDate)} – {formatDate(project.endDate)}
                        </small>
                      </div>
                    </div>
                    <span className={statusClass(project.status)}>{project.status}</span>
                  </div>
                  <div className="pf-progress-row__bar">
                    <div className="progress" role="progressbar" aria-label={`Progres ${project.name}`}>
                      <div
                        className="progress-bar"
                        style={{ width: `${project.progress}%`, background: project.color }}
                      />
                    </div>
                    <span className="pf-progress-row__value">{project.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tenggat terdekat */}
        <div className="col-12 col-xl-5">
          <div className="pf-card h-100">
            <div className="pf-card__head">
              <h3>Tenggat Terdekat</h3>
              <Link to="/tasks" className="pf-link">
                Semua tugas <Icon name="trending" size={15} />
              </Link>
            </div>
            <div className="pf-card__body pf-card__body--flush">
              {upcomingTasks.length === 0 && <p className="pf-empty">Tidak ada tugas aktif.</p>}
              <ul className="pf-deadline-list">
                {upcomingTasks.map((task) => {
                  const remaining = daysFromToday(task.endDate)
                  const overdue = remaining !== null && remaining < 0
                  return (
                    <li key={task.id} className="pf-deadline">
                      <span className={`pf-deadline__day ${overdue ? 'is-overdue' : ''}`}>
                        {overdue ? 'Lewat' : `${remaining}h`}
                      </span>
                      <div className="pf-deadline__info">
                        <strong>{task.name}</strong>
                        <small>{projectName(task.projectId)}</small>
                      </div>
                      <span className="pf-deadline__date">
                        <Icon name={overdue ? 'warning' : 'clock'} size={14} />
                        {formatDate(task.endDate)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 pf-section">
        {/* Beban kerja tim */}
        <div className="col-12 col-lg-6">
          <div className="pf-card h-100">
            <div className="pf-card__head">
              <h3>Beban Kerja Tim</h3>
              <Link to="/resources" className="pf-link">
                Sumber daya <Icon name="trending" size={15} />
              </Link>
            </div>
            <div className="pf-card__body">
              {workload.map((member) => (
                <div className="pf-member" key={member.id}>
                  <span className="pf-member__avatar">
                    {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </span>
                  <div className="pf-member__info">
                    <strong>{member.name}</strong>
                    <small>{member.role}</small>
                  </div>
                  <span className="pf-chip pf-chip--soft">
                    {member.activeTaskCount} tugas aktif
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Distribusi status tugas */}
        <div className="col-12 col-lg-6">
          <div className="pf-card h-100">
            <div className="pf-card__head">
              <h3>Distribusi Status Tugas</h3>
            </div>
            <div className="pf-card__body">
              {[
                { label: 'Selesai', tone: 'success' },
                { label: 'Berjalan', tone: 'primary' },
                { label: 'Belum Mulai', tone: 'secondary' },
                { label: 'Tertunda', tone: 'warning' },
              ].map(({ label, tone }) => {
                const count = tasks.filter((t) => t.status === label).length
                const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0
                return (
                  <div className="pf-status-row" key={label}>
                    <div className="pf-status-row__top">
                      <span className={`pf-badge pf-badge--${tone}`}>{label}</span>
                      <span>{count} tugas · {pct}%</span>
                    </div>
                    <div className="progress" role="progressbar" aria-label={label}>
                      <div className={`progress-bar bg-${tone}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}

              <div className="pf-info-note">
                <Icon name="warning" size={16} />
                <span>
                  Data ini disimpan sementara di LocalStorage browser. Gunakan tombol di bawah
                  untuk mengembalikan data contoh.
                </span>
              </div>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetToSeed}>
                Muat ulang data contoh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
