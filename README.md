# ProjectFlow

Aplikasi web manajemen proyek (terinspirasi materi GanttProject) untuk tugas mata kuliah
**Aritektur Sistem Informasi**. Seluruh alur scheduling — dari definisi aktivitas, durasi,
dependensi, kalender kerja, sampai Gantt chart, diagram jaringan, dan jalur kritis —
sudah berjalan di dalam satu aplikasi.

## Teknologi

- **React 19** + **Vite 8**
- **JavaScript / JSX** (tanpa TypeScript)
- **Bootstrap 5** (CSS saja, tanpa JavaScript Bootstrap)
- **React Router 7** untuk navigasi antar halaman
- **LocalStorage** sebagai penyimpanan data (satu-satunya)
- **oxlint** untuk pemeriksaan kualitas kode

Tidak ada dependensi tambahan untuk Gantt chart maupun visualisasi: seluruh diagram
digambar dengan HTML/CSS dan SVG.

## Menjalankan aplikasi

```bash
npm install      # pasang dependensi
npm run dev      # server pengembangan (http://localhost:5173)
```

Perintah lain:

```bash
npm run build    # build produksi ke folder dist/
npm run preview  # pratinjau hasil build
npm run lint     # periksa kualitas kode
```

## Fitur

| Halaman              | Fitur                                                                                                     | Status |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| Dashboard            | Jumlah proyek/tugas, proyek aktif, progres, tugas berjalan, tugas terlambat, ringkasan jadwal, jalur kritis | Selesai |
| Manajemen Proyek     | CRUD proyek, kode, deskripsi, tanggal, progres manual 0-100, proyek bertugas tidak dapat dihapus             | Selesai |
| Daftar Tugas         | CRUD tugas + detail, kode aktivitas, deskripsi, prioritas, subtask (induk), milestone, filter & pencarian      | Selesai |
| Gantt Chart          | Daftar aktivitas (hierarki) + timeline, zoom Hari/Minggu/Bulan, bar, progres, milestone, panah dependensi   | Selesai |
| Diagram Jaringan     | Node aktivitas + panah dependensi (SVG), multi-cabang, penanda jalur kritis                                 | Selesai |
| Jalur Kritis         | Forward/backward pass (ES/EF/LS/LF), slack, jalur terpanjang, daftar semua jalur, terapkan jadwal           | Selesai |
| Dependensi Tugas     | Tambah/hapus pendahulu, jenis FS/SS/FF/SF, lag, pencegahan siklus, validasi                                   | Selesai |
| Sumber Daya          | CRUD personel (nama, peran, email, telepon, kapasitas, biaya/hari, catatan) + assignment ke tugas             | Selesai |
| Kalender Kerja       | Pilihan hari kerja, jam kerja, mata uang, CRUD hari libur, pratinjau bulan, kalkulator durasi kerja           | Selesai |

### Cara kerja mesin penjadwalan

- Durasi tugas dihitung dalam **hari kerja** sesuai kalender aktif (hari kerja per minggu + hari libur).
- `src/utils/schedule.js` membangun graf dependensi dari data tugas:
  - dependensi yang menunjuk baris ringkasan (induk aktivitas) diarahkan ke anak yang sesuai
    (FS/FF memakai anak terakhir, SS/SF memakai anak pertama);
  - dependensi tidak valid (menunjuk tugas yang tidak ada / dirinya sendiri) dilaporkan dan diabaikan;
  - dependensi melingkar dideteksi dan dilaporkan; sisi tersebut dipangkas agar hasil tetap terhitung.
- **Forward pass** menghasilkan ES/EF, **backward pass** menghasilkan LS/LF dan slack.
  Aktivitas dengan slack 0 ditandai sebagai jalur kritis.
- Jalur dari awal ke akhir dienumerasi (dibatasi 500 jalur) sehingga jalur terpanjang bisa ditampilkan.
- Tanggal hasil hitungan bisa **diterapkan** ke data tugas sehingga Gantt chart memakai jadwal yang sama.

## Struktur proyek

```
src/
├── components/
│   ├── common/       # Icon, ProjectForm, TaskForm, ResourceForm, TaskDetail, ProjectPicker
│   ├── dashboard/    # StatCard
│   ├── gantt/        # GanttChartView
│   ├── layout/       # AppLayout, Sidebar, Topbar
│   └── network/      # NetworkDiagramView
├── context/          # DataProvider + context global (proyek, tugas, sumber daya, pengaturan)
├── data/             # storage.js, seed.js, projectSchema.js, taskSchema.js,
│                     # resourceSchema.js, settingsSchema.js
├── hooks/            # useLocalStorage, useProjectSchedule
├── pages/            # Dashboard, Projects, Tasks, GanttChart, NetworkDiagram,
│                     # CriticalPath, Dependencies, Resources, WorkCalendar, NotFound
├── routes/           # navItems.js (konfigurasi navigasi)
├── utils/            # date.js, workCalendar.js, schedule.js, taskTree.js, presentation.js
├── App.jsx           # definisi rute
├── main.jsx          # entry point + provider
└── index.css, App.css, features.css
```

## Model data

- **Proyek**: `id, name, code, description, startDate, endDate, status, progress, color`
- **Tugas**: `id, projectId, code, name, description, parentTaskId, assigneeId, startDate,
  endDate, status, priority, progress, dependencies, isMilestone`
- **Dependensi**: `{ id, type: 'FS' | 'SS' | 'FF' | 'SF', lag }` (bentuk lama berupa array id
  tetap dimigrasikan otomatis saat aplikasi dibuka)
- **Personel**: `id, name, role, email, phone, capacity, cost, notes`
- **Pengaturan**: `workDays, workHoursPerDay, currency, holidays: [{ date, name }]`

Status: `Belum Mulai | Berjalan | Tertunda | Selesai` (proyek & tugas memakai nilai yang sama).

## Data contoh

LocalStorage diisi otomatis dengan data demo bila masih kosong, termasuk proyek
**Pengembangan Sistem Informasi Kelola Pemberkasan** (kode `SKP-2026`) berisi aktivitas
berkode **A–J** beserta subtask (A1–A2, E1–E2), milestone (I: Go-live), dan dependensi
FS/SS + lag. Nilai durasi dan tanggal proyek demo dihitung dengan kalender kerja yang sama
dengan aplikasi sehingga Gantt, diagram jaringan, dan jalur kritis langsung konsisten.
Tombol **Muat ulang data contoh** pada dashboard mengembalikan data ke kondisi awal.

## Catatan data

Semua data disimpan di LocalStorage browser dengan awalan `projectflow:` (keys
`projects`, `tasks`, `resources`, `settings`). Data lama yang tidak lengkap dinormalisasi
saat aplikasi dimuat, sehingga aplikasi tidak pernah gagal karena data rusak.
Menghapus tugas ikut membersihkan dependensi yang menunjuknya, dan menghapus personel
melepas assignment pada tugas terkait.
