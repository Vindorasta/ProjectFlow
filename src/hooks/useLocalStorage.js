import { useCallback, useEffect, useState } from 'react'
import { readStorage, writeStorage } from '../data/storage.js'

// Hook generik: state React yang otomatis disimpan ke LocalStorage.
// Setiap perubahan nilai akan ditulis ulang ke penyimpanan browser.
// Parameter `normalize` dipakai DataProvider untuk memigrasi data lama
// (LocalStorage tidak lengkap / bentuk field berbeda) ke bentuk baru.
export function useLocalStorage(key, initialValue, normalize) {
  const [value, setValue] = useState(() => {
    // Catatan: gunakan sentinel null yang eksplisit. Mengirim `undefined` akan
    // memicu nilai default `fallback = null` pada readStorage.
    const stored = readStorage(key, null)
    if (stored === null) return initialValue
    if (!normalize) return stored

    try {
      return normalize(stored)
    } catch {
      // Data rusak tidak boleh membuat aplikasi crash: pakai nilai awal.
      return initialValue
    }
  })

  useEffect(() => {
    writeStorage(key, value)
  }, [key, value])

  const reset = useCallback(() => setValue(initialValue), [initialValue])

  return [value, setValue, reset]
}
