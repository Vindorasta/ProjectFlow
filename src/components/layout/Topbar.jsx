import Icon from '../common/Icon.jsx'

// Bilah atas: tombol menu (mobile), judul halaman, dan aksi cepat.
export default function Topbar({ title, subtitle, onToggleSidebar }) {
  return (
    <header className="pf-topbar">
      <button
        type="button"
        className="pf-iconbtn d-lg-none"
        onClick={onToggleSidebar}
        aria-label="Buka atau tutup menu navigasi"
      >
        <Icon name="menu" size={20} />
      </button>

      <div className="pf-topbar__titles">
        <h1 className="pf-topbar__title">{title}</h1>
        {subtitle && <p className="pf-topbar__subtitle">{subtitle}</p>}
      </div>

      <div className="pf-topbar__actions">
        <span className="pf-chip pf-chip--soft d-none d-sm-inline-flex">
          <Icon name="clock" size={15} />
          Mode Demo
        </span>
        <span className="pf-avatar" title="Pengguna Demo">
          PF
        </span>
      </div>
    </header>
  )
}
