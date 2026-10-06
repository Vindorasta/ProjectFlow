import { useMemo, useState } from 'react'
import Icon from '../components/common/Icon.jsx'
import { useData } from '../context/dataContext.js'
import { createWorkCalendar } from '../utils/workCalendar.js'
import { CURRENCY_OPTIONS, formatCurrency, validateHoliday } from '../data/settingsSchema.js'
import {
  DAY_NAMES,
  addDays,
  dayOfWeek,
  eachDay,
  formatDate,
  isValidDate,
  parseISODate,
  startOfWeek,
  toISODate,
  todayISO,
} from '../utils/date.js'

// Urutan label dimulai dari Senin (0 = Minggu pada getUTCDay).
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

// Halaman Kalender Kerja: hari kerja per minggu, jam kerja, hari libur,
// pratinjau bulan, dan kalkulator durasi kerja.
export default function WorkCalendar() {
  const { settings, setSettings, tasks } = useData()
  const [notice, setNotice] = useState(null)
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '' })
  const [holidayErrors, setHolidayErrors] = useState({})
  const [monthCursor, setMonthCursor] = useState(() => todayISO().slice(0, 7))
  const [calc, setCalc] = useState({ startDate: todayISO(), days: '5' })

  const calendar = useMemo(() => createWorkCalendar(settings), [settings])
  const workDays = settings.workDays ?? []

  const showNotice = (tone, text) => setNotice({ tone, text })

  const toggleWorkDay = (day) => {
    const next = workDays.includes(day)
      ? workDays.filter((item) => item !== day)
      : [...workDays, day].sort((a, b) => a - b)
    setSettings({ ...settings, workDays: next })
  }

  const setHours = (value) => {
    const hours = Number(value)
    setSettings({ ...settings, workHoursPerDay: Number.isFinite(hours) ? hours : settings.workHoursPerDay })
  }

  const addHoliday = (event) => {
    event.preventDefault()
    const found = validateHoliday(holidayForm.date, holidayForm.name, settings.holidays ?? [])
    if (found) {
      setHolidayErrors(found)
      return
    }
    setSettings({
      ...settings,
      holidays: [
        ...(settings.holidays ?? []),
        { date: holidayForm.date, name: holidayForm.name.trim() },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    })
    setHolidayForm({ date: '', name: '' })
    setHolidayErrors({})
    showNotice('success', `Hari libur ${formatDate(holidayForm.date)} ditambahkan.`)
  }

  const removeHoliday = (date) => {
    setSettings({
      ...settings,
      holidays: (settings.holidays ?? []).filter((holiday) => holiday.date !== date),
    })
    showNotice('success', `Hari libur ${formatDate(date)} dihapus.`)
  }

  // Pratinjau bulan: 6 minggu x 7 hari dimulai dari Senin.
  const monthDays = useMemo(() => {
    const first = `${monthCursor}-01`
    if (!isValidDate(first)) return []
    const cursor = parseISODate(first)
    const lastDay = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
    )
    const last = toISODate(lastDay)
    const gridStart = startOfWeek(first)
    const total = Math.max(35, eachDay(gridStart, last).length)
    const gridEnd = addDays(gridStart, Math.ceil(total / 7) * 7 - 1)
    return eachDay(gridStart, gridEnd)
  }, [monthCursor])

  const shiftMonth = (delta) => {
    const cursor = parseISODate(`${monthCursor}-01`)
    setMonthCursor(toISODate(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + delta, 1))).slice(0, 7))
  }

  // Kalkulator durasi kerja.
  const calcResult = useMemo(() => {
    const days = Math.max(1, Number(calc.days) || 0)
    if (!isValidDate(calc.startDate)) return null
    const endDate = calendar.addWorkingDays(calc.startDate, days)
    return {
      endDate,
      startLabel: formatDate(calc.startDate),
      endLabel: formatDate(endDate),
      skipped: Math.max(0, eachDay(calc.startDate, endDate).filter((date) => !calendar.isWorkingDay(date)).length),
      hours: days * (settings.workHoursPerDay ?? 8),
    }
  }, [calc, calendar, settings.workHoursPerDay])

  const holidayCount = (settings.holidays ?? []).length
  const holidaysThisYear = (settings.holidays ?? []).filter((holiday) =>
    holiday.date.startsWith(monthCursor.slice(0, 4)),
  ).length

  return (
    <div className="pf-page">
      <div className="pf-page__head">
        <h2>Kalender Kerja</h2>
        <p>
          Pengaturan ini dipakai perhitungan durasi tugas, penandaan hari non-kerja pada Gantt,
          dan mesin jalur kritis.
        </p>
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

      <div className="row g-3 pf-section">
        <div className="col-12 col-lg-6">
          <section className="pf-card h-100">
            <div className="pf-card__head">
              <h3>Hari Kerja per Minggu</h3>
              <span className="pf-chip pf-chip--soft">{workDays.length} hari aktif</span>
            </div>
            <div className="pf-card__body">
              <div className="pf-day-toggle">
                {WEEK_ORDER.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`pf-day-toggle__item ${workDays.includes(day) ? 'is-active' : ''}`}
                    onClick={() => toggleWorkDay(day)}
                    aria-pressed={workDays.includes(day)}
                  >
                    <strong>{DAY_NAMES[day]}</strong>
                    <small>hari ke-{day === 0 ? 7 : day}</small>
                  </button>
                ))}
              </div>

              <div className="row g-3 mt-1">
                <div className="col-12 col-sm-6">
                  <label className="pf-field__label" htmlFor="pf-work-hours">
                    Jam kerja per hari
                  </label>
                  <input
                    id="pf-work-hours"
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    className="form-control form-control-sm"
                    value={settings.workHoursPerDay ?? 8}
                    onChange={(event) => setHours(event.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="pf-field__label" htmlFor="pf-currency">
                    Mata uang biaya
                  </label>
                  <select
                    id="pf-currency"
                    className="form-select form-select-sm"
                    value={settings.currency ?? 'IDR'}
                    onChange={(event) => setSettings({ ...settings, currency: event.target.value })}
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pf-info-note mt-3">
                <Icon name="clock" size={16} />
                <span>
                  Durasi tugas dihitung dalam hari kerja. Contoh: tugas 5 hari kerja mulai{' '}
                  {formatDate('2026-06-01')} (Senin) berakhir {formatDate('2026-06-07')} karena
                  akhir pekan dilewati.
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="col-12 col-lg-6">
          <section className="pf-card h-100">
            <div className="pf-card__head">
              <h3>Pratinjau Bulan</h3>
              <div className="pf-card__actions">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Bulan sebelumnya"
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <span className="pf-chip pf-chip--soft">{monthCursor}</span>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => shiftMonth(1)}
                  aria-label="Bulan berikutnya"
                >
                  <Icon name="chevron-right" size={16} />
                </button>
              </div>
            </div>
            <div className="pf-card__body">
              <div className="pf-calendar">
                {WEEK_ORDER.map((day) => (
                  <div key={day} className="pf-calendar__head">
                    {DAY_NAMES[day].slice(0, 3)}
                  </div>
                ))}
                {monthDays.map((date) => {
                  const inMonth = date.slice(0, 7) === monthCursor
                  const holiday = calendar.holidayMap.get(date)
                  const working = calendar.isWorkingDay(date)
                  return (
                    <div
                      key={date}
                      className={[
                        'pf-calendar__cell',
                        inMonth ? '' : 'is-outside',
                        working ? '' : 'is-nonworking',
                        holiday ? 'is-holiday' : '',
                        date === todayISO() ? 'is-today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={holiday ? holiday.name : working ? 'Hari kerja' : 'Hari non-kerja'}
                    >
                      <span>{Number(date.slice(8, 10))}</span>
                      {holiday && <small>{holiday.name.slice(0, 6)}</small>}
                    </div>
                  )
                })}
              </div>
              <div className="pf-calendar__legend">
                <span className="pf-chip pf-chip--soft">Hari kerja</span>
                <span className="pf-chip pf-chip--soft is-nonworking">Akhir pekan</span>
                <span className="pf-chip pf-chip--soft is-holiday">Hari libur</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="pf-card pf-section">
        <div className="pf-card__head">
          <h3>Hari Libur</h3>
          <span className="pf-chip pf-chip--soft">
            {holidayCount} terdaftar · {holidaysThisYear} pada tahun berjalan
          </span>
        </div>
        <div className="pf-card__body">
          <form className="pf-holiday-form" onSubmit={addHoliday}>
            <div>
              <label className="pf-field__label" htmlFor="pf-holiday-date">
                Tanggal <span className="pf-required">*</span>
              </label>
              <input
                id="pf-holiday-date"
                type="date"
                className={`form-control form-control-sm ${holidayErrors.date ? 'is-invalid' : ''}`}
                value={holidayForm.date}
                onChange={(event) => {
                  setHolidayForm((prev) => ({ ...prev, date: event.target.value }))
                  setHolidayErrors((prev) => ({ ...prev, date: '' }))
                }}
              />
              {holidayErrors.date && <div className="pf-field__error">{holidayErrors.date}</div>}
            </div>
            <div>
              <label className="pf-field__label" htmlFor="pf-holiday-name">
                Nama <span className="pf-required">*</span>
              </label>
              <input
                id="pf-holiday-name"
                type="text"
                className={`form-control form-control-sm ${holidayErrors.name ? 'is-invalid' : ''}`}
                value={holidayForm.name}
                onChange={(event) => {
                  setHolidayForm((prev) => ({ ...prev, name: event.target.value }))
                  setHolidayErrors((prev) => ({ ...prev, name: '' }))
                }}
                placeholder="Contoh: Hari Raya Natal"
              />
              {holidayErrors.name && <div className="pf-field__error">{holidayErrors.name}</div>}
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              <Icon name="calendar" size={16} className="me-1" /> Tambah
            </button>
          </form>

          {holidayCount === 0 ? (
            <p className="pf-empty">Belum ada hari libur. Akhir pekan tetap non-kerja.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle pf-table mb-0" id="pf-holiday-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Hari</th>
                    <th>Nama</th>
                    <th>Dampak</th>
                    <th className="text-end">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.holidays.map((holiday) => {
                    const affected = tasks.filter((task) => {
                      const start = parseISODate(task.startDate)
                      const end = parseISODate(task.endDate)
                      const target = parseISODate(holiday.date)
                      if (!start || !end || !target) return false
                      return target.getTime() >= start.getTime() && target.getTime() <= end.getTime()
                    }).length

                    return (
                      <tr key={holiday.date}>
                        <td>{formatDate(holiday.date)}</td>
                        <td>{DAY_NAMES[dayOfWeek(holiday.date) ?? 0]}</td>
                        <td>{holiday.name}</td>
                        <td>
                          {affected > 0 ? (
                            <span className="pf-chip pf-chip--soft">{affected} tugas terdampak</span>
                          ) : (
                            <span className="text-secondary">-</span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeHoliday(holiday.date)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="pf-card pf-section">
        <div className="pf-card__head">
          <h3>Kalkulator Durasi Kerja</h3>
          <span className="pf-chip pf-chip--soft">
            {settings.workHoursPerDay ?? 8} jam/hari kerja
          </span>
        </div>
        <div className="pf-card__body">
          <div className="pf-calc">
            <div>
              <label className="pf-field__label" htmlFor="pf-calc-start">
                Tanggal mulai
              </label>
              <input
                id="pf-calc-start"
                type="date"
                className="form-control form-control-sm"
                value={calc.startDate}
                onChange={(event) => setCalc((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="pf-field__label" htmlFor="pf-calc-days">
                Durasi (hari kerja)
              </label>
              <input
                id="pf-calc-days"
                type="number"
                min="1"
                step="1"
                className="form-control form-control-sm"
                value={calc.days}
                onChange={(event) => setCalc((prev) => ({ ...prev, days: event.target.value }))}
              />
            </div>
            {calcResult && (
              <div className="pf-calc__result" id="pf-calc-result">
                <strong>{calcResult.startLabel} → {calcResult.endLabel}</strong>
                <small>
                  Total {calcResult.hours} jam kerja · {calcResult.skipped} hari non-kerja dilewati
                </small>
              </div>
            )}
          </div>
          <p className="pf-hint mb-0">
            Angka ini memakai kalender aktif: {workDays.length} hari kerja per minggu,{' '}
            {holidayCount} hari libur. Contoh biaya: {formatCurrency(500000, settings.currency)} per
            hari kerja, sehingga durasi {calc.days} hari kerja setara{' '}
            {formatCurrency(500000 * (Number(calc.days) || 0), settings.currency)}.
          </p>
        </div>
      </section>
    </div>
  )
}
