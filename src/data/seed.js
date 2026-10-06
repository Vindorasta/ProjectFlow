// Data contoh (seed) ProjectFlow.
//
// Dipakai saat LocalStorage masih kosong agar aplikasi tidak tampil kosong.
// Selain data yang sudah ada, ada satu proyek demo "Sistem Informasi Kelola
// Pemberkasan" dengan aktivitas berkode A-J (data DEMO, dibuat konsisten agar
// semua fitur - Gantt, dependensi, diagram jaringan, jalur kritis - dapat
// diuji). Nilai durasi/dependensi proyek demo dihitung dari kalender kerja
// yang sama dengan aplikasi agar Gantt dan jalur kritis selalu sinkron.

import { createWorkCalendar } from '../utils/workCalendar.js'

export const seedProjects = [
  {
    id: 'p-1',
    name: 'Implementasi Sistem ERP',
    code: 'ERP-2026',
    description: 'Migrasi dan implementasi modul inti sistem ERP perusahaan.',
    startDate: '2026-09-01',
    endDate: '2026-12-20',
    status: 'Berjalan',
    progress: 45,
    color: '#0d6efd',
  },
  {
    id: 'p-2',
    name: 'Pengembangan Portal Akademik',
    code: 'PA-2026',
    description: 'Pembuatan portal layanan akademik berbasis web.',
    startDate: '2026-10-01',
    endDate: '2027-01-31',
    status: 'Berjalan',
    progress: 20,
    color: '#198754',
  },
  {
    id: 'p-3',
    name: 'Perancangan Arsitektur Data',
    code: 'AD-2026',
    description: 'Penyusunan cetak biru arsitektur data organisasi.',
    startDate: '2026-08-10',
    endDate: '2026-09-30',
    status: 'Selesai',
    progress: 100,
    color: '#6f42c1',
  },
]

export const seedResources = [
  {
    id: 'r-1',
    name: 'Andi Pratama',
    role: 'Project Manager',
    email: 'andi@example.com',
    phone: '0812-1111-0001',
    capacity: 80,
    cost: 1500000,
    notes: 'Penanggung jawab GAN dan komunikasi antar unit.',
  },
  {
    id: 'r-2',
    name: 'Siti Nurhaliza',
    role: 'System Analyst',
    email: 'siti@example.com',
    phone: '0812-1111-0002',
    capacity: 100,
    cost: 900000,
    notes: 'Analisis kebutuhan dan perancangan proses bisnis.',
  },
  {
    id: 'r-3',
    name: 'Budi Santoso',
    role: 'Fullstack Developer',
    email: 'budi@example.com',
    phone: '0812-1111-0003',
    capacity: 100,
    cost: 850000,
    notes: 'Pengembangan modul backend dan integrasi.',
  },
  {
    id: 'r-4',
    name: 'Dewi Lestari',
    role: 'UI/UX Designer',
    email: 'dewi@example.com',
    phone: '0812-1111-0004',
    capacity: 60,
    cost: 800000,
    notes: 'Fokus pada desain antarmuka dan dokumentasi pengguna.',
  },
  {
    id: 'r-5',
    name: 'Rangga Wijaya',
    role: 'QA Engineer',
    email: 'rangga@example.com',
    phone: '0812-1111-0005',
    capacity: 80,
    cost: 700000,
    notes: 'SIT/UAT dan pengujian regresi.',
  },
  {
    id: 'r-6',
    name: 'Rina Kartika',
    role: 'Business Analyst',
    email: 'rina@example.com',
    phone: '0812-1111-0006',
    capacity: 100,
    cost: 850000,
    notes: 'Analisis proses pemberkasan (seed demo proyek pemberkasan).',
  },
  {
    id: 'r-7',
    name: 'Doni Saputra',
    role: 'Backend Developer',
    email: 'doni@example.com',
    phone: '0812-1111-0007',
    capacity: 100,
    cost: 800000,
    notes: 'Pengembangan service dan migration data.',
  },
]

// Hanya tugas dengan dependensi object (bentuk baku) di seed baru ini;
// tugas lama tetap kompatibel karena dinormalisasi oleh normalizeTask().
export const seedTasks = [
  {
    id: 't-1',
    projectId: 'p-1',
    code: 'A',
    name: 'Analisis kebutuhan bisnis',
    description: 'Wawancara seluruh unit kerja dan pemetaan proses bisnis-target.',
    startDate: '2026-09-01',
    endDate: '2026-09-12',
    status: 'Selesai',
    priority: 'Tinggi',
    progress: 100,
    assigneeId: 'r-2',
    dependencies: [],
    isMilestone: false,
  },
  {
    id: 't-2',
    projectId: 'p-1',
    code: 'B',
    name: 'Desain arsitektur sistem',
    description: 'Rancangan arsitektur modul, basis data, dan antarmuka integrasi.',
    startDate: '2026-09-13',
    endDate: '2026-09-30',
    status: 'Selesai',
    priority: 'Tinggi',
    progress: 100,
    assigneeId: 'r-2',
    dependencies: [{ id: 't-1', type: 'FS', lag: 0 }],
    isMilestone: false,
  },
  {
    id: 't-3',
    projectId: 'p-1',
    code: 'C',
    name: 'Pengembangan modul keuangan',
    description: 'Implementasi modul jurnal, buku besar, dan laporan keuangan.',
    startDate: '2026-10-01',
    endDate: '2026-11-10',
    status: 'Berjalan',
    priority: 'Tinggi',
    progress: 55,
    assigneeId: 'r-3',
    dependencies: [{ id: 't-2', type: 'FS', lag: 0 }],
    isMilestone: false,
  },
  {
    id: 't-4',
    projectId: 'p-1',
    code: 'D',
    name: 'Pengujian integrasi',
    description: 'SIT antar modul dan uji beban pada periode tutup buku.',
    startDate: '2026-11-11',
    endDate: '2026-12-05',
    status: 'Belum Mulai',
    priority: 'Tinggi',
    progress: 0,
    assigneeId: 'r-5',
    dependencies: [{ id: 't-3', type: 'FS', lag: 0 }],
    isMilestone: false,
  },
  {
    id: 't-5',
    projectId: 'p-1',
    code: 'E',
    name: 'Go-live ERP',
    description: 'Cutover ke sistem baru dan masa hypercare.',
    startDate: '2026-12-20',
    endDate: '2026-12-20',
    status: 'Belum Mulai',
    priority: 'Kritis',
    progress: 0,
    assigneeId: 'r-1',
    dependencies: [{ id: 't-4', type: 'FS', lag: 10 }],
    isMilestone: true,
  },
  {
    id: 't-6',
    projectId: 'p-2',
    code: 'A',
    name: 'Survei kebutuhan pengguna',
    description: 'Survei kebutuhan layanan akademik untuk mahasiswa dan dosen.',
    startDate: '2026-10-01',
    endDate: '2026-10-18',
    status: 'Berjalan',
    priority: 'Tinggi',
    progress: 70,
    assigneeId: 'r-2',
    dependencies: [],
    isMilestone: false,
  },
  {
    id: 't-7',
    projectId: 'p-2',
    code: 'B',
    name: 'Perancangan UI/UX',
    description: 'Wireframe dan design system portal akademik.',
    startDate: '2026-10-19',
    endDate: '2026-11-05',
    status: 'Berjalan',
    priority: 'Sedang',
    progress: 30,
    assigneeId: 'r-4',
    dependencies: [{ id: 't-6', type: 'FS', lag: 0 }],
    isMilestone: false,
  },
  {
    id: 't-8',
    projectId: 'p-2',
    code: 'C',
    name: 'Pengembangan frontend',
    description: 'Implementasi antarmuka portal berbasis komponen reusable.',
    startDate: '2026-11-06',
    endDate: '2026-12-20',
    status: 'Belum Mulai',
    priority: 'Tinggi',
    progress: 0,
    assigneeId: 'r-3',
    dependencies: [{ id: 't-7', type: 'FS', lag: 0 }],
    isMilestone: false,
  },
  {
    id: 't-9',
    projectId: 'p-3',
    code: 'A',
    name: 'Inventarisasi data',
    description: 'Daftar seluruh basis data yang dimiliki organisasi.',
    startDate: '2026-08-10',
    endDate: '2026-08-31',
    status: 'Selesai',
    priority: 'Sedang',
    progress: 100,
    assigneeId: 'r-2',
    dependencies: [],
    isMilestone: false,
  },
  {
    id: 't-10',
    projectId: 'p-3',
    code: 'B',
    name: 'Penyusunan model data',
    description: 'Model konseptual dan logical untuk basis data induk.',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    status: 'Selesai',
    priority: 'Tinggi',
    progress: 100,
    assigneeId: 'r-2',
    dependencies: [{ id: 't-9', type: 'FS', lag: 0 }],
    isMilestone: false,
  },
]

// ---------------------------------------------------------------------------
// Proyek demo: Sistem Informasi Kelola Pemberkasan (aktivitas A - J)
// Data DEMO/seed: kode, durasi, dan dependensi dibuat konsisten agar Gantt,
// diagram jaringan, dan jalur kritis dapat langsung diuji.
// ---------------------------------------------------------------------------

export const seedDemoProject = {
  id: 'p-4',
  name: 'Pengembangan Sistem Informasi Kelola Pemberkasan',
  code: 'SKP-2026',
  description:
    'Proyek demo (seed) pembangunan SIAP: analisis kebutuhan sampai go-live, ' +
    'termasuk modul administrasi, pelaporan, dan pelatihan pengguna.',
  startDate: '2026-06-02',
  endDate: '2026-11-27',
  status: 'Berjalan',
  progress: 45,
  color: '#fd7e14',
}

// durations dalam HARI KERJA; deps memakai kode aktivitas + jenis + lag.
const demoActivities = [
  {
    code: 'A',
    name: 'Analisis Kebutuhan Pemberkasan',
    description: 'Kebutuhan modul administrasi, pelaporan, dan integrasi.',
    summary: true,
    children: ['A1', 'A2'],
    deps: [],
    assigneeId: 'r-6',
    priority: 'Tinggi',
    progress: 100,
    status: 'Selesai',
  },
  {
    code: 'A1',
    name: 'Wawancara stakeholder',
    parent: 'A',
    duration: 4,
    deps: [],
    assigneeId: 'r-6',
    priority: 'Tinggi',
    progress: 100,
    status: 'Selesai',
  },
  {
    code: 'A2',
    name: 'Analisis aturan dan SOP pemberkasan',
    parent: 'A',
    duration: 6,
    deps: [{ code: 'A1', type: 'FS', lag: 0 }],
    assigneeId: 'r-6',
    priority: 'Tinggi',
    progress: 100,
    status: 'Selesai',
  },
  {
    code: 'B',
    name: 'Perancangan Proses Bisnis',
    description: 'Model proses pemberkasan dan alur persetujuan berkas.',
    duration: 10,
    deps: [{ code: 'A', type: 'FS', lag: 0 }],
    assigneeId: 'r-2',
    priority: 'Tinggi',
    progress: 100,
    status: 'Selesai',
  },
  {
    code: 'C',
    name: 'Analisis dan Perancangan Basis Data',
    duration: 10,
    deps: [{ code: 'B', type: 'FS', lag: 0 }],
    assigneeId: 'r-3',
    priority: 'Tinggi',
    progress: 100,
    status: 'Selesai',
  },
  {
    code: 'D',
    name: 'Perancangan Antarmuka Pengguna',
    description: 'Wireframe modul administrasi dan dashboard pimpinan.',
    duration: 8,
    deps: [{ code: 'B', type: 'SS', lag: 5 }],
    assigneeId: 'r-4',
    priority: 'Sedang',
    progress: 100,
    status: 'Selesai',
  },
  {
    code: 'E',
    name: 'Pengembangan Modul Administrasi',
    description: 'Penerimaan, disposisi, dan penyimpanan berkas.',
    summary: true,
    children: ['E1', 'E2'],
    deps: [{ code: 'C', type: 'FS', lag: 0 }],
    assigneeId: 'r-3',
    priority: 'Tinggi',
    progress: 75,
    status: 'Berjalan',
  },
  {
    code: 'E1',
    name: 'Pengembangan master data dan berkas',
    parent: 'E',
    duration: 12,
    deps: [{ code: 'C', type: 'FS', lag: 0 }],
    assigneeId: 'r-3',
    priority: 'Tinggi',
    progress: 100,
    status: 'Selesai',
  },
  {
    code: 'E2',
    name: 'Pengembangan disposisi dan retensi',
    parent: 'E',
    duration: 8,
    deps: [{ code: 'E1', type: 'FS', lag: 0 }],
    assigneeId: 'r-7',
    priority: 'Sedang',
    progress: 60,
    status: 'Berjalan',
  },
  {
    code: 'F',
    name: 'Pengembangan Modul Pelaporan',
    description: 'Laporan statistik, rekapitulasi, dan ekspor data.',
    duration: 30,
    deps: [{ code: 'C', type: 'FS', lag: 3 }],
    assigneeId: 'r-3',
    priority: 'Tinggi',
    progress: 60,
    status: 'Berjalan',
  },
  {
    code: 'G',
    name: 'Integrasi Modul dan Migration Data',
    duration: 10,
    deps: [
      { code: 'E', type: 'FS', lag: 2 },
      { code: 'F', type: 'FS', lag: 2 },
    ],
    assigneeId: 'r-7',
    priority: 'Tinggi',
    progress: 30,
    status: 'Berjalan',
  },
  {
    code: 'H',
    name: 'Pengujian Sistem (SIT dan UAT)',
    duration: 15,
    deps: [{ code: 'G', type: 'FS', lag: 0 }],
    assigneeId: 'r-5',
    priority: 'Tinggi',
    progress: 0,
    status: 'Belum Mulai',
  },
  {
    code: 'I',
    name: 'Go-live Sistem',
    description: 'Serah terima dan operasional penuh sistem.',
    duration: 1,
    milestone: true,
    deps: [{ code: 'H', type: 'FS', lag: 0 }],
    assigneeId: 'r-1',
    priority: 'Kritis',
    progress: 0,
    status: 'Belum Mulai',
  },
  {
    code: 'J',
    name: 'Pelatihan dan Dokumentasi Pengguna',
    duration: 10,
    deps: [{ code: 'H', type: 'SS', lag: 5 }],
    assigneeId: 'r-1',
    priority: 'Sedang',
    progress: 20,
    status: 'Berjalan',
  },
]

// Bangun tanggal demo dari durasi + dependensi memakai kalender kerja yang
// sama dengan aplikasi, sehingga bar Gantt dan jalur kritis selalu sinkron.
// Mengembalikan { tasks, endDate } (tidak mengubah konstanta modul).
function buildDemoTasks(settings) {
  const calendar = createWorkCalendar(settings)
  const summaryCodes = new Set(demoActivities.filter((item) => item.summary).map((item) => item.code))
  const projectStart = calendar.nextWorkingDay(seedDemoProject.startDate)
  const byCode = new Map()
  const tasks = []

  demoActivities.forEach((spec) => {
    const id = `p4-${spec.code}`
    const duration = Math.max(1, spec.duration ?? 1)
    let start = projectStart

    // Baris ringkasan (A, E) dihitung setelah anak-anaknya, jadi saat dipakai
    // sebagai pendahulu, rentangnya diambil dari anak yang sudah terbentuk.
    const spanOf = (code) => {
      const task = byCode.get(code)
      if (!task) return null
      if (!spec.summary && !summaryCodes.has(code)) return task
      const children = tasks.filter((item) => item.parentTaskId === task.id)
      if (children.length === 0) return task
      return {
        startDate: children.reduce((min, c) => (c.startDate < min ? c.startDate : min), children[0].startDate),
        endDate: children.reduce((max, c) => (c.endDate > max ? c.endDate : max), children[0].endDate),
      }
    }

    spec.deps.forEach((dependency) => {
      const parent = spanOf(dependency.code)
      if (!parent) return
      const lag = Math.max(0, dependency.lag ?? 0)
      // Konvensi sama dengan mesin penjadwalan (src/utils/schedule.js):
      // FS + lag -> hari kerja ke-(lag+2) dari EF pendahulu,
      // SS + lag -> hari kerja ke-(lag+1) dari ES pendahulu.
      const candidate =
        dependency.type === 'SS'
          ? calendar.addWorkingDays(parent.startDate, lag + 1)
          : calendar.addWorkingDays(parent.endDate, lag + 2)
      if (candidate && candidate > start) start = candidate
    })

    const startDate = calendar.nextWorkingDay(start) || start
    const endDate = calendar.addWorkingDays(startDate, duration) || startDate

    const task = {
      id,
      projectId: seedDemoProject.id,
      code: spec.code,
      name: spec.name,
      description: spec.description ?? '',
      parentTaskId: spec.parent ? `p4-${spec.parent}` : null,
      assigneeId: spec.assigneeId ?? null,
      startDate,
      endDate,
      status: spec.status ?? 'Belum Mulai',
      priority: spec.priority ?? 'Sedang',
      progress: spec.progress ?? 0,
      dependencies: spec.deps.map((dependency) => ({
        id: `p4-${dependency.code}`,
        type: dependency.type,
        lag: dependency.lag ?? 0,
      })),
      isMilestone: Boolean(spec.milestone),
    }

    tasks.push(task)
    byCode.set(spec.code, task)
  })

  // Baris ringkasan (induk aktivitas): rentang & progres mengikuti anak-anaknya.
  demoActivities
    .filter((spec) => spec.summary)
    .forEach((spec) => {
      const parent = byCode.get(spec.code)
      if (!parent) return
      const children = tasks.filter((task) => task.parentTaskId === parent.id)
      if (children.length === 0) return

      parent.startDate = children.reduce(
        (min, child) => (child.startDate < min ? child.startDate : min),
        children[0].startDate,
      )
      parent.endDate = children.reduce(
        (max, child) => (child.endDate > max ? child.endDate : max),
        children[0].endDate,
      )
      parent.progress = Math.round(
        children.reduce((sum, child) => sum + child.progress, 0) / children.length,
      )
      parent.status = children.every((child) => child.status === 'Selesai')
        ? 'Selesai'
        : children.some((child) => child.status === 'Berjalan')
          ? 'Berjalan'
          : 'Belum Mulai'
    })

  const endDate = tasks.reduce(
    (max, task) => (task.endDate > max ? task.endDate : max),
    seedDemoProject.startDate,
  )

  return { tasks, endDate }
}

export const seedSettings = {
  workDays: [1, 2, 3, 4, 5], // Senin - Jumat
  workHoursPerDay: 8,
  currency: 'IDR',
  holidays: [
    { date: '2026-01-01', name: 'Tahun Baru Masehi' },
    { date: '2026-03-21', name: 'Hari Raya Idulfitri (seed)' },
    { date: '2026-05-27', name: 'Hari Lahir Pancasila' },
    { date: '2026-08-17', name: 'Hari Kemerdekaan RI' },
    { date: '2026-12-25', name: 'Hari Raya Natal' },
  ],
}

export function createSeedData() {
  const demo = buildDemoTasks(seedSettings)

  return {
    projects: [
      ...seedProjects,
      { ...seedDemoProject, endDate: demo.endDate },
    ],
    tasks: [...seedTasks, ...demo.tasks],
    resources: seedResources.map((resource) => ({ ...resource })),
    settings: {
      ...seedSettings,
      holidays: seedSettings.holidays.map((holiday) => ({ ...holiday })),
    },
  }
}
