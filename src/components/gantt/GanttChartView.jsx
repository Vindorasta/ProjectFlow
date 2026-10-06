import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../common/Icon.jsx'
import {
  DAY_SHORT_NAMES,
  addDays,
  dayOfWeek,
  diffInDays,
  eachDay,
  formatDayLabel,
  formatMonthLabel,
  maxDate,
  minDate,
  parseISODate,
  toISODate,
  startOfWeek,
  todayISO,
} from '../../utils/date.js'
import { buildTaskRows } from '../../utils/taskTree.js'
import { normalizeDependency } from '../../data/taskSchema.js'
import { priorityTone } from '../../utils/presentation.js'

// Ukuran tetap supaya overlay panah SVG bisa dihitung tanpa mengukur DOM.
const ROW_HEIGHT = 40
const LABEL_WIDTH = 320

const ZOOM_OPTIONS = [
  { key: 'day', label: 'Hari', columnWidth: 34, unit: 'day' },
  { key: 'week', label: 'Minggu', columnWidth: 16, unit: 'week' },
  { key: 'month', label: 'Bulan', columnWidth: 38, unit: 'month' },
]

// Jarak bulan dalam satuan bulan (untuk zoom Bulan).
function monthDistance(origin, date) {
  const from = parseISODate(origin)
  const to = parseISODate(date)
  if (!from || !to) return -1
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
}

// Awal bulan dari tanggal "YYYY-MM".
function monthStart(monthCursor) {
  return `${monthCursor}-01`
}

// Satu kolom timeline: bisa satu hari (zoom Hari) atau satu minggu (zoom
// Minggu/Bulan) sehingga rentang panjang tetap enak dibaca.
function buildColumns(origin, columnsCount, unit) {
  if (unit === 'month') {
    const cursor = parseISODate(origin)
    return Array.from({ length: columnsCount }, (_, index) => {
      const date = toISODate(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + index, 1)))
      return {
        key: `m-${date.slice(0, 7)}`,
        date,
        days: 30,
        label: date.slice(0, 7).slice(5) === '01' ? formatMonthLabel(date) : '',
        sublabel: '',
      }
    })
  }

  if (unit === 'day') {
    return eachDay(origin, addDays(origin, columnsCount - 1), columnsCount).map((date) => ({
      key: date,
      date,
      days: 1,
      label: formatDayLabel(date),
      sublabel: DAY_SHORT_NAMES[dayOfWeek(date) ?? 0],
    }))
  }

  return Array.from({ length: columnsCount }, (_, index) => {
    const date = addDays(origin, index * 7)
    return {
      key: `w-${date}`,
      date,
      days: 7,
      label: formatDayLabel(date),
      sublabel: DAY_SHORT_NAMES[dayOfWeek(date) ?? 0],
    }
  })
}

// Kelompokkan kolom berdasarkan bulan untuk baris header pertama.
function groupByMonth(columns) {
  const groups = []

  columns.forEach((column) => {
    const monthKey = column.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.key === monthKey) {
      last.count += 1
      last.endDate = column.date
    } else {
      groups.push({ key: monthKey, count: 1, startDate: column.date, endDate: column.date })
    }
  })

  return groups
}

// Kolom tempat sebuah tanggal berada (>= 0).
function columnIndex(origin, unit, date) {
  if (!date) return -1
  if (unit === 'month') return Math.max(0, monthDistance(origin, date))
  const base = unit === 'day' ? origin : startOfWeek(origin)
  const target = unit === 'day' ? date : startOfWeek(date)
  const delta = diffInDays(base, target)
  return delta < 0 ? -1 : delta
}

/**
 * Gantt chart: daftar aktivitas di kiri, timeline kalender di kanan.
 * Bar mengikuti tanggal & durasi tersimpan, progres ditampilkan di dalam bar,
 * milestone digambar sebagai belah ketupat, dan garis panah menunjukkan
 * dependensi antar aktivitas.
 */
export default function GanttChartView({
  project,
  tasks,
  schedule,
  resources,
  calendar,
  onSelectTask,
}) {
  const [zoom, setZoom] = useState('day')
  const scrollRef = useRef(null)

  const zoomOption = ZOOM_OPTIONS.find((option) => option.key === zoom) ?? ZOOM_OPTIONS[0]

  const rows = useMemo(() => buildTaskRows(tasks), [tasks])

  // Rentang timeline mengikuti data tersimpan (dibatasi oleh kalender kerja).
  const range = useMemo(() => {
    const starts = rows.map((row) => row.task.startDate).filter(Boolean)
    const ends = rows.map((row) => row.task.endDate).filter(Boolean)
    const today = todayISO()

    let start = minDate([...starts, today])
    let end = maxDate([...ends, today])
    if (!start || !end) return null

    // Sisakan sedikit ruang di kiri & kanan agar bar tidak menempel tepi.
    start = addDays(start, -3)
    end = addDays(end, 7)
    return { start, end }
  }, [rows])

  const columns = useMemo(() => {
    if (!range) return []
    const totalDays = diffInDays(range.start, range.end) + 1
    if (zoomOption.unit === 'day') return buildColumns(range.start, totalDays, 'day')
    if (zoomOption.unit === 'month') {
      const span = monthDistance(range.start, range.end) + 1
      return buildColumns(monthStart(range.start.slice(0, 7)), span, 'month')
    }
    return buildColumns(startOfWeek(range.start), Math.ceil(totalDays / 7) + 1, 'week')
  }, [range, zoomOption.unit])

  const chartWidth = columns.length * zoomOption.columnWidth
  const monthGroups = useMemo(() => groupByMonth(columns), [columns])

  // Peta baris -> posisi bar agar overlay panah bisa dihitung.
  const rowIndexById = useMemo(() => {
    const map = new Map()
    rows.forEach((row, index) => map.set(row.task.id, index))
    return map
  }, [rows])

  // Posisi bar (dalam piksel) untuk satu aktivitas.
  const barGeometry = useCallback(
    (task) => {
      const startCol = columnIndex(range?.start, zoomOption.unit, task.startDate)
      const endCol = columnIndex(range?.start, zoomOption.unit, task.endDate)
      if (startCol < 0 || endCol < 0) return null

      const span = Math.max(1, endCol - startCol + 1)
      return {
        left: startCol * zoomOption.columnWidth,
        width: span * zoomOption.columnWidth - 4,
      }
    },
    [range?.start, zoomOption.columnWidth, zoomOption.unit],
  )

  // Ringkasan baris induk mengikuti rentang anak-anaknya.
  const rowGeometry = (row) => {
    const summary = schedule?.byId?.get(row.task.id)
    if (row.hasChildren && summary?.startDate && summary?.endDate) {
      const startCol = columnIndex(range?.start, zoomOption.unit, summary.startDate)
      const endCol = columnIndex(range?.start, zoomOption.unit, summary.endDate)
      if (startCol >= 0 && endCol >= 0) {
        return {
          left: startCol * zoomOption.columnWidth,
          width: Math.max(1, endCol - startCol + 1) * zoomOption.columnWidth - 4,
        }
      }
    }
    return barGeometry(row.task)
  }

  // Garis panah dependensi (hanya antar aktivitas daun yang tampil).
  const arrows = useMemo(() => {
    if (!range || !schedule) return []

    const result = []
    rows.forEach((row, index) => {
      if (row.hasChildren) return
      row.task.dependencies.forEach((raw) => {
        const dependency = normalizeDependency(raw)
        if (!dependency) return
        const predecessor = rows.find((item) => item.task.id === dependency.id)
        const from = predecessor && barGeometry(predecessor.task)
        const to = barGeometry(row.task)
        const fromIndex = rowIndexById.get(dependency.id)
        if (!predecessor || !from || !to || fromIndex === undefined) return

        const y1 = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2
        const y2 = index * ROW_HEIGHT + ROW_HEIGHT / 2
        const x1 = from.left + from.width
        const x2 = to.left
        const critical = schedule.criticalIds.has(row.task.id) && schedule.criticalIds.has(dependency.id)
        const path =
          x2 >= x1 + 10
            ? `M ${x1} ${y1} H ${x2 - 10} V ${y2} H ${x2}`
            : `M ${x1} ${y1} H ${x1 + 10} V ${y2} H ${x2}`

        result.push({ key: `${dependency.id}-${row.task.id}`, path, y1, y2, x1, x2, critical, type: dependency.type })
      })
    })

    return result
  }, [barGeometry, range, rowIndexById, rows, schedule])

  const todayColumn = range ? columnIndex(range.start, zoomOption.unit, todayISO()) : -1
  const todayVisible = todayColumn >= 0 && todayColumn < columns.length

  // Gulir ke posisi hari ini ketika proyek / zoom berubah.
  useEffect(() => {
    const node = scrollRef.current
    if (!node || !todayVisible) return
    node.scrollLeft = Math.max(0, todayColumn * zoomOption.columnWidth - 240)
  }, [todayColumn, todayVisible, zoomOption.columnWidth])

  if (!range || columns.length === 0) return null

  const resourceName = (id) => resources.find((resource) => resource.id === id)?.name ?? '-'
  const bodyHeight = rows.length * ROW_HEIGHT

  return (
    <div className="pf-gantt">
      <div className="pf-gantt__toolbar">
        <div className="pf-gantt__zoom" role="group" aria-label="Skala timeline">
          {ZOOM_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`pf-gantt__zoom-btn ${option.key === zoom ? 'is-active' : ''}`}
              onClick={() => setZoom(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="pf-gantt__legend">
          <span className="pf-chip pf-chip--soft">
            <span className="pf-dot" style={{ background: project?.color ?? '#0d6efd' }} /> Bar tugas
          </span>
          <span className="pf-chip pf-chip--soft is-critical">Jalur kritis</span>
          <span className="pf-chip pf-chip--soft">Milestone</span>
          <span className="pf-chip pf-chip--soft">Hari non-kerja</span>
        </div>
      </div>

      <div className="pf-gantt__scroll" ref={scrollRef}>
        <div className="pf-gantt__inner" style={{ width: LABEL_WIDTH + chartWidth }}>
          {/* Header timeline */}
          <div className="pf-gantt__head">
            <div className="pf-gantt__corner" style={{ width: LABEL_WIDTH }}>
              Aktivitas ({rows.length})
            </div>
            <div className="pf-gantt__timeline" style={{ width: chartWidth }}>
              <div className="pf-gantt__months">
                {monthGroups.map((group) => (
                  <div
                    key={group.key}
                    className="pf-gantt__month"
                    style={{ width: group.count * zoomOption.columnWidth }}
                  >
                    {formatMonthLabel(group.startDate)}
                  </div>
                ))}
              </div>
              <div className="pf-gantt__cols">
                {columns.map((column) => {
                  const nonWorking = calendar ? !calendar.isWorkingDay(column.date) : false
                  const holiday = calendar ? calendar.isHoliday(column.date) : false
                  return (
                    <div
                      key={column.key}
                      className={`pf-gantt__col ${nonWorking ? 'is-nonworking' : ''} ${
                        holiday ? 'is-holiday' : ''
                      }`}
                      style={{ width: zoomOption.columnWidth }}
                    >
                      <span>{column.label}</span>
                      <small>{column.sublabel}</small>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Baris aktivitas */}
          <div className="pf-gantt__body" style={{ height: bodyHeight }}>
            <div className="pf-gantt__grid" aria-hidden="true">
              {columns.map((column) => {
                const nonWorking = calendar ? !calendar.isWorkingDay(column.date) : false
                const holiday = calendar ? calendar.isHoliday(column.date) : false
                return (
                  <div
                    key={column.key}
                    className={`pf-gantt__grid-col ${nonWorking ? 'is-nonworking' : ''} ${
                      holiday ? 'is-holiday' : ''
                    }`}
                    style={{ width: zoomOption.columnWidth, height: bodyHeight }}
                  />
                )
              })}
            </div>

            {todayVisible && (
              <div
                className="pf-gantt__today"
                style={{ left: LABEL_WIDTH + todayColumn * zoomOption.columnWidth }}
              >
                <span>Hari ini</span>
              </div>
            )}

            <svg className="pf-gantt__arrows" width={chartWidth} height={bodyHeight} aria-hidden="true">
              <defs>
                <marker
                  id="pf-arrow"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
                </marker>
                <marker
                  id="pf-arrow-critical"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 z" fill="#dc3545" />
                </marker>
              </defs>
              {arrows.map((arrow) => (
                <path
                  key={arrow.key}
                  d={arrow.path}
                  className={arrow.critical ? 'is-critical' : ''}
                  markerEnd={`url(#${arrow.critical ? 'pf-arrow-critical' : 'pf-arrow'})`}
                />
              ))}
            </svg>

            {rows.map((row) => {
              const geometry = rowGeometry(row)
              const scheduleRow = schedule?.byId?.get(row.task.id)
              const critical = Boolean(schedule?.criticalIds.has(row.task.id))
              const progress = scheduleRow?.progress ?? row.task.progress ?? 0

              return (
                <div className="pf-gantt__row" key={row.task.id} style={{ height: ROW_HEIGHT }}>
                  <div className="pf-gantt__label" style={{ width: LABEL_WIDTH }}>
                    <button
                      type="button"
                      className="pf-gantt__label-btn"
                      style={{ paddingLeft: 10 + row.depth * 16 }}
                      onClick={() => onSelectTask?.(row.task)}
                    >
                      {row.hasChildren && (
                        <Icon name="list" size={14} className="pf-gantt__branch" />
                      )}
                      {row.task.code && <span className="pf-gantt__code">{row.task.code}</span>}
                      <span className="pf-gantt__name">{row.task.name}</span>
                    </button>
                    <span className="pf-gantt__meta">
                      {resourceName(row.task.assigneeId)}
                    </span>
                  </div>

                  <div className="pf-gantt__track" style={{ width: chartWidth }}>
                    {geometry && (
                      <div
                        className={[
                          'pf-gantt__bar',
                          row.hasChildren ? 'is-summary' : '',
                          critical ? 'is-critical' : '',
                          row.task.status === 'Selesai' ? 'is-done' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          left: geometry.left,
                          width: geometry.width,
                          background: row.hasChildren ? 'transparent' : (project?.color ?? '#0d6efd'),
                        }}
                        title={`${row.task.code ? `${row.task.code} - ` : ''}${row.task.name} (${progress}%)`}
                      >
                        {row.task.isMilestone && !row.hasChildren ? (
                          <span className="pf-gantt__milestone" aria-hidden="true" />
                        ) : (
                          <>
                            <span
                              className="pf-gantt__bar-progress"
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                            <span className="pf-gantt__bar-text">
                              {row.task.code ? `${row.task.code} · ` : ''}
                              {progress}%
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {row.task.priority === 'Kritis' && (
                      <span
                        className={`pf-badge pf-badge--${priorityTone(row.task.priority)} pf-gantt__priority`}
                      >
                        {row.task.priority}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
