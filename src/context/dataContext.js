import { createContext, useContext } from 'react'

// Context menyimpan seluruh state ProjectFlow (proyek, tugas, sumber daya, pengaturan).
// File ini sengaja tidak berisi komponen agar lint React tetap bersih.
export const DataContext = createContext(null)

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData harus dipakai di dalam <DataProvider>')
  }
  return context
}
