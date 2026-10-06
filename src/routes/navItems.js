// Konfigurasi navigasi sidebar ProjectFlow.
// Menambah fitur baru cukup menambah entri di sini + membuat komponen halamannya.

export const navItems = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/projects', label: 'Manajemen Proyek', icon: 'folder' },
  { to: '/tasks', label: 'Daftar Tugas', icon: 'list' },
  { to: '/gantt', label: 'Gantt Chart', icon: 'bars' },
  { to: '/network', label: 'Diagram Jaringan', icon: 'share' },
  { to: '/critical-path', label: 'Jalur Kritis', icon: 'target' },
  { to: '/dependencies', label: 'Dependensi Tugas', icon: 'link' },
  { to: '/resources', label: 'Sumber Daya', icon: 'users' },
  { to: '/calendar', label: 'Kalender Kerja', icon: 'calendar' },
]

// Dikelompokkan agar sidebar lebih mudah dibaca.
export const navGroups = [
  {
    title: 'Umum',
    items: navItems.filter((item) => ['/', '/projects', '/tasks'].includes(item.to)),
  },
  {
    title: 'Penjadwalan',
    items: navItems.filter(
      (item) => ['/gantt', '/network', '/critical-path', '/dependencies'].includes(item.to),
    ),
  },
  {
    title: 'Sumber Daya',
    items: navItems.filter((item) => ['/resources', '/calendar'].includes(item.to)),
  },
]
