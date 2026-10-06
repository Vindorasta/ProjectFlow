// Skema, normalisasi, dan validasi data sumber daya (personel).
// Pola yang sama seperti src/data/projectSchema.js agar komponen tetap bersih.

export const RESOURCE_CAPACITY_OPTIONS = [0, 20, 40, 60, 80, 100]

export function normalizeResource(resource) {
  if (!resource || typeof resource !== 'object') return null

  const capacityRaw = Number(resource.capacity)
  const costRaw = Number(resource.cost)
  const capacity = Number.isFinite(capacityRaw)
    ? Math.min(100, Math.max(0, Math.trunc(capacityRaw)))
    : 100
  const cost = Number.isFinite(costRaw) && costRaw >= 0 ? Math.trunc(costRaw) : 0

  return {
    id: String(resource.id ?? ''),
    name: String(resource.name ?? '').trim(),
    role: String(resource.role ?? '').trim(),
    email: String(resource.email ?? '').trim(),
    phone: String(resource.phone ?? '').trim(),
    capacity,
    cost,
    notes: String(resource.notes ?? ''),
  }
}

export function normalizeResources(resources) {
  const list = Array.isArray(resources) ? resources : []
  const seen = new Set()

  return list
    .map(normalizeResource)
    .filter((resource) => {
      if (!resource || !resource.id || !resource.name) return false
      if (seen.has(resource.id)) return false
      seen.add(resource.id)
      return true
    })
}

export function emptyResourceValues() {
  return {
    name: '',
    role: '',
    email: '',
    phone: '',
    capacity: '100',
    cost: '0',
    notes: '',
  }
}

export function resourceToFormValues(resource) {
  const normalized = normalizeResource(resource) ?? emptyResourceValues()
  return {
    name: normalized.name,
    role: normalized.role,
    email: normalized.email,
    phone: normalized.phone,
    capacity: String(normalized.capacity),
    cost: String(normalized.cost),
    notes: normalized.notes,
  }
}

// Validasi form sumber daya. Mengembalikan { field: pesan } atau null.
export function validateResource(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Nama personel wajib diisi.'
  }

  if (!values.role.trim()) {
    errors.role = 'Peran/jabatan wajib diisi.'
  }

  // Email divalidasi hanya bila diisi (kontak opsional).
  const email = values.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Format email belum benar.'
  }

  const capacity = Number(values.capacity)
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 100) {
    errors.capacity = 'Kapasitas harus berupa bilangan bulat 0-100 (persen).'
  }

  const cost = Number(values.cost)
  if (!Number.isInteger(cost) || cost < 0) {
    errors.cost = 'Biaya harus berupa bilangan bulat 0 atau lebih.'
  }

  return Object.keys(errors).length > 0 ? errors : null
}
