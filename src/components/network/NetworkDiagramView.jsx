import { useMemo } from 'react'
import Icon from '../common/Icon.jsx'
import { dependencyShortLabel } from '../../utils/presentation.js'
import { normalizeDependency } from '../../data/taskSchema.js'

// Ukuran node & jarak antar node (piksel) untuk tata letak berlapis.
const NODE_WIDTH = 200
const NODE_HEIGHT = 64
const GAP_X = 90
const GAP_Y = 22

const EDGE_LABEL = { FS: 'FS', SS: 'SS', FF: 'FF', SF: 'SF' }

function ellipsis(text, max) {
  const value = String(text ?? '')
  return value.length > max ? `${value.slice(0, Math.max(1, max - 1))}...` : value
}

/**
 * Diagram jaringan (PERT) digambar langsung dari data tugas & dependensi.
 * Tata letak berlapis: kolom = kedalaman dependensi (awal di kiri),
 * baris = jumlah cabang pada kedalaman tersebut, sehingga proyek dengan
 * beberapa cabang tetap terbaca.
 */
export default function NetworkDiagramView({ schedule, resources, onSelectTask }) {
  const layout = useMemo(() => {
    // Baris ringkasan (induk aktivitas) tidak digambar: jaringan hanya berisi
    // aktivitas daun yang benar-benar dihitung mesin penjadwalan.
    const rows = (schedule?.tasks ?? []).filter((row) => !row.isSummary)
    if (rows.length === 0) return { nodes: [], edges: [], width: 0, height: 0 }

    const ids = new Set(rows.map((row) => row.id))

    // Rank = kedalaman terpanjang dari aktivitas tanpa pendahulu.
    const byId = new Map(rows.map((row) => [row.id, row]))
    const rank = new Map()
    const computeRank = (row, seen = new Set()) => {
      if (rank.has(row.id)) return rank.get(row.id)
      if (seen.has(row.id)) return 0
      seen.add(row.id)

      const parents = row.task.dependencies
        .map((dependency) => normalizeDependency(dependency)?.id)
        .filter((id) => id && ids.has(id) && id !== row.id)

      const value = parents.length
        ? Math.max(...parents.map((id) => computeRank(byId.get(id), seen) + 1))
        : 0

      rank.set(row.id, value)
      return value
    }
    rows.forEach((row) => computeRank(row))

    const columns = new Map()
    rows.forEach((row) => {
      const key = rank.get(row.id)
      if (!columns.has(key)) columns.set(key, [])
      columns.get(key).push(row)
    })

    const rankKeys = [...columns.keys()].sort((a, b) => a - b)
    const maxRows = Math.max(...rankKeys.map((key) => columns.get(key).length))
    const nodes = []

    rankKeys.forEach((key) => {
      const column = columns.get(key).sort((a, b) => {
        if (a.es !== b.es) return (a.es || '').localeCompare(b.es || '')
        return (a.task.code || a.task.name).localeCompare(b.task.code || b.task.name)
      })

      const columnHeight = column.length * NODE_HEIGHT + (column.length - 1) * GAP_Y
      const canvasHeight = maxRows * NODE_HEIGHT + (maxRows - 1) * GAP_Y
      const offsetY = Math.max(0, (canvasHeight - columnHeight) / 2)

      column.forEach((row, index) => {
        nodes.push({
          row,
          x: key * (NODE_WIDTH + GAP_X),
          y: offsetY + index * (NODE_HEIGHT + GAP_Y),
          rank: key,
        })
      })
    })

    const nodeById = new Map(nodes.map((node) => [node.row.id, node]))
    const edges = []

    nodes.forEach((node) => {
      node.row.task.dependencies.forEach((raw) => {
        const dependency = normalizeDependency(raw)
        if (!dependency) return
        const from = nodeById.get(dependency.id)
        if (!from) return

        const x1 = from.x + NODE_WIDTH
        const y1 = from.y + NODE_HEIGHT / 2
        const x2 = node.x
        const y2 = node.y + NODE_HEIGHT / 2
        const detour = y2 > y1 ? y1 + NODE_HEIGHT / 2 + 14 : y1 - NODE_HEIGHT / 2 - 14

        const path =
          x2 >= x1 + 24
            ? `M ${x1} ${y1} H ${x2 - 14} V ${y2} H ${x2}`
            : `M ${x1} ${y1} H ${x1 + 14} V ${detour} H ${x2 - 14} V ${y2} H ${x2}`

        edges.push({
          key: `${dependency.id}-${node.row.id}`,
          path,
          labelX: (x1 + x2) / 2,
          labelY: Math.min(y1, y2) - 8,
          type: EDGE_LABEL[dependency.type] ?? 'FS',
          lag: dependency.lag,
          critical: schedule.criticalIds.has(node.row.id) && schedule.criticalIds.has(from.row.id),
        })
      })
    })

    const width = rankKeys.length * NODE_WIDTH + (rankKeys.length - 1) * GAP_X
    const height = maxRows * NODE_HEIGHT + (maxRows - 1) * GAP_Y

    return { nodes, edges, width, height }
  }, [schedule])

  if (!layout.nodes.length) return null

  const resourceName = (id) => resources.find((resource) => resource.id === id)?.name ?? '-'

  return (
    <div className="pf-network">
      <div className="pf-network__toolbar">
        <div className="pf-gantt__legend">
          <span className="pf-chip pf-chip--soft">Aktivitas (node)</span>
          <span className="pf-chip pf-chip--soft is-critical">Jalur kritis</span>
          <span className="pf-chip pf-chip--soft">Panah = dependensi</span>
        </div>
        <span className="pf-chip pf-chip--soft">
          <Icon name="share" size={15} /> {layout.nodes.length} node · {layout.edges.length} relasi
        </span>
      </div>

      <div className="pf-network__canvas">
        <svg
          className="pf-network__svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Diagram jaringan proyek"
        >
          <defs>
            <marker
              id="pf-net-arrow"
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
              id="pf-net-arrow-critical"
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

          {layout.edges.map((edge) => (
            <g key={edge.key}>
              <path
                d={edge.path}
                className={`pf-network__edge ${edge.critical ? 'is-critical' : ''}`}
                markerEnd={`url(#${edge.critical ? 'pf-net-arrow-critical' : 'pf-net-arrow'})`}
              />
          <text className="pf-network__edge-label" x={edge.labelX} y={edge.labelY}>
            {dependencyShortLabel({ type: edge.type, lag: edge.lag })}
          </text>
            </g>
          ))}

          {layout.nodes.map((node) => {
            const { row } = node
            const critical = schedule.criticalIds.has(row.id)
            return (
              <g
                key={row.id}
                className={`pf-network__node ${critical ? 'is-critical' : ''}`}
                transform={`translate(${node.x} ${node.y})`}
                onClick={() => onSelectTask?.(row.task)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectTask?.(row.task)
                }}
              >
                <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={12} />
                <text className="pf-network__code" x={12} y={20}>
                  {row.task.code || '·'} · {row.duration} hari
                </text>
                <text className="pf-network__name" x={12} y={38}>
                  {ellipsis(row.task.name, 24)}
                </text>
                <text className="pf-network__meta" x={12} y={54}>
                  {critical
                    ? `KRITIS · slack ${row.slack}`
                    : `slack ${row.slack} · ${ellipsis(resourceName(row.task.assigneeId), 14)}`}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
