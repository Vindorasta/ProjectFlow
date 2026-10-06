// Mesin penjadwalan ProjectFlow (Critical Path Method / PERT).
//
// Semua perhitungan diturunkan dari data yang tersimpan: durasi kerja tiap
// aktivitas, dependensi (jenis + lag), dan kalender kerja. Tidak ada angka
// yang ditulis manual.
//
// Tahapan:
//  1. Scope  : pilih tugas milik satu proyek; hanya aktivitas "daun"
//              (tanpa subtask) yang dihitung, induknya hanya baris ringkasan.
//  2. Graph  : buang dependensi menunjuk ke luar scope / tugas hilang, lalu
//              putuskan sisi yang membentuk siklus agar hasil tetap terhitung.
//  3. Forward pass : ES / EF setiap aktivitas.
//  4. Backward pass: LS / LF dan slack setiap aktivitas.
//  5. Jalur       : enumerasi semua jalur awal -> akhir untuk melihat jalur terpanjang.

import { createWorkCalendar } from './workCalendar.js'
import { durationInDays, minDate } from './date.js'
import { normalizeDependency, normalizeTask } from '../data/taskSchema.js'

// Pembatas enumerasi jalur agar diagram dengan sangat banyak cabang tidak
// membuat browserfreeze.
const MAX_PATHS = 500
const MAX_PATH_NODES = 20000

const KEY = (from, to) => `${from}->${to}`

// Bangun peta anak -> induk untuk satu proyek.
// Induk aktivitas menjadi baris ringkasan dan tidak ikut dihitung sebagai
// aktivitas tersendiri (durasi comes dari anak-anaknya).
function buildScope(tasks, projectId) {
  const all = (Array.isArray(tasks) ? tasks : []).map(normalizeTask).filter(Boolean)
  const scoped = all.filter(
    (task) => task.id && (!projectId || task.projectId === projectId),
  )
  const scopeIds = new Set(scoped.map((task) => task.id))

  const parentIds = new Set(
    scoped.filter((task) => task.parentTaskId && scopeIds.has(task.parentTaskId)).map((t) => t.parentTaskId),
  )
  const leafTasks = scoped.filter((task) => !parentIds.has(task.id))
  const summaryIds = new Set([...parentIds].filter((id) => scopeIds.has(id)))

  // Anak langsung tiap baris ringkasan, diurutkan sesuai urutan Gantt.
  // Dipakai untuk mengarahkan dependensi yang menunjuk baris ringkasan
  // ke aktivitas daun yang benar (mis. FS -> anak terakhir).
  const summaryChildren = new Map()
  parentIds.forEach((id) => {
    if (!scopeIds.has(id)) return
    summaryChildren.set(
      id,
      scoped.filter((task) => task.parentTaskId === id).sort(compareTasks),
    )
  })

  return { all, scoped, scopeIds, leafTasks, summaryIds, summaryChildren }
}

function compareTasks(a, b) {
  const startA = a.startDate || '9999-12-31'
  const startB = b.startDate || '9999-12-31'
  if (startA !== startB) return startA.localeCompare(startB)
  if (a.code !== b.code) return (a.code || 'zz').localeCompare(b.code || 'zz')
  return a.name.localeCompare(b.name)
}

// Kumpulkan dependensi yang bisa dipakai (memakai bentuk baku { id, type, lag }).
function buildGraph(leafTasks, summaryChildren) {
  const nodes = new Map()
  const dangling = []

  leafTasks.forEach((task) => {
    nodes.set(task.id, { id: task.id, task, deps: [], successors: [] })
  })

  // Dependensi yang menunjuk baris ringkasan (induk aktivitas) diarahkan ke
  // aktivitas daun: FS/FF memakai anak terakhir, SS/SF memakai anak pertama.
  const resolveTarget = (id, type) => {
    let current = id
    let guard = 0
    while (!nodes.has(current) && summaryChildren.has(current) && guard < 100) {
      const children = summaryChildren.get(current)
      if (children.length === 0) return current
      const useFirst = type === 'SS' || type === 'SF'
      current = children[useFirst ? 0 : children.length - 1].id
      guard += 1
    }
    return current
  }

  leafTasks.forEach((task) => {
    task.dependencies.forEach((rawDependency) => {
      const dependency = normalizeDependency(rawDependency)
      if (!dependency) return

      const predecessorId = resolveTarget(dependency.id, dependency.type)

      if (predecessorId === task.id) {
        dangling.push({ successorId: task.id, predecessorId: dependency.id, reason: 'SELF' })
        return
      }
      if (!nodes.has(predecessorId)) {
        dangling.push({
          successorId: task.id,
          predecessorId: dependency.id,
          reason: 'MISSING',
        })
        return
      }

      const edge = {
        ...dependency,
        successorId: task.id,
        predecessorId,
      }
      nodes.get(task.id).deps.push(edge)
      nodes.get(predecessorId).successors.push(edge)
    })
  })

  return { nodes, dangling }
}

// DFS berwarna: menemukan sisi yang menutup siklus lalu melepasnya.
// Cycle yang dilaporkan pernah benar-benar ada di data pengguna, bukan hasil
// tebakan.
function pruneCycles(nodes) {
  const state = new Map()
  const dropped = new Set()
  const cycles = []

  const visit = (id) => {
    state.set(id, 1)
    const node = nodes.get(id)

    node.deps.forEach((edge) => {
      const edgeKey = KEY(edge.successorId, edge.predecessorId)
      if (dropped.has(edgeKey)) return

      const status = state.get(edge.predecessorId) ?? 0
      if (status === 1) {
        dropped.add(edgeKey)
        cycles.push({
          successorId: edge.successorId,
          predecessorId: edge.predecessorId,
          type: edge.type,
          lag: edge.lag,
        })
        return
      }
      if (status === 0) visit(edge.predecessorId)
    })

    state.set(id, 2)
  }

  nodes.forEach((node, id) => {
    if ((state.get(id) ?? 0) === 0) visit(id)
  })

  nodes.forEach((node) => {
    node.deps = node.deps.filter((edge) => !dropped.has(KEY(edge.successorId, edge.predecessorId)))
    node.successors = node.successors.filter(
      (edge) => !dropped.has(KEY(edge.successorId, edge.predecessorId)),
    )
  })

  return cycles
}

// Urutan topologis (Kahn). Karena siklus sudah dipangkas, hasilnya selalu penuh.
function topoSort(nodes) {
  const indegree = new Map()
  nodes.forEach((node, id) => indegree.set(id, node.deps.length))

  const queue = [...indegree.entries()].filter(([, value]) => value === 0).map(([id]) => id)
  const order = []

  while (queue.length > 0) {
    const id = queue.shift()
    order.push(id)
    nodes.get(id).successors.forEach((edge) => {
      // Node yang tertahan adalah aktivitas pengikut (successor).
      const next = indegree.get(edge.successorId) - 1
      indegree.set(edge.successorId, next)
      if (next === 0) queue.push(edge.successorId)
    })
  }

  return order
}

// Durasi kerja satu aktivitas dalam hari kerja (minimal 1 hari).
function activityDuration(task, calendar) {
  if (task.isMilestone) return 1
  const working = calendar.taskDuration(task.startDate, task.endDate)
  if (working > 0) return working
  return Math.max(1, durationInDays(task.startDate, task.endDate) || 1)
}

// Batas tanggal mulai paling awal di scope -> titik nol penjadwalan.
function anchorDate(leafTasks, calendar) {
  const raw = minDate(leafTasks.map((task) => task.startDate))
  const anchor = calendar.nextWorkingDay(raw)
  return anchor || minDate(leafTasks.map((task) => task.startDate))
}

/**
 * Hitung jadwal lengkap untuk satu proyek.
 * Mengembalikan objek jadwal; `ok: false` bila ada siklus yang harus dipangkas.
 */
export function computeSchedule(tasks, settings = {}, options = {}) {
  const { projectId = null } = options
  const calendar = createWorkCalendar(settings)
  const { scoped, leafTasks, summaryIds, summaryChildren } = buildScope(tasks, projectId)
  const { nodes, dangling } = buildGraph(leafTasks, summaryChildren)
  const cycles = pruneCycles(nodes)
  const order = topoSort(nodes)

  const start = anchorDate(leafTasks, calendar)

  // --- Forward pass: earliest start / earliest finish ---------------------
  const rows = new Map()
  leafTasks.forEach((task) => {
    rows.set(task.id, {
      id: task.id,
      task,
      duration: activityDuration(task, calendar),
      es: start,
      ef: start,
      ls: start,
      lf: start,
      slack: 0,
      critical: false,
    })
  })

  order.forEach((id) => {
    const row = rows.get(id)
    const node = nodes.get(id)
    let es = start

    node.deps.forEach((edge) => {
      const parent = rows.get(edge.predecessorId)
      if (!parent) return
      const lag = Math.max(0, Number(edge.lag) || 0)
      let candidate

      switch (edge.type) {
        case 'SS':
          // SS + lag: mulai pada hari kerja ke-(lag+1) terhitung dari ES pendahulu.
          candidate = calendar.addWorkingDays(parent.es, lag + 1)
          break
        case 'FF':
          candidate = calendar.subtractWorkingDays(
            calendar.addWorkingDays(parent.ef, lag),
            row.duration,
          )
          break
        case 'SF':
          candidate = calendar.subtractWorkingDays(
            calendar.addWorkingDays(parent.es, lag),
            row.duration,
          )
          break
        case 'FS':
        default:
          // FS + lag: mulai pada hari kerja ke-(lag+2) (EF pendahulu = hari ke-1).
          candidate = calendar.addWorkingDays(parent.ef, lag + 2)
          break
      }

      if (candidate && candidate > es) es = candidate
    })

    row.es = calendar.nextWorkingDay(es) || es
    // Konvensi: addWorkingDays(tanggal, n) = hari kerja ke-n terhitung mulai
    // tanggal tersebut, sehingga EF = hari kerja ke-`dur` dari ES.
    row.ef = calendar.addWorkingDays(row.es, row.duration) || row.es
  })

  const projectFinish = order.reduce(
    (latest, id) => {
      const row = rows.get(id)
      return row.ef > latest ? row.ef : latest
    },
    start,
  )

  // --- Backward pass: latest finish / latest start / slack ----------------
  ;[...order].reverse().forEach((id) => {
    const row = rows.get(id)
    const node = nodes.get(id)
    let lf = null

    node.successors.forEach((edge) => {
      const child = rows.get(edge.successorId)
      if (!child) return
      const lag = Math.max(0, Number(edge.lag) || 0)
      let candidate

      switch (edge.type) {
        case 'SS':
          candidate = calendar.addWorkingDays(child.ls, row.duration)
          break
        case 'FF':
          candidate = calendar.subtractWorkingDays(child.lf, lag)
          break
        case 'SF':
          candidate = calendar.subtractWorkingDays(child.lf, row.duration)
          break
        case 'FS':
        default:
          candidate = calendar.subtractWorkingDays(child.ls, lag + 2)
          break
      }

      if (candidate && (lf === null || candidate < lf)) lf = candidate
    })

    row.lf = lf && lf < row.ef ? row.ef : lf ?? projectFinish
    row.ls = calendar.subtractWorkingDays(row.lf, row.duration) || row.lf
    if (row.ls < row.es) row.ls = row.es

    const gap = calendar.workingDaysBetween(row.es, row.ls) - 1
    row.slack = gap >= 0 ? gap : -(calendar.workingDaysBetween(row.ls, row.es) - 1)
    row.critical = row.slack === 0
  })

  // Baris aktivitas daun siap pakai (dengan ES/EF/LS/LF/slack).
  const leafRows = [...rows.values()]

  // Baris ringkasan untuk induk aktivitas: rentang & progres mengikuti anak-anaknya
  // sehingga Gantt bisa menampilkan bar "summary" di atas subtask-nya.
  const summaryRows = []
  summaryIds.forEach((id) => {
    const task = scoped.find((item) => item.id === id)
    const children = leafRows.filter((row) => row.task.parentTaskId === id)
    if (!task || children.length === 0) return

    const startDate = children.reduce((min, row) => (row.es < min ? row.es : min), children[0].es)
    const endDate = children.reduce((max, row) => (row.ef > max ? row.ef : max), children[0].ef)

    summaryRows.push({
      id: task.id,
      task,
      duration: calendar.workingDaysBetween(startDate, endDate),
      es: startDate,
      ef: endDate,
      ls: startDate,
      lf: endDate,
      slack: null,
      critical: false,
      isSummary: true,
      childCount: children.length,
      progress: Math.round(
        children.reduce((sum, row) => sum + (row.task.progress ?? 0), 0) / children.length,
      ),
      startDate,
      endDate,
    })
  })

  // Status kritis hanya berlaku pada aktivitas daun (subtask dihitung terpisah).
  const criticalIds = new Set(leafRows.filter((row) => row.critical).map((row) => row.id))
  const criticalTaskIds = new Set([...criticalIds].filter((id) => !summaryIds.has(id)))
  const pathsResult = enumeratePaths(nodes, rows, calendar)
  const paths = pathsResult.paths
  // "Jalur kritis" yang ditampilkan adalah jalur terpanjang yang seluruh
  // simpulnya kritis (slack 0), konsisten dengan criticalIds / forward pass.
  // Jika tidak ada yang seluruhnya kritis, jatuh kembali ke jalur terpanjang
  // umum agar tidak memilih jalur yang melintasi aktivitas fleksibel (slack>0).
  const criticalPaths = paths.filter((path) => path.ids.every((id) => criticalIds.has(id)))
  const longest = (criticalPaths.length ? criticalPaths : paths).reduce(
    (best, path) => (best === null || path.duration > best.duration ? path : best),
    null,
  )

  const scheduleRows = [...leafRows, ...summaryRows]
  const byId = new Map(scheduleRows.map((row) => [row.id, row]))

  return {
    ok: cycles.length === 0,
    projectId,
    calendar,
    tasks: scheduleRows,
    byId,
    criticalIds: criticalTaskIds,
    criticalPath: longest ? longest.ids : [],
    paths,
    pathsTruncated: pathsResult.truncated,
    projectStart: start,
    projectFinish,
    duration: calendar.workingDaysBetween(start, projectFinish),
    leafCount: leafTasks.length,
    scopedCount: scoped.length,
    issues: { cycles, dangling },
  }
}

// Enumerasi semua jalur dari aktivitas tanpa pendahulu ke aktivitas tanpa
// pengikut. Durasi jalur = jumlah durasi aktivitas + lag pada sisi FS.
// Enumerasi semua jalur dari aktivitas tanpa pendahulun ke aktivitas tanpa
// pengikut. Durasi jalur diukur sebagai rentang hari kerja antara ES aktivitas
// pertama hingga EF aktivitas terakhir (hasil forward pass), sehingga jalur
// kritis yang terpilih konsisten dengan aktivitas yang slack-nya nol dan
// dengan durasi proyek secara keseluruhan.
function enumeratePaths(nodes, rows, calendar) {
  const paths = []
  let visitedNodes = 0
  let truncated = false

  const starts = [...nodes.keys()].filter((id) => nodes.get(id).deps.length === 0)
  const isEnd = (id) => nodes.get(id).successors.length === 0

  const walk = (id, trail) => {
    if (truncated) return
    visitedNodes += 1
    if (visitedNodes > MAX_PATH_NODES) {
      truncated = true
      return
    }

    const nextTrail = [...trail, id]

    if (isEnd(id)) {
      const first = rows.get(nextTrail[0])
      const last = rows.get(nextTrail[nextTrail.length - 1])
      const pathDuration =
        first && last && first.es && last.ef
          ? calendar.workingDaysBetween(first.es, last.ef)
          : 0
      paths.push({ ids: nextTrail, duration: pathDuration })
      if (paths.length >= MAX_PATHS) truncated = true
      return
    }

    nodes.get(id).successors.forEach((edge) => {
      walk(edge.successorId, nextTrail)
    })
  }

  starts.forEach((id) => walk(id, []))

  return { paths, truncated }
}

/**
 * Apakah menambah dependensi predecessor -> successor akan membuat siklus?
 * Dipakai halaman Dependensi sebelum menyimpan relasi baru.
 */
export function wouldCreateCycle(tasks, successorId, predecessorId) {
  if (!successorId || !predecessorId) return false
  if (successorId === predecessorId) return true

  const all = (Array.isArray(tasks) ? tasks : []).map(normalizeTask).filter(Boolean)
  const succ = new Map()
  all.forEach((task) => {
    succ.set(
      task.id,
      task.dependencies.map((dep) => normalizeDependency(dep)?.id).filter(Boolean),
    )
  })

  // Alur kerja mengalir predecessor -> successor. Menambahkan relasi
  // predecessor -> successor membentuk siklus apabila successor sudah menjadi
  // dependensi transitif dari predecessor.
  const stack = [predecessorId]
  const seen = new Set()

  while (stack.length > 0) {
    const current = stack.pop()
    if (current === successorId) return true
    if (seen.has(current)) continue
    seen.add(current)
    const upstream = succ.get(current) ?? []
    upstream.forEach((id) => stack.push(id))
  }

  return false
}

// Ringkasan cepat untuk kartu dashboard / header halaman.
export function scheduleSummary(schedule, projectNameById) {
  if (!schedule || schedule.leafCount === 0) return null

  const criticalTasks = schedule.tasks.filter((row) => schedule.criticalIds.has(row.id))
  const criticalTotal = criticalTasks.reduce((sum, row) => sum + row.duration, 0)
  const slackValues = schedule.tasks.map((row) => row.slack)

  return {
    projectId: schedule.projectId,
    projectName: projectNameById(schedule.projectId),
    start: schedule.projectStart,
    finish: schedule.projectFinish,
    duration: schedule.duration,
    criticalCount: criticalTasks.length,
    criticalTotal,
    criticalShare: schedule.duration
      ? Math.round((criticalTotal / schedule.duration) * 100)
      : 0,
    maxSlack: slackValues.length ? Math.max(...slackValues) : 0,
    pathCount: schedule.paths.length,
    longestPath: schedule.criticalPath,
    ok: schedule.ok,
  }
}
