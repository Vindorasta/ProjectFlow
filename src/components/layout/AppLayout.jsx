import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import { navItems } from '../../routes/navItems.js'

// Layout aplikasi: sidebar + topbar + area konten.
// Di layar kecil sidebar tampil sebagai panel geser dengan latar gelap (backdrop).
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Panel mobile ditutup lewat onNavigate pada tiap tauta sidebar,
  // sehingga tidak perlu efek tambahan di sini.
  // Rute yang tidak dikenal (mis. halaman 404) memakai judul generik.
  const activeItem = navItems.find((item) => item.to === location.pathname) ?? null

  return (
    <div className="pf-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <button
          type="button"
          className="pf-backdrop d-lg-none"
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="pf-main">
        <Topbar
          title={activeItem?.label ?? 'Halaman Tidak Ditemukan'}
          subtitle="Arsitektur Sistem Informasi — ProjectFlow"
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="pf-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
