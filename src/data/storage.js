// Helper terenkapsulasi untuk membaca/menulis data ProjectFlow di LocalStorage.
// Semua akses penyimpanan lewat file ini agar mudah diganti ke backend nanti.

const PREFIX = 'projectflow:'

export const STORAGE_KEYS = {
  projects: 'projects',
  tasks: 'tasks',
  resources: 'resources',
  settings: 'settings',
}

function prefixed(key) {
  return `${PREFIX}${key}`
}

export function readStorage(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(prefixed(key))
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch (error) {
    console.warn(`[ProjectFlow] Gagal membaca LocalStorage "${key}":`, error)
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(prefixed(key), JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`[ProjectFlow] Gagal menulis LocalStorage "${key}":`, error)
    return false
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(prefixed(key))
  } catch (error) {
    console.warn(`[ProjectFlow] Gagal menghapus LocalStorage "${key}":`, error)
  }
}

// Reset seluruh data ProjectFlow (dipakai tombol "Muat ulang data contoh").
export function clearAllStorage() {
  Object.values(STORAGE_KEYS).forEach(removeStorage)
}
