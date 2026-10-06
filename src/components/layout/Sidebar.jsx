import { NavLink } from 'react-router-dom'
import Icon from '../common/Icon.jsx'
import { navGroups } from '../../routes/navItems.js'

// Sidebar navigasi utama. Di layar besar selalu tampil; di layar kecil bisa dibuka/tutup.
export default function Sidebar({ open, onNavigate }) {
  return (
    <aside className={`pf-sidebar ${open ? 'pf-sidebar--open' : ''}`} aria-label="Navigasi utama">
      <div className="pf-sidebar__brand">
        <span className="pf-brand__mark">
          <Icon name="rocket" size={20} />
        </span>
        <div className="pf-brand__text">
          <strong>ProjectFlow</strong>
          <small>Manajemen Proyek</small>
        </div>
      </div>

      <nav className="pf-sidebar__nav">
        {navGroups.map((group) => (
          <div className="pf-navgroup" key={group.title}>
            <span className="pf-navgroup__title">{group.title}</span>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `pf-navlink ${isActive ? 'pf-navlink--active' : ''}`
                }
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="pf-sidebar__footer">
        <small>LocalStorage aktif</small>
        <span>Data tersimpan di browser ini</span>
      </div>
    </aside>
  )
}
