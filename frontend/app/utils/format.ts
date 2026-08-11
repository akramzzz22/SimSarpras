export function formatTanggal(v?: string) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Format angka menjadi Rupiah, mis. 150000 -> "Rp150.000" */
export function formatRupiah(v?: number | string | null): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

/**
 * Ekstrak kode barang dari hasil scan QR.
 * QR code berisi URL publik (mis. https://host:port/barang/BRG-4H7PHBYS), bukan
 * kode mentah — ambil segmen terakhir dari path /barang/ agar pencarian tetap
 * cocok dengan kolom kode_qr. Jika bukan URL, kembalikan apa adanya.
 */
export function extractKodeFromScan(raw: string | null | undefined): string {
  const value = (raw ?? '').trim()
  const m = value.match(/(?:^|\/)barang\/([^/?#]+)/i)
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1])
    } catch {
      return m[1]
    }
  }
  return value
}

/**
 * Format waktu dari "HH:MM:SS" atau "HH:MM" menjadi "HH:MM" (mis. "08:00").
 * Nilai kosong/null ditampilkan sebagai "—".
 */
export function fmtJam(v?: string | null): string {
  if (!v) return '—'
  const m = v.match(/^(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : v
}

/** Badge status peminjaman: label + kelas warna Tailwind */
export const PINJAM_STATUS: Record<string, { label: string; cls: string }> = {
  menunggu: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
  disetujui: { label: 'Disetujui', cls: 'bg-blue-100 text-blue-700' },
  ditolak: { label: 'Ditolak', cls: 'bg-rose-100 text-rose-700' },
  dipinjam: { label: 'Dipinjam', cls: 'bg-violet-100 text-violet-700' },
  dikembalikan: { label: 'Dikembalikan', cls: 'bg-emerald-100 text-emerald-700' }
}

/** Badge status laporan kerusakan: label + kelas warna Tailwind */
export const LAPORAN_STATUS: Record<string, { label: string; cls: string }> = {
  menunggu: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
  diverifikasi: { label: 'Diverifikasi', cls: 'bg-blue-100 text-blue-700' },
  diperbaiki: { label: 'Diperbaiki', cls: 'bg-violet-100 text-violet-700' },
  selesai: { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-700' }
}
