import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="pf-placeholder">
      <h2 className="pf-placeholder__title">Halaman tidak ditemukan</h2>
      <p className="pf-placeholder__desc">
        Alamat yang Anda tuju belum tersedia di ProjectFlow.
      </p>
      <Link to="/" className="btn btn-primary btn-sm">
        Kembali ke Dashboard
      </Link>
    </div>
  )
}
