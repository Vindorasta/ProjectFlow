import Icon from '../common/Icon.jsx'

// Kartu statistik ringkas untuk dashboard.
export default function StatCard({ icon, label, value, hint, tone = 'primary' }) {
  return (
    <div className={`pf-stat pf-stat--${tone} h-100`}>
      <span className="pf-stat__icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="pf-stat__body">
        <span className="pf-stat__label">{label}</span>
        <strong className="pf-stat__value">{value}</strong>
        {hint && <span className="pf-stat__hint">{hint}</span>}
      </div>
    </div>
  )
}
