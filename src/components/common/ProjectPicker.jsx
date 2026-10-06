import Icon from './Icon.jsx'

// Pemilih proyek yang dipakai bersama oleh halaman Gantt, Diagram Jaringan,
// Jalur Kritis, dan Dependensi.
export default function ProjectPicker({
  projects,
  projectId,
  onChange,
  counts = {},
  label = 'Proyek',
}) {
  return (
    <div className="pf-picker">
      <label className="pf-field__label mb-0" htmlFor="pf-project-picker">
        {label}
      </label>
      <select
        id="pf-project-picker"
        className="form-select form-select-sm"
        value={projectId ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {projects.length === 0 && <option value="">-- Belum ada proyek --</option>}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.code ? `${project.code} · ` : ''}
            {project.name} ({counts[project.id] ?? 0} tugas)
          </option>
        ))}
      </select>
      <Icon name="folder" size={16} className="pf-picker__icon" />
    </div>
  )
}
